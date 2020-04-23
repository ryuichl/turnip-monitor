;(async function () {
    try {
        require('dotenv').config()
        const puppeteer = require('puppeteer-extra')
        const StealthPlugin = require('puppeteer-extra-plugin-stealth')
        puppeteer.use(StealthPlugin())
        const moment = require('moment-timezone')
        const CronJob = require('cron').CronJob
        const argv = require('yargs').argv
        const Promise = require('bluebird')
        const request = require('request-promise')

        const line_notify = async (key, message) => {
            let options = {
                method: 'POST',
                url: 'https://notify-api.line.me/api/notify',
                headers: {},
                form: {
                    message: message
                },
                json: true
            }
            options.headers.Authorization = `Bearer ${key}`
            return request(options)
        }
        const message_template = (island) => {
            if (island.source === 'turnip.exchange') {
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
                    '建立時間 : ' +
                    moment(island.creationTime).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss')
                return message
            } else if (island.source === 'ac-room.cc') {
                const message =
                    '島名 : ' +
                    island.name +
                    '\n' +
                    '房名 : ' +
                    island.room +
                    '\n' +
                    '排隊情況 : ' +
                    island.guests +
                    '\n' +
                    '網址 : ' +
                    `https://ac-room.cc/${island.id}` +
                    '\n' +
                    '敘述 : ' +
                    island.note +
                    '\n' +
                    '建立時間 : ' +
                    moment(island.created_at).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss')
                return message
            }
        }
        const find_island = (islands, time_range) => {
            const result = islands.reduce((array, island) => {
                island.creationTime = moment.tz(island.creationTime, 'America/Chicago').tz('Asia/Taipei').format()
                if (
                    moment()
                        .startOf('seconds')
                        .add(-1 * time_range, 'seconds')
                        .isBefore(moment(island.creationTime)) &&
                    island.turnipPrice > 550
                ) {
                    island.source = 'turnip.exchange'
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
            islands = find_island(islands, time_range)
            await Promise.map(islands, (island) => {
                return line_notify(process.env.line_notify, message_template(island))
            })
            if (islands.length === 0) {
                await line_notify(process.env.line_notify, '沒有結果符合')
            }
        }
        const ac_room_list = async () => {
            let options = {
                method: 'GET',
                url: 'https://api.ac-room.cc/list',
                json: true
            }
            return request(options)
        }
        const find_room = (room, time_range) => {
            const result = room.reduce((array, room) => {
                if (
                    room.types.includes('菜價') &&
                    moment()
                        .startOf('seconds')
                        .add(-1 * time_range, 'seconds')
                        .isBefore(moment(room.created_at))
                ) {
                    room.source = 'ac-room.cc'
                    array.push(room)
                }
                return array
            }, [])
            result.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at)
            })
            return result
        }

        if (argv.job === 'test') {
            await line_notify(process.env.line_notify, '測試訊息')
            console.log('測試訊息已發送')
            return process.exit(0)
        }

        const time_range = 30
        // const browser = await puppeteer.launch({
        //     // headless: false
        // })
        // const page = await browser.newPage()
        // await page.setRequestInterception(true)
        // page.on('request', (request) => {
        //     if (request.url() === 'https://api.turnip.exchange/islands/') {
        //         request.continue({ postData: JSON.stringify({ islander: 'neither' }) })
        //         return true
        //     }
        //     request.continue()
        // })
        // await page.goto('https://turnip.exchange/islands')

        const job = new CronJob({
            cronTime: '*/30 * * * * *',
            onTick: async () => {
                console.log(`job start ${moment().format()}`)
                // await reload(page, time_range).catch((err) => {
                //     console.log(err.message)
                // })
                let { list } = await ac_room_list()
                list = find_room(list, time_range)
                await Promise.map(list, (room) => {
                    return line_notify(process.env.line_notify, message_template(room))
                })
                if (list.length === 0) {
                    await line_notify(process.env.line_notify, '沒有結果符合')
                }
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
