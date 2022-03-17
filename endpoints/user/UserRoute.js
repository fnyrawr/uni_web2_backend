var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var userService = require("./UserService")
var authenticationService = require("../authentication/AuthenticationService")

// get all users
router.get('/', authenticationService.isAdministrator, function(req, res, next) {
    userService.getUsers(function(err, users) {
        if(users) {
            // 200: OK
            logger.debug("Found users: " + users)
            res.status(200).json(users).send()
        }
        else {
            // 410: resource gone
            logger.error("Error: " + err)
            res.status(410).send({ error: err })
        }
    })
})

// add user
router.post('/', authenticationService.isAdministrator, function(req, res, next) {
    // try to find user to be added
    const { userID } = req.body
        if(userID) {
            userService.findUserBy(userID, function (err, user) {
            // if user exists already throw conflicting error
            if (user) {
                // 409: conflict
                logger.error("Error: User already exists")
                res.status(409).send({ error: userID + ' already exists' })
            }
            // create user
            else {
                userService.insertOne(req.body, true, function (err, user) {
                    if (user) {
                        // 201: created
                        const { id, userID, userName, email, ...partialObject } = user
                        const subset = { id, userID, userName, email }
                        logger.debug("Created user: " + JSON.stringify(subset))
                        res.status(201).json(subset).send()
                    } else {
                        // 500: internal server error
                        logger.error("Error while creating user: " + err)
                        res.status(500).send({ error: err })
                    }
                })
            }
            })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing userID")
        res.status(400).send({ error: "no userID in body specified" })
    }
})

// update
router.put('/:userID', authenticationService.isAuthenticated, function(req, res, next) {
    // check if searchUserID is defined
    const searchUserID = req.params.userID
    if(searchUserID) {
        // get requesting username
        authenticationService.getUserFromToken(req, function (err, requestingUserID) {
            if (err) {
                // 404: not found
                logger.error("Could not find requesting user from token: " + err)
                res.status(404).json({ error: err })
            }
            else {
                // get the object of the requesting user for detailed checks later
                userService.findUserBy(requestingUserID, function (err, requestingUser) {
                    if (err) {
                        // 404: not found
                        logger.error("Could not resolve requesting user in database: " + err)
                        res.status(404).json({ error: err })
                    }
                    else {
                        // try to find user
                        userService.findUserBy(searchUserID, function (err, user) {
                            if(user) {
                                logger.debug("Found user, trying to update properties")
                                userService.getIsAdmin(requestingUser.userID, function (err, adminStatus) {
                                    if (err) {
                                        // 500: internal server error
                                        logger.error("Error while updating User: " + err)
                                        res.status(500).json({ error: err })
                                    }
                                    else {
                                        // update user if requesting user is the user to be modified OR if requester is admin
                                        if (adminStatus || requestingUser.userID === user.userID) {
                                            userService.updateOne(user, req.body, adminStatus, function (err, user) {
                                                if (user) {
                                                    // 201: created
                                                    const { id, userID, userName, email, ...partialObject } = user
                                                    const subset = {id, userID, userName, email}
                                                    logger.info("Updated User: " + JSON.stringify(subset))
                                                    res.status(201).json(subset).send()
                                                }
                                                else {
                                                    // 500: internal server error
                                                    logger.error("Error while updating User: " + err)
                                                    res.status(500).send({ error: err })
                                                }
                                            })
                                        } else {
                                            // 403: forbidden
                                            logger.error("Error while updating User: " + err)
                                            res.status(403).send({ error: err })
                                        }
                                    }
                                })
                            }
                            else {
                                // 404: not found
                                logger.error("Failed updating user with userID " + searchUserID + ": " + err)
                                res.status(404).send({ error: err })
                            }
                        })
                    }
                })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing userID")
        res.status(400).send({ error: 'no userID in URL specified' })
    }
})

// delete user
router.delete('/:userID', authenticationService.isAuthenticated, function(req, res, next){
    // check if searchUserID is defined
    const searchUserID = req.params.userID
    if(searchUserID) {
        // get requesting username
        authenticationService.getUserFromToken(req, function (err, requestingUserID) {
            if (err) {
                // 404: not found
                logger.error("Could not find requesting user from token: " + err)
                res.status(404).json({ error: err })
            }
            else {
                // get the object of the requesting user for detailed checks later
                userService.findUserBy(requestingUserID, function (err, requestingUser) {
                    if (err) {
                        // 404: not found
                        logger.error("Could not resolve requesting user in database: " + err)
                        res.status(404).json({ error: err })
                    }
                    else {
                        // try to find user
                        userService.findUserBy(searchUserID, function (err, user) {
                            if (user) {
                                logger.debug("Found user, trying to delete")
                                userService.getIsAdmin(requestingUser.userID, function (err, adminStatus) {
                                    if (err) {
                                        // 500: internal server error
                                        logger.error("Error while updating User: " + err)
                                        res.status(500).json({ error: err })
                                    }
                                    else {
                                        // delete user if requesting user is the user to be modified OR if requester is admin
                                        if (adminStatus || requestingUser.userID === user.userID) {
                                            userService.deleteOne(user.userID, function (err, result) {
                                                if(err) {
                                                    // 500: internal server error
                                                    logger.error("Error while deleting User: " + err)
                                                    res.status(500).send({ error: err })
                                                }
                                                else {
                                                    // 200: OK
                                                    logger.info("User deleted - " + result)
                                                    res.status(200).send({ "Success": "Deleted User with userID " + searchUserID })
                                                }
                                            })
                                        } else {
                                            // 403: forbidden
                                            logger.error("Error while updating User: " + err)
                                            res.status(403).send({ error: err })
                                        }
                                    }
                                })
                            }
                            else {
                                // 404: not found
                                logger.error("Failed updating user with userID " + searchUserID + ": " + err)
                                res.status(404).send({ error: err })
                            }
                        })
                    }
                })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing userID")
        res.status(400).send({ error: 'no userID in URL specified' })
    }
})

// find user
router.get('/:userID', authenticationService.isAuthenticated, function(req, res, next){
    // check if searchUserID is defined
    const searchUserID = req.params.userID
    if(searchUserID) {
        // get requesting username
        authenticationService.getUserFromToken(req, function (err, requestingUserID) {
            if (err) {
                // 404: not found
                logger.error("Could not find requesting user from token: " + err)
                res.status(404).json({ error: err })
            }
            else {
                // get the object of the requesting user for detailed checks later
                userService.findUserBy(requestingUserID, function (err, requestingUser) {
                    if (err) {
                        // 404: not found
                        logger.error("Could not resolve requesting user in database: " + err)
                        res.status(404).json({ error: err })
                    }
                    else {
                        // try to find user
                        userService.findUserBy(searchUserID, function (err, user) {
                            if (user) {
                                logger.debug("Found user, trying to update properties")
                                userService.getIsAdmin(requestingUser.userID, function (err, adminStatus) {
                                    if (err) {
                                        // 500: internal server error
                                        logger.error("Error while updating User: " + err)
                                        res.status(500).json({ error: err })
                                    }
                                    else {
                                        // only send data if requesting user is admin or the user himself
                                        if (adminStatus || requestingUser.userID === user.userID) {
                                            // 200: OK
                                            const { id, userID, userName, email, isVerified, isAdministrator, ...partialObject } = user
                                            const subset = { id, userID, userName, email, isVerified, isAdministrator }
                                            logger.debug("Result: " + subset)
                                            res.status(200).json(subset).send()
                                        } else {
                                            // 403: forbidden
                                            logger.error("Error while getting User: " + err)
                                            res.status(403).send({ error: err })
                                        }
                                    }
                                })
                            }
                            else {
                                // 404: not found
                                logger.error("Failed fetching user for userID " + searchUserID + ": " + err)
                                res.status(404).send({ error: err })
                            }
                        })
                    }
                })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing userID")
        res.status(400).send({ error: 'no userID in URL specified' })
    }
})

module.exports = router