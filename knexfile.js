// Update with your config settings.
require('dotenv').config()
module.exports = {
    development: {
        client: 'pg',
        connection: {
            connectionString: 'postgres://yczgimtuikkmgn:788e2b61436b4a73ab8c5fbffaae2e1f1789db89788a9ffef7867da486c99a55@ec2-35-168-54-239.compute-1.amazonaws.com:5432/dcu7oofkvholir?ssl=true'
        }
    }
}
