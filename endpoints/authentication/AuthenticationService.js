var userService = require('../user/UserService')
var jwt = require("jsonwebtoken")
var config = require("config")
var logger = require('../../config/winston')

function createSessionToken(props, callback) {
    logger.debug("AuthenticationService: create Token")

    if(!props) {
        logger.error("Error: no json body")
        callback("JSON-Body missing", null, null)
        return
    }

    userService.findUserBy(props.userID, function(err, user) {
        if(user) {
            logger.debug("Found User, checking password")

            user.comparePassword(props.password, function(err, isMatch) {
                if(err) {
                    logger.error("Password is invalid")
                    callback(err, null)
                }
                else {
                    if(isMatch) {
                        logger.debug("Password is correct. Creating token.")

                        var issuedAt = new Date().getTime()
                        var expirationTime = config.get('session.timeout')
                        var expiresAt = issuedAt + (expirationTime * 1000)
                        var privateKey = config.get('session.tokenKey')
                        let token = jwt.sign({ "user": user.userID }, privateKey, { expiresIn: expiresAt, algorithm: 'HS256' })

                        logger.debug("Token created: " + token)

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
            logger.error("Did not find user for userID: " + props.userID)
            callback("Could not find user", null)
        }
    })
}

module.exports = {
    createSessionToken
}