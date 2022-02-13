const User = require("./UserModel")
var logger = require('../../config/winston')

function getUsers(callback) {
    User.find(function (err, users) {
        if(err) {
            logger.error("Error while searching: " + err)
            return callback(err, null)
        }
        else {
            logger.debug("Retrieving Users")
            return callback(null, users)
        }
    })
}

function findUserBy(searchUserID, callback) {
    logger.debug("Trying to find userID " + searchUserID)

    if(!searchUserID) {
        callback("UserID is missing")
        return
    }
    else {
        var query = User.findOne({ userID: searchUserID })
        query.exec(function(err, user) {
            if(err) {
                logger.error("Could not find user for userID: " + searchUserID)
                return callback("Could not find user for userID: " + searchUserID, null)
            }
            else {
                if(user) {
                    logger.debug(`Found userID: ${searchUserID}`)
                    callback(null, user)
                }
                else {
                    if ('admin' == searchUserID) {
                        logger.info('There is no admin account yet, creating now with defaults')
                        var adminUser = new User();
                        adminUser.userID = "admin"
                        adminUser.password = "123"
                        adminUser.userName = "Default Administrator Account"
                        adminUser.isAdministrator = true

                        adminUser.save(function(err) {
                            if(err) {
                                logger.error("Could not create default admin account: " + err)
                                callback("Could not create default admin account", null)
                            }
                            else {
                                callback(null, adminUser)
                            }
                        })
                    }
                    else {
                        logger.error("Could not find User for userID: " + searchUserID)
                        callback(null, user)
                    }
                }
            }
        })
    }
}

module.exports = {
    getUsers,
    findUserBy
}