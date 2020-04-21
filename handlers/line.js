const config = require('../config.json')
const Promise = require('bluebird')
const request = require('request-promise')

const keys = config.line.notify

exports.line_notify = async (message) => {
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
