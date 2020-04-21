;(async function () {
    try {
        const playwright = require('playwright')
        const fs = require('fs-extra')
        const moment = require('moment-timezone')
        const CronJob = require('cron').CronJob
        const argv = require('yargs').argv
        const Promise = require('bluebird')
        const request = require('request-promise')

        const keys = require('./config.json').line.notify

        const line_notify = async (keys, message) => {
            let options = {
                method: 'POST',
                url: 'https://notify-api.line.me/api/notify',
                headers: {},
                form: {
                    message: message
                },
                json: true
            }
            const result = await Promise.map(keys, (key) => {
                options.headers.Authorization = `Bearer ${key}`
                return request(options)
            })
            return result
        }
        const message_template = (island) => {
            const message =
                '島名 : ' +
                island.name +
                '\n' +
                '大頭菜價錢 : ' +
                island.turnipPrice +
                '\n' +
                '排隊情況 : ' +
                island.queued +
                '\n' +
                '網址 : ' +
                `https://turnip.exchange/island/${island.turnipCode}` +
                '\n' +
                '敘述 : ' +
                island.description +
                '\n' +
                '建立時間:' +
                moment(island.creationTime).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss')
            return message
        }
        const reload = async (page) => {
            await page.reload()
            await page.waitForSelector('.note')
        }
        const find_island = async (islands, time_range) => {
            const result = islands.reduce((array, island) => {
                island.creationTime = moment.tz(island.creationTime, 'America/Chicago').tz('Asia/Taipei').format()
                if (
                    moment()
                        .startOf('minute')
                        .add(-1 * time_range, 'minutes')
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

        if (argv.job === 'test') {
            await line_notify(keys, '測試訊息')
            console.log('測試訊息已發送')
            return process.exit(0)
        }

        const time_range = 1
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
                    return line_notify(keys, message_template(island))
                })
                // console.log(result)
                // await fs.outputJSON(`./db/islands.json`, islands)
            }
        })

        // await browser.close()
        const job = new CronJob({
            cronTime: '0 * * * * *',
            onTick: async () => {
                console.log(`job start ${moment().format()}`)
                await reload(page).catch((err) => {
                    console.log(err.message)
                })
            },
            start: true,
            timeZone: 'Asia/Taipei'
        })
        console.log('is job running? ', job.running)
    } catch (err) {
        console.log(err)
    }
    // return process.exit(0)
})()
