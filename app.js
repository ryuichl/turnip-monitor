require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

const indexRouter = require('./routes/index')

const app = express()

app.use(logger('dev'))
app.use(cookieParser())

app.use('/', indexRouter)

module.exports = app
