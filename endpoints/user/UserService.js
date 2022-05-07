const User = require("./UserModel")
const Mail = require("../signup/MailingService")
var logger = require('../../config/winston')
const config = require("config")
const jwt = require("jsonwebtoken")

function getUsers(callback) {
    // specify query to prevent passwords being returned
    var query = User.find().select('userID userName email isVerified isAdministrator')
    query.exec(function (err, users) {
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

function createAdmin(callback) {
    logger.info('Creating default admin')
    var adminUser = new User();
    adminUser.userID = "admin"
    adminUser.password = "123"
    adminUser.userName = "Default Administrator Account"
    adminUser.isAdministrator = true
    adminUser.isVerified = true
    adminUser.email = "admin@existiert.net"
    adminUser.confirmationToken = null

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

function findUserBy(searchUserID, callback) {
    logger.debug("Trying to find userID " + searchUserID)

    if(!searchUserID) {
        callback("UserID is missing", null)
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
                    if ('admin' === searchUserID) {
                        createAdmin(function(err, adminUser) {
                            if(err) {
                                callback("Error while creating default admin", null)
                            }
                            else {
                                callback(null, adminUser)
                            }
                        })
                    }
                    else {
                        logger.debug("Could not find User for userID: " + searchUserID)
                        callback("UserID " + searchUserID + " not found", null)
                    }
                }
            }
        })
    }
}

function findUserByEmail(searchUserEmail, callback) {
    logger.debug("Trying to find email " + searchUserEmail)

    if(!searchUserEmail) {
        callback("Email is missing", null)
    }
    else {
        var query = User.findOne({ email: searchUserEmail })
        query.exec(function(err, user) {
            if(err) {
                logger.warn("Could not find user for email: " + searchUserEmail)
                callback("Could not find user for email: " + searchUserEmail, null)
            }
            else {
                logger.debug(`Found email: ${searchUserEmail}`)
                callback(null, user)
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
                    logger.debug(user.userID + " is admin: " + user.isAdministrator)
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

function insertOne(userProps, isAdmin, callback) {
    logger.debug("Trying to create a new user.")

    var newUser = new User({
        userID: userProps.userID,
        userName: userProps.userName,
        email: userProps.email,
        password: userProps.password
    })

    // only admin can verify users during creation
    if(isAdmin) {
        if(userProps.isAdministrator) {
            newUser.isAdministrator = userProps.isAdministrator
        }
    }

    // only create if required data is given
    if(newUser.userID && newUser.userName && newUser.password) {
        newUser.save(function (err, newUser) {
            if (err) {
                logger.error("Could not create user: " + err)
                return callback("Could not create user: " + err, null)
            }
            else {
                return callback(null, newUser)
            }
        })
    }
    else {
        logger.error("Could not create user: missing required attributes")
        return callback("Could not create user: missing required attributes", null)
    }
}

function updateOne(user, userProps, isAdmin, callback) {
    logger.debug("Trying to update user with userID: " + user.userID)
    var mailChange = false
    var passChange = false
    if(userProps.userID) {
        user.userID = userProps.userID
    }
    if(userProps.userName) {
        user.userName = userProps.userName
    }
    if(userProps.email) {
        if(user.email !== userProps.email)
        user.email = userProps.email
        mailChange = true
    }
    // change password if it differs in hashes
    if(userProps.password) {
        user.password = userProps.password
        passChange = true
    }

    // only admin can verify users during update or make them administrators
    if(isAdmin) {
        if(userProps.isVerified) {
            user.isVerified = userProps.isVerified
        }
        if(userProps.isAdministrator !== 'undefined') {
            if(userProps.isAdministrator === true)
                user.isAdministrator = true
            else
                user.isAdministrator = false
        }
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

function verifyOne(user, token, callback) {
    // since issue date etc can vary during tests only take the first 128 characters for comparison which should be equal
    if(user.confirmationToken.substring(0,128) === token.substring(0,128)) {
        user.isVerified = true
        user.confirmationToken = null
        user.save(function (err, verifiedUser) {
            if (err) {
                logger.error("Could not update user: " + err)
                return callback("Could not update user: " + err, null)
            } else {
                return callback(null, verifiedUser)
            }
        })
    }
    else {
        return("Confirmation tokens do not match", null)
    }
}

function deleteOne(userID, callback) {
    logger.debug("Trying to delete user with userID: " + userID)

    findUserBy(userID, function(err, user) {
        if(user) {
            user.remove(function(err) {
                if(err) {
                    logger.error("Error while deletion of user with userID: " + userID)
                    callback("Error while deletion", null)
                }
                else {
                    callback(null, "Deleted User " + userID)
                }
            })
        }
        else {
            logger.error("Deletion of user with userID: " + userID + " failed: User not found")
            callback("Could not delete user " + userID + ": User not found", null)
        }
    })
}

// deleting all users (for cleaning up Database before tests)
function deleteAllUsers(callback) {
    logger.debug("Trying to delete all current users ")

    var query = User.deleteMany()
    query.exec(function(err, message) {
        if(err) {
            logger.warn("Could not delete previous users: " + err)
            callback("Could not delete previous users: " + err, null)
        }
        else {
            logger.debug("Deleted all previous users")
            callback(null, true)
        }
    })
}

function checkVerification(user) {
    if(user.isVerified) {
        return true
    }
    else {
        return false
    }
}

// get user from token
function getUserFromToken(req, callback) {
    if(typeof req.headers.authorization != "undefined") {
        let token = req.headers.authorization.split(" ")[1]
        var privateKey = config.get('session.tokenKey')
        jwt.verify(token, privateKey, { algorithm: "HS256" }, (err, user) => {
            if (err) {
                callback("Error: no valid token to extract user from", null)
            }
            else {
                logger.debug("Request from user: " + user.userID)
                findUserBy(user.userID, function (err, user) {
                    if(err) {
                        callback("Error: no user " + user.userID + " found", null)
                    }
                    else {
                        callback(null, user)
                    }
                })
            }
        })
    }
    else {
        callback("undefined header, cannot identify user", null)
    }
}

module.exports = {
    getUsers,
    findUserBy,
    findUserByEmail,
    getIsAdmin,
    insertOne,
    updateOne,
    verifyOne,
    deleteOne,
    deleteAllUsers,
    checkVerification,
    getUserFromToken
}