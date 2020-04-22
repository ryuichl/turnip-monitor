const request = require('request-promise')

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
}
