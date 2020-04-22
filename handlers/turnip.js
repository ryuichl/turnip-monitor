const playwright = require('playwright')
const moment = require('moment-timezone')
const CronJob = require('cron').CronJob
const Promise = require('bluebird')

const line = require('./line')

const reload = async (page) => {
    await page.reload()
    await page.waitForSelector('.note')
}
const find_island = async (islands, time_range) => {
    const result = islands.reduce((array, island) => {
        island.creationTime = moment.tz(island.creationTime, 'America/Chicago').tz('Asia/Taipei').format()
        if (
            moment()
                .startOf('seconds')
                .add(-1 * time_range, 'seconds')
                .isBefore(moment(island.creationTime)) &&
            island.turnipPrice > 550
        ) {
            array.push(island)
        }
        return array
    }, [])
    result.sort((a, b) => {
        return new Date(b.creationTime) - new Date(a.creationTime)
    })
    return result
}

exports.init = async () => {
    const time_range = 30
    const browser = await playwright['firefox'].launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('https://turnip.exchange/islands')
    await page.waitForSelector('.note')
    page.on('request', async (request) => {
        if (request.url() === 'https://api.turnip.exchange/islands/') {
            let { islands } = await (await request.response()).json()
            islands = await find_island(islands, time_range)
            await Promise.map(islands, (island) => {
                return line.notify(process.env.line_notify, message_template(island))
            })
            if (islands.length === 0) {
                await line.notify(process.env.line_notify, '沒有結果符合')
            }
        }
    })
    return browser
}

exports.job = async () => {
    const job = new CronJob({
        cronTime: '*/30 * * * * *',
        onTick: async () => {
            console.log(`job start ${moment().format()}`)
            await reload(page).catch((err) => {
                console.log(err.message)
            })
        },
        timeZone: 'Asia/Taipei'
    })
    return job
}
