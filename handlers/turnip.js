const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const moment = require('moment-timezone')
const CronJob = require('cron').CronJob
const Promise = require('bluebird')
const request = require('request-promise')

const line = require('./line')
let is_init = false
let users = {}

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
            array.push(island)
        }
        island.source = 'turnip.exchange'
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
        return Promise.map(Object.keys(users), (user_id) => {
            return line.notify(users[user_id], line.message_template(island))
        })
    })
    if (islands.length === 0) {
        await Promise.map(Object.keys(users), (user_id) => {
            return line.notify(users[user_id], 'turnip.exchange 沒有結果符合')
        })
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

exports.is_init = () => {
    return is_init
}
exports.get_user = () => {
    return users
}
exports.add_user = (user) => {
    users[user.user_id] = user.access_token
    return users
}
exports.delete_user = (user_id) => {
    delete users[user_id]
    return users
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
            let { list } = await ac_room_list()
            list = find_room(list, time_range)
            await Promise.map(list, (room) => {
                return Promise.map(Object.keys(users), (user_id) => {
                    return line.notify(users[user_id], line.message_template(room))
                })
            })
            if (list.length === 0) {
                await Promise.map(Object.keys(users), (user_id) => {
                    return line.notify(users[user_id], 'ac-room.cc 沒有結果符合')
                })
            }
        },
        timeZone: 'Asia/Taipei'
    })
    is_init = true
    return job
}
