const model = require('objection').Model

class user_model extends model {
    static get tableName() {
        return 'users'
    }
    static get idColumn() {
        return '_id'
    }
    static get useLimitInFirst() {
        return true
    }
}

module.exports = user_model
