var userService = require('../user/UserService')
var jwt = require("jsonwebtoken")
var config = require("config")
var logger = require('../../config/winston')

function createSessionToken(props, callback) {
    if(!props) {
        logger.error("Error: no JSON-Body")
        callback("JSON-Body missing", null, null)
        return
    }

    userService.findUserBy(props.userID, function(err, user) {
        if(user) {
            user.comparePassword(props.password, function(err, isMatch) {
                if(err) {
                    logger.warn("Found user but password is invalid")
                    callback(err, null)
                }
                else {
                    if(isMatch) {
                        var issuedAt = new Date().getTime()
                        var expirationTime = config.get('session.timeout')
                        var expiresAt = issuedAt + (expirationTime * 1000)
                        var privateKey = config.get('session.tokenKey')
                        let token = jwt.sign({ "user": user.userID }, privateKey, { expiresIn: expiresAt, algorithm: 'HS256' })

                        logger.info("Token for user " + props.userID + " created: " + token)

                        callback(null, token, user)
                    }
                    else {
                        logger.error("Password or userID is invalid")
                        callback(err, null)
                    }
                }
            })
        }
        else {
            logger.error("Could not find user for userID: " + props.userID)
            callback("Could not find user", null)
        }
    })
}

module.exports = {
    createSessionToken
}