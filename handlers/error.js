const Promise = require('bluebird')

exports.catch_error = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.log(err)
    res.json({
      err: err.message
    })
  })
}

exports.only_catch_error = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.log(err)
  })
}
