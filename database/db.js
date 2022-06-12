var client = require('mongoose')
const config = require('config')
var logger = require('../config/winston')
const userService = require('../endpoints/user/UserService')

let _db

const connectionString = config.get('db.connectionString')

function initDb(callback) {
    if (_db) {
        return callback(null, _db)
    } client.connect(connectionString, config.db.connectionOptions, connected); function connected(err, db) {
        if (err) {
            return callback(err)
        }
        logger.debug("DB initialized - connected to: " + connectionString.split("@")[1]);
        _db = db

        // creating default admin if not exists
        userService.findUserBy('admin', function(err, admin) {
            if(err) {
                logger.error("Error while trying to create default admin user")
            }
            else {
                logger.info("Admin user exists now, DB init complete")
            }
        })
        return callback(null, _db)
    }
}

function getDb() {
    return _db
}

function closeDb() {
    client.connection.close()
}

module.exports = {
    getDb,
    initDb,
    closeDb
}