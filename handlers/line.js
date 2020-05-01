const request = require('request-promise')
const moment = require('moment-timezone')

exports.notify = async (key, message) => {
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

exports.message_template = (island) => {
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

exports.revoke_notify = async (key) => {
    let options = {
        method: 'POST',
        url: 'https://notify-api.line.me/api/revoke',
        headers: {},
        json: true
    }
    options.headers.Authorization = `Bearer ${key}`
    return request(options)
}
