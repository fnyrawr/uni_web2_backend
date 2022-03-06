var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var forumMessageService = require("./ForumMessageService")
var authenticationService = require("../authentication/AuthenticationService")
const userService = require("../user/UserService")

// get all forum messages
router.get('/', authenticationService.isAdministrator, function(req, res, next) {
    forumMessageService.getForumMessages(function (err, result) {
        if (result) {
            logger.debug("found messages" + result)
            return res.send(Object.values(result))
        }
        else {
            logger.error(err)
            return res.status(500).json({ error: err })
        }
    })
})

// get all comments for forumID
router.post('/getByForumID', authenticationService.isAuthenticated, function(req, res, next) {
    var forumID = req.body.forumID

    if(forumID) {
        forumMessageService.findMessagesByForumID(forumID, function (err, result) {
            if(result) {
                logger.debug("found messages" + result)
                return res.send(Object.values(result))
            }
            else {
                logger.error(err)
                res.status(404).json({ error: err })
            }
        })
    }
    else {
        logger.error("Error: no forumID specified")
        return res.status(500).json({ error: "ForumID not specified" })
    }
})

// get all messages for userID
router.post('/getByUserID', authenticationService.isAuthenticated, function(req, res, next) {
    var userID = req.body.userID

    if(userID) {
        forumMessageService.findMessagesByUserID(userID, function (err, result) {
            if (result) {
                logger.debug("found messages " + result)
                return res.send(Object.values(result))
            }
            else {
                logger.error(err)
                res.status(404).json({ error: err })
            }
        })
    }
    else {
        logger.error("Error: no userID specified")
        return res.status(500).json({ error: "UserID not specified" })
    }
})

router.post('/', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find message, if exists update, if not create
    forumMessageService.findMessageByTitle(req.body.messageTitle, function(err, message) {
        // update message
        if(message) {
            logger.debug("Message already exists, trying to update properties")
            authenticationService.getUserFromToken(req, function(err, user) {
                userService.getIsAdmin(user, (err, adminStatus) => {
                    logger.debug("is " + user + " admin? " + adminStatus + " | message author: " + message.authorID)
                    if(adminStatus === true || message.authorID === user) {
                        forumMessageService.updateOne(message, req.body, user, function (err, message) {
                            if (message) {
                                console.log(JSON.stringify(message))
                                res.send(message)
                            } else {
                                logger.error("Error while updating message: " + err)
                                res.status(500).json({ error: err })
                            }
                        })
                    }
                    else {
                        logger.warn("Error: Not enough rights to modify")
                        res.status(403).json({ error: "Permission denied: Not enough rights" })
                    }
                })
            })
        }
        // create message
        else {
            logger.debug("Message does not exist yet, creating now")
            authenticationService.getUserFromToken(req, function(err, user) {
                if(err) {
                    res.status(500).json({ error: "Could not get User" })
                }
                forumMessageService.insertOne(req.body, user, function (err, message) {
                    if(message) {
                        console.log(JSON.stringify(message))
                        res.send(message)
                    } else {
                        logger.error("Error while creating message: " + err)
                        res.status(500).json({ error: err })
                    }
                })
            })
        }
    })
})

router.post('/deleteMessageByTitle', authenticationService.isAuthenticated, function(req, res, next){
    authenticationService.getUserFromToken(req, function(err, user) {
        if(err) {
            res.status(500).json({ error: "Could not get User" })
        }
        forumMessageService.deleteOne(req.body.messageTitle, user, function (err, result) {
            if(err) {
                logger.warn("Error while deleting message: " + err)
                res.status(403).json({ error: err })
            }
            else {
                logger.info(result)
                res.send(result)
            }
        })
    })
})

module.exports = router