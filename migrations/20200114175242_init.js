exports.up = function (knex, Promise) {
    return knex.schema.createTable('users', (table) => {
        table.uuid('_id').primary().defaultTo(knex.raw('uuid_generate_v4()'))
        table.string('line_notify_access_token').unique()
        table.string('line_user_id').unique()
    })
}

exports.down = function (knex, Promise) {}
