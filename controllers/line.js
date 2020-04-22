const { middleware, Client } = require('@line/bot-sdk')

const bot_config = {
    channelAccessToken: process.env.line_channelAccessToken,
    channelSecret: process.env.line_channelSecret
}
const browser = require('../handlers/turnip').init()
const job = require('../handlers/turnip').job()
const client = new Client(bot_config)

exports.middleware = middleware(bot_config)

exports.webhook = async (req, res, next) => {
    res.status(200).end()
    const text = req.body.events[0].message.text
    const replyToken = req.body.events[0].replyToken
    console.log(text)
    if (text === 'start') {
        if (job.running) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經開始'
            })
            return true
        }
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '開始'
        })
        job.start()
    } else if (text === 'stop') {
        if (!job.running) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '已經結束'
            })
            return true
        }
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '結束'
        })
        job.stop()
    } else if (text === 'help') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '開始請打: start\n結束請打: stop'
        })
    }
}
