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
            if(!userService.checkVerification(user)) {
                logger.warn("User is not verified")
                callback(user.userName + " is not verified", null, null)
                return
            }
            user.comparePassword(props.password, function(err, isMatch) {
                if(err) {
                    logger.warn("Found user but password is invalid")
                    callback(err, null, null)
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
                        callback(err, null, null)
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

// check if user is authenticated (no admin check)
function isAuthenticated(req, res, next) {
    if(typeof req.headers.authorization != "undefined") {
        let token = req.headers.authorization.split(" ")[1]
        var privateKey = config.get('session.tokenKey')
        jwt.verify(token, privateKey, { algorithm: "HS256" }, (err, user) => {
            if(err) {
                logger.warn("Error 401: not authorized - " + err)
                res.status(401).json({ error: "not authorized" })
                return
            }
            // return of verify is no user object but only the username in user.user
            userService.findUserBy(user.user, function(err, user) {
                if(err) {
                    logger.warn("Error 401: not authorized - " + err)
                    res.status(401).json({ error: "not authorized: could not find user to authorize" })
                }
                else {
                    logger.debug(JSON.stringify(user))
                    if (userService.checkVerification(user)) {
                        return next()
                    }
                    logger.warn("User is not verified yet")
                    res.status(401).json({ error: "not authorized: Please verify your account first" })
                }
            })
        })
    }
    else {
        logger.warn("Error 401: not authorized")
        res.status(401).json({ error: "not authorized" })
    }
}

// check if user is authenticated and admin
function isAdministrator(req, res, next) {
    if(typeof req.headers.authorization != "undefined") {
        let token = req.headers.authorization.split(" ")[1]
        var privateKey = config.get('session.tokenKey')
        jwt.verify(token, privateKey, { algorithm: "HS256" }, (err, user) => {
            if (err) {
                logger.warn('401: not authorized')
                res.status(401).json({ error: "not authorized" })
                return
            }
            userService.getIsAdmin(user.user, function(err, isAdmin) {
                logger.debug(`user ${user.user} is admin: ${ isAdmin }`)
                if (err) {
                    logger.warn('500: access denied')
                    res.status(500).json({ error: "could not get admin status" })
                    return
                }
                if (isAdmin) {
                    return next()
                } else {
                    logger.warn('403: access denied')
                    res.status(403).json({ error: "access denied" })
                }
            })
        })
    } else {
        logger.warn('401: not authorized - no headers set')
        res.status(401).json({ error: "not authorized" })
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
                logger.debug("Request from user: " + user.user)
                callback(null, user.user)
            }
        })
    } else {
        callback("undefined header, cannot identify user", null)
    }
}



module.exports = {
    createSessionToken,
    isAuthenticated,
    isAdministrator,
    getUserFromToken
}