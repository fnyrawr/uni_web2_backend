const config = require("config")
const jwt = require("jsonwebtoken")
const userService = require("../user/UserService")
const logger = require("../../config/winston")

function verifyUser(url, callback) {
    var token = Buffer.from(url, "base64").toString('ascii')
    logger.debug("Trying to verify user with token " + token)
    var privateKey = config.get('verification.tokenKey')
    jwt.verify(token, privateKey, { algorithm: "HS256" }, function(err, email) {
        if(err) {
            callback("Error with token:" + err, null)
            return
        }
        email = email.email
        logger.debug("Got email: " + email)
        userService.findUserByEmail(email, function (err, user) {
            if (err) {
                callback("User for email " + email + " not found", null)
            } else {
                logger.debug("Checking verification status of user " + user.userID)
                if (userService.checkVerification(user)) {
                    logger.warn("User " + user.userID + " is already verified")
                    callback("User " + user.userID + " is already verified", null)
                    return
                }
                userService.verifyOne(user, url, function (err, user) {
                    if (err) {
                        callback(err, null)
                    } else {
                        callback(null, user)
                    }
                })
            }
        })
    })
}

module.exports = {
    verifyUser
}