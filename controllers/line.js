const { middleware, Client } = require('@line/bot-sdk')
const execa = require('execa')

const bot_config = {
    channelAccessToken: process.env.line_channelAccessToken,
    channelSecret: process.env.line_channelSecret
}
let subprocess
let job = false
const client = new Client(bot_config)

exports.middleware = middleware(bot_config)

exports.webhook = async (req, res, next) => {
    res.status(200).end()
    const text = req.body.events[0].message.text
    const replyToken = req.body.events[0].replyToken
    console.log(text)
    if (text === 'start') {
        if (job) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經開始'
            })
            return true
        }
        job = true
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '開始'
        })
        subprocess = execa('node', ['turnip'])
    } else if (text === 'stop') {
        if (!job) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經結束'
            })
            return true
        }
        job = false
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '結束'
        })
        subprocess.cancel()
    } else if (text === 'help') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '開始請打: start\n結束請打: stop'
        })
    }
}
