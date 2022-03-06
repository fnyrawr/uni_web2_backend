var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var userService = require("./UserService")
var authenticationService = require("../authentication/AuthenticationService")

// get all users
router.get('/', authenticationService.isAuthenticated, function(req, res, next) {
    userService.getUsers(function (err, result) {
        if (result) {
            logger.debug("found users" + result)
            return res.send(Object.values(result))
        }
        else {
            logger.error(err)
            res.status(404).json({ error: err })
        }
    })
})

router.post('/', authenticationService.isAuthenticated, function(req, res, next) {
    // get requesting username
    authenticationService.getUserFromToken(req, function(err, requestingUser) {
        // get the object of the requesting user
        userService.findUserBy(requestingUser, function (err, requestingUser) {
            if(err) {
                logger.error("Could not resolve requesting user: " + err)
                res.status(404).json({ error: err })
                return
            }
            // try to find user, if exists update, if not create
            userService.findUserBy(req.body.userID, function (err, user) {
                if (user) {
                    logger.debug("User already exists, trying to update properties")
                    userService.getIsAdmin(requestingUser.userID, function (err, adminStatus) {
                        if (err) {
                            logger.error("Error while updating User: " + err)
                            res.status(404).json({ error: err })
                            return
                        }
                        // update user if requester is the user OR admin
                        logger.debug(requestingUser.userID)
                        logger.debug(user.userID)
                        if (adminStatus || requestingUser.userID === user.userID) {
                            userService.updateOne(user, req.body, adminStatus, function (err, user) {
                                if (user) {
                                    const { id, userID, userName, email, ...partialObject } = user
                                    const subset = { id, userID, userName, email }
                                    console.log(JSON.stringify(subset))
                                    res.send(subset)
                                } else {
                                    logger.error("Error while updating User: " + err)
                                    res.status(500).json({ error: err })
                                }
                            })
                        }
                        else {
                            logger.error("Error while updating User: " + err)
                            res.status(403).json({ error: err })
                        }
                    })
                }
                // create user (only as admin)
                else {
                    logger.debug("User does not exist yet, creating now")
                    userService.getIsAdmin(requestingUser.userID, function (err, adminStatus) {
                        if (!adminStatus || err) {
                            logger.error("Error while creating User: " + err)
                            res.status(404).json({ error: err })
                            return
                        }
                        userService.insertOne(req.body, adminStatus, function (err, user) {
                            if (user) {
                                const {id, userID, userName, email, ...partialObject} = user
                                const subset = {id, userID, userName, email}
                                console.log(JSON.stringify(subset))
                                res.send(subset)
                            } else {
                                logger.error("Error while creating User: " + err)
                                res.status(500).json({ error: err })
                            }
                        })
                    })
                }
            })
        })
    })
})

router.post('/deleteUserByID', authenticationService.isAuthenticated, function(req, res, next){
    // delete only if requester is user to be deleted himself or admin
    authenticationService.getUserFromToken(req, function(err, requestingUser) {
        if(err) {
            logger.error("Can't get user from token: " + err)
            return res.status(404).json({ error: err })
        }
        userService.findUserBy(requestingUser, function (err, requestingUser) {
            if(err) {
                logger.error("Can't find requesting user: " + err)
                return res.status(404).json({ error: err })
            }
            userService.getIsAdmin(requestingUser.userID, function (err, adminStatus) {
                if(err) {
                    logger.error("Can't find out if user is admin: " + err)
                    return res.status(404).json({ error: err })
                }
                if (adminStatus || requestingUser.userID === req.body.userID) {
                    userService.deleteOne(req.body.userID, function (err, result) {
                        if (result) {
                            logger.info(result)
                            res.send(result)
                        } else {
                            res.send(err)
                        }
                    })
                }
                else {
                    logger.error("Error: Not enough rights")
                    return res.status(403).json({ error: "Error: Not enough rights" })
                }
            })
        })
    })
})

router.post('/getUserByID', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find user
    userService.findUserBy(req.body.userID, function(err, user) {
        if(user) {
            logger.debug("Result: " + user)
            res.send(user)
        }
        else {
            res.send(err)
        }
    })
})

module.exports = router