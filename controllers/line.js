const config = require('../config.json')
const { middleware, Client } = require('@line/bot-sdk')
const execa = require('execa')

const bot_config = {
    channelAccessToken: config.line.bot.channelAccessToken,
    channelSecret: config.line.bot.channelSecret
}
let subprocess
let job = false
const client = new Client(bot_config)

exports.middleware = middleware(bot_config)

exports.webhook = async (req, res, next) => {
    const text = req.body.events[0].message.text
    const replyToken = req.body.events[0].replyToken
    console.log(text)
    if (text === '我要賣菜') {
        if (job) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經開始'
            })
            return res.status(200).end()
        }
        job = true
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '開始'
        })
        subprocess = execa('node', ['turnip'])
    } else if (text === '不想賣了') {
        if (!job) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經結束'
            })
            return res.status(200).end()
        }
        job = false
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '結束'
        })
        subprocess.cancel()
    } else if (text === '我要求救') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '開始請打: 我要賣菜\n結束請打: 不想賣了'
        })
    }
    res.status(200).end()
}
