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
    }
    else {
        var query = User.findOne({ userID: searchUserID })
        query.exec(function(err, user) {
            if(err) {
                logger.warn("Could not find user for userID: " + searchUserID)
                callback("Could not find user for userID: " + searchUserID, null)
            }
            else {
                if(user) {
                    logger.debug(`Found userID: ${searchUserID}`)
                    callback(null, user)
                }
                else {
                    // creating admin account if didn't exist yet
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
                        logger.warn("Could not find User for userID: " + searchUserID)
                        callback("UserID " + searchUserID + " not found", null)
                    }
                }
            }
        })
    }
}

function getIsAdmin(searchUserID, callback) {
    if(!searchUserID) {
        logger.warn("UserID is missing")
        callback(null, false)
    }
    else {
        var query = User.findOne({ userID: searchUserID })
        query.exec(function(err, user) {
            if(err) {
                logger.warn("Could not find user for userID: " + searchUserID)
                return callback("Could not find user: " + err, false)
            }
            else {
                if(user) {
                    return callback(null, user.isAdministrator)
                }
                else {
                    logger.warn("Could not find User for userID: " + searchUserID)
                    return callback("Could not find user for ID: " + searchUserID, false)
                }
            }
        })
    }
}

function insertOne(userProps, callback) {
    logger.debug("Trying to create a new user.")
    var newUser = new User({
        userID: userProps.userID,
        userName: userProps.userName,
        email: userProps.email,
        password: userProps.password
    })

    newUser.save(function(err, newUser) {
        if(err) {
            logger.error("Could not create user: " + err)
            return callback("Could not create user: " + err, null)
        }
        else {
            return callback(null, newUser)
        }
    })
}

function updateOne(user, userProps, callback) {
    logger.debug("Trying to update user with userID: " + user.userID)
    if(userProps.userName) {
        user.userName = userProps.userName
    }
    if(userProps.email) {
        user.email = userProps.email
    }
    if(userProps.password) {
        user.password = userProps.password
    }

    user.save(function(err, newUser) {
        if(err) {
            logger.error("Could not update user: " + err)
            return callback("Could not update user: " + err, null)
        }
        else {
            return callback(null, newUser)
        }
    })
}

function deleteOne(userID, callback) {
    logger.debug("Trying to delete user with userID: " + userID)

    findUserBy(userID, function(err, user){
        if(user) {
            user.remove(function(err) {
                if(err) {
                    logger.error("Error while deletion of user with userID: " + userID)
                    callback("Error while deletion", null)
                }
                else {
                    callback(null, "Deleted User")
                }
            })
        }
        else {
            logger.error("Deletion of user with userID: " + userID + " failed: User not found")
            callback("Could not delete user " + userID + ": User not found", null)
        }
    })
}


module.exports = {
    getUsers,
    findUserBy,
    getIsAdmin,
    insertOne,
    updateOne,
    deleteOne
}