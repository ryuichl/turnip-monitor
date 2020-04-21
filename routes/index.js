const express = require('express')
const router = express.Router()

const catch_error = require('../handlers/error').catch_error

const line_controller = require(`../controllers/line`)

router.route('/line/webhook').post(line_controller.middleware, catch_error(line_controller.webhook))

module.exports = router
