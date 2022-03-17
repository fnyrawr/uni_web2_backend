var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var forumMessageService = require("./ForumMessageService")
var authenticationService = require("../authentication/AuthenticationService")
const userService = require("../user/UserService")

// get all forumThreads messages
router.get('/*', function(req, res, next) {
    // extract filters from query
    let filters = {}
    if(req.query.id) filters._id = req.query.id
    if(req.query.forumThreadID) filters.forumThreadID = req.query.forumThreadID.toString().replace(/"/g, '')
    if(req.query.title) filters.title = req.query.title.toString().replace(/"/g, '')
    if(req.query.text) filters.text =  req.query.text.toString().replace(/"/g, '')
    if(req.query.authorID) filters.authorID = req.query.authorID.toString().replace(/"/g, '')

    forumMessageService.getForumMessages(filters,function (err, result) {
        if(err) {
            // 500: internal server error
            logger.error(err)
            return res.status(500).send(err)
        }
        else {
            // 200: OK
            logger.debug("found messages " + result)
            return res.status(200).send(Object.values(result))
        }
    })
})

// create message
router.post('/', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find message, if exists throw error
    let newMessage = {}
    if(req.body.forumThreadID) newMessage.forumThreadID = req.body.forumThreadID
    if(req.body.title) newMessage.title = req.body.title
    if(req.body.text) newMessage.text =  req.body.text
    
    if(newMessage.title) {
        forumMessageService.findMessageByTitle(newMessage.title, function (err, message) {
            if(message) {
                // 409: conflict
                logger.error("Error: message with that title already exists")
                res.status(409).send({ error: "Message with title " + newMessage.title + " already exists" })
            }
            // create message
            else {
                logger.debug("Message does not exist yet, creating now")
                authenticationService.getUserFromToken(req, function (err, user) {
                    if(err) {
                        // 500: internal server error
                        logger.error("Could not get User from token: " + err)
                        res.status(500).json({ error: "Could not get User from token" })
                    }
                    forumMessageService.insertOne(newMessage, user, function (err, message) {
                        if(message) {
                            // 201: created
                            logger.info(JSON.stringify(message))
                            res.status(201).json(message).send()
                        } else {
                            // 500: internal server error
                            logger.error("Error while creating Message: " + err)
                            res.status(500).json({ error: "Could not create Message" })
                        }
                    })
                })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing name")
        res.status(400).send({ error: 'no name in body specified' })
    }
})

// update message
router.put('/:id', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find message, if exists update
    const searchMessageID = req.params.id
    let updatedMessage = {}
    if(req.body.forumThreadID) updatedMessage.forumThreadID = req.body.forumThreadID
    if(req.body.title) updatedMessage.title = req.body.title
    if(req.body.text) updatedMessage.text =  req.body.text

    if(searchMessageID) {
        forumMessageService.findMessageByID(searchMessageID, function (err, message) {
            // update message
            if (message) {
                logger.debug("Message already exists, trying to update properties")
                authenticationService.getUserFromToken(req, function (err, user) {
                    if (user) {
                        userService.getIsAdmin(user, (err, adminStatus) => {
                            if(err) {
                                // 500: internal server error
                                logger.error("Failed trying to read if user is admin")
                                res.status(500).send({ error: err })
                            }
                            else {
                                logger.debug("is " + user + " admin? " + adminStatus + " | message author: " + message.authorID)
                                if (adminStatus === true || message.authorID === user) {
                                    forumMessageService.updateOne(message, updatedMessage, user, function (err, message) {
                                        if (message) {
                                            // 201: created
                                            logger.info("Updated Message: " + JSON.stringify(message))
                                            res.status(201).json(message).send()
                                        }
                                        else {
                                            // 500: internal server error
                                            logger.error("Error while updating message: " + err)
                                            res.status(500).json({ error: err })
                                        }
                                    })
                                } else {
                                    logger.warn("Error: Not enough rights to modify")
                                    res.status(403).json({ error: "Permission denied: Not enough rights" })
                                }
                            }
                        })
                    }
                    else {
                        // 404: not found
                        logger.error("Could not get user from token: " + err)
                        res.status(404).send({ error: err })
                    }
                })
            }
            else {
                // 404: not found
                logger.error("Could not find message with the title " + searchMessageID + ": " + err)
                res.status(404).send({ error: err })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing title")
        res.status(400).send({ error: 'no title in URL specified' })
    }
})

// delete message
router.delete('/:id', authenticationService.isAuthenticated, function(req, res, next){
    const { id } = req.params
    if(id) {
        authenticationService.getUserFromToken(req, function (err, user) {
            if(err) {
                res.status(500).json({ error: "Could not get User" })
            }
            // only delete if user is author or admin
            userService.getIsAdmin(user, function (err, adminStatus) {
                forumMessageService.findMessageByID(id, function(err, message) {
                    if(message) {
                        if(message.authorID === user || adminStatus) {
                            forumMessageService.deleteOne(message, function(err, deleted) {
                                if(err) {
                                    // 500: internal server error
                                    logger.error("Error while deleting Message: " + err)
                                    res.status(500).send({ error: err })
                                }
                                else {
                                    // 200: OK
                                    logger.info("Deleted Message with id " + id)
                                    res.status(200).send({ "Success": "Deleted Message with id " + id })
                                }
                            })
                        }
                        else {
                            // 403: forbidden
                            logger.error("Not enough rights to delete message: " + err)
                            res.status(403).send({ error: err })
                        }
                    }
                    else {
                        // 404: not found
                        logger.error("Deletion of message with id: " + title + " failed: id not found")
                        res.status(404).send({ error: err })
                    }
                })
            })
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing id")
        res.status(400).send({ error: 'no id in URL specified' })
    }
})

module.exports = router