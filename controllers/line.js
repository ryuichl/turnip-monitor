const { middleware, Client } = require('@line/bot-sdk')
const request = require('request-promise')
const Promise = require('bluebird')
const CryptoJS = require('crypto-js')

const user_model = require('../models/user')

const bot_config = {
    channelAccessToken: process.env.line_channelAccessToken,
    channelSecret: process.env.line_channelSecret
}
const turnip = require('../handlers/turnip')
const line = require('../handlers/line')
const client = new Client(bot_config)
let job

exports.middleware = middleware(bot_config)

exports.webhook = async (req, res, next) => {
    res.status(200).end()
    if (!turnip.is_init()) {
        job = await turnip.init()
    }
    const type = req.body.events[0].message.type
    if (type !== 'text') {
        return true
    }
    const text = req.body.events[0].message.text.toLowerCase()
    const userId = req.body.events[0].source.userId
    const replyToken = req.body.events[0].replyToken
    console.log(text)
    if (text === 'start') {
        if (turnip.get_user()[userId]) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經開始'
            })
            return true
        }
        const user = await user_model.query().findOne({
            line_user_id: userId
        })
        if (!user || !user.line_notify_access_token) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '尚未綁定'
            })
            return true
        }
        turnip.add_user({ user_id: userId, access_token: user.line_notify_access_token })
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '開始'
        })
        if (!job.running) {
            job.start()
        }
        if (userId !== process.env.admin) {
            await line.notify(process.env.admin_notify, line.admin_notify_template({ display_name: user.display_name, command: text, user_id: userId }))
        }
    } else if (text === 'stop') {
        if (!turnip.get_user()[userId]) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經結束'
            })
            return true
        }
        turnip.delete_user(userId)
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '結束'
        })
        if (Object.keys(turnip.get_user()).length === 0) {
            job.stop()
        }
        if (userId !== process.env.admin) {
            const user = await user_model.query().findOne({
                line_user_id: userId
            })
            await line.notify(process.env.admin_notify, line.admin_notify_template({ display_name: user.display_name, command: text, user_id: userId }))
        }
    } else if (text === 'help') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: `綁定請打: link\n開始請打: start\n結束請打: stop`
        })
    } else if (text === 'link') {
        const crypto_user_id = CryptoJS.AES.encrypt(userId, process.env.crypto_key).toString()
        const crypto_base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(crypto_user_id))
        await client.replyMessage(replyToken, {
            type: 'text',
            text: `https://${process.env.host}/line/notify_auth?state=${crypto_base64}`
        })
        if (userId !== process.env.admin) {
            await line.notify(process.env.admin_notify, line.admin_notify_template({ display_name: undefined, command: text, user_id: userId }))
        }
    } else if (text === 'info') {
        const user = await user_model.query().findOne({
            line_user_id: userId
        })
        await client.replyMessage(replyToken, {
            type: 'text',
            text: user ? '綁定成功' : '尚未綁定'
        })
    } else if (text === 'stopall' && userId === process.env.admin) {
        if (job.running) {
            job.stop()
        }
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '全部結束'
        })
    } else if (text === 'status' && userId === process.env.admin) {
        let users = await user_model.query().where({})
        const online = turnip.get_user()
        users = users.map((user) => {
            return `${user.display_name} ${online[user.line_user_id] ? '✔' : ''}`
        })
        const text = `job : ${job.running ? true : false}\nuser : ${users.join('\n')}`
        await client.replyMessage(replyToken, {
            type: 'text',
            text: text
        })
    }
}

exports.line_notify_auth = async (req, res) => {
    if (req.query.error) {
        return Promise.reject(new Error('存取被拒'))
    }
    if (!req.query.state) {
        return Promise.reject(new Error('參數不符'))
    }
    if (!req.query.code) {
        return res.redirect(
            `https://notify-bot.line.me/oauth/authorize?response_type=code&client_id=${process.env.line_notify_channel_id}&redirect_uri=https://${process.env.host}/line/notify_auth&state=${req.query.state}&scope=notify`
        )
    }
    const options = {
        method: 'POST',
        uri: 'https://notify-bot.line.me/oauth/token',
        form: {
            grant_type: 'authorization_code',
            code: req.query.code,
            redirect_uri: `https://${process.env.host}/line/notify_auth`,
            client_id: process.env.line_notify_channel_id,
            client_secret: process.env.line_notify_Client_Secret
        },
        json: true
    }
    const user_id = await Promise.try(() => {
        const decrypto_base64 = CryptoJS.enc.Base64.parse(decodeURIComponent(req.query.state)).toString(CryptoJS.enc.Utf8)
        const user_id = CryptoJS.AES.decrypt(decrypto_base64, process.env.crypto_key).toString(CryptoJS.enc.Utf8)
        return user_id
    })
    if (!user_id) {
        return Promise.reject(new Error('參數不符'))
    }
    const profile = await client.getProfile(user_id)
    const { access_token } = await request(options)
    const user = await user_model.query().findOne({
        line_user_id: user_id
    })
    if (user) {
        await line.revoke_notify(user.line_notify_access_token)
        await user_model
            .query()
            .findOne({
                line_user_id: user_id
            })
            .patch({
                line_notify_access_token: access_token
            })
    } else {
        await user_model.query().insert({
            line_user_id: user_id,
            line_notify_access_token: access_token,
            display_name: profile.displayName
        })
    }
    res.redirect(`https://line.me/R/oaMessage/@500adltf/?info`)
}
