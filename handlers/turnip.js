const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const moment = require('moment-timezone')
const CronJob = require('cron').CronJob
const Promise = require('bluebird')

const line = require('./line')
let is_init = false

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
const reload = async (page, time_range) => {
    await page.reload()
    let { islands } = await (await page.waitForResponse('https://api.turnip.exchange/islands/')).json()
    islands = await find_island(islands, time_range)
    await Promise.map(islands, (island) => {
        return line.notify(process.env.line_notify, line.message_template(island))
    })
    if (islands.length === 0) {
        await line.notify(process.env.line_notify, '沒有結果符合')
    }
}
exports.is_init = () => {
    return is_init
}
exports.init = async () => {
    const time_range = 30
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setRequestInterception(true)
    page.on('request', (request) => {
        if (request.url() === 'https://api.turnip.exchange/islands/') {
            request.continue({ postData: JSON.stringify({ islander: 'neither' }) })
            return true
        }
        request.continue()
    })
    await page.goto('https://turnip.exchange/islands')
    const job = new CronJob({
        cronTime: '*/30 * * * * *',
        onTick: async () => {
            console.log(`job start ${moment().format()}`)
            await reload(page, time_range).catch((err) => {
                console.log(err.message)
            })
        },
        timeZone: 'Asia/Taipei'
    })
    is_init = true
    return job
}
