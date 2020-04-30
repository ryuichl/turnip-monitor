const { middleware, Client } = require('@line/bot-sdk')
const request = require('request-promise')

const user_model = require('../models/user')

const bot_config = {
    channelAccessToken: process.env.line_channelAccessToken,
    channelSecret: process.env.line_channelSecret
}
const turnip = require('../handlers/turnip')
const client = new Client(bot_config)
let job

exports.middleware = middleware(bot_config)

exports.webhook = async (req, res, next) => {
    res.status(200).end()
    if (!turnip.is_init()) {
        job = await turnip.init()
    }
    const text = req.body.events[0].message.text
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
        const user = await user_model
            .query()
            .findOne({
                line_user_id: userId
            })
            .patch({
                start: true
            })
            .returning('*')
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
    } else if (text === 'stop') {
        if (!turnip.get_user()[userId]) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經結束'
            })
            return true
        }
        await user_model
            .query()
            .findOne({
                line_user_id: userId
            })
            .patch({
                start: false
            })

        turnip.delete_user(userId)
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '結束'
        })
        if (Object.keys(turnip.get_user()).length === 0) {
            job.stop()
        }
    } else if (text === 'help') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: `開始請打: start\n結束請打: stop\n綁定請點: https://${process.env.host}/line/notify_auth`
        })
    } else if (text.search('link:') !== -1) {
        const user_id = text.split(':')[1]
        if (/^[a-f\d]{8}(-[a-f\d]{4}){4}[a-f\d]{8}$/i.test(user_id) === false) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '無此綁定id'
            })
            return true
        }
        const result = await user_model
            .query()
            .findOne({
                _id: user_id
            })
            .patch({
                line_user_id: userId
            })
        if (result) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '綁定成功'
            })
        } else {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '無此綁定id'
            })
        }
    }
}

exports.line_notify_auth = async (req, res) => {
    if (req.query.error) {
        return Promise.reject(new Error('存取被拒'))
    }
    const host = process.env.host
    const state = 'turnip'
    if (!req.query.code) {
        return res.redirect(
            `https://notify-bot.line.me/oauth/authorize?response_type=code&client_id=${process.env.line_notify_channel_id}&redirect_uri=https://${host}/line/notify_auth&state=${state}&scope=notify`
        )
    }
    let options = {
        method: 'POST',
        uri: 'https://notify-bot.line.me/oauth/token',
        form: {
            grant_type: 'authorization_code',
            code: req.query.code,
            redirect_uri: `https://${host}/line/notify_auth`,
            client_id: process.env.line_notify_channel_id,
            client_secret: process.env.line_notify_Client_Secret
        },
        json: true
    }
    const { access_token } = await request(options)
    let user = await user_model.query().findOne({
        line_notify_access_token: access_token
    })
    if (!user) {
        user = await user_model
            .query()
            .insert({
                line_notify_access_token: access_token
            })
            .returning('*')
    }
    console.log(access_token, user)
    res.redirect(`https://line.me/R/oaMessage/@500adltf/?link:${user._id}`)
}
