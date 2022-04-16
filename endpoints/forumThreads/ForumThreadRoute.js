var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var forumMessageService = require("../forumMessage/ForumMessageService")
var forumService = require("./ForumThreadService")
var authenticationService = require("../authentication/AuthenticationService")
const userService = require("../user/UserService")

// get messages for forumThreadID
router.get('/:id/forumMessages', function (req, res, next) {
    forumMessageService.getForumMessages({},function (err, result) {
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

// get all forums
router.get('/*', function(req, res, next) {
    // extract filters from query
    let filters = {}
    if(req.query.id) filters._id = req.query.id
    if(req.query.name) filters.name = req.query.name.toString().replace(/"/g, '')
    if(req.query.description) filters.description =  req.query.description.toString().replace(/"/g, '')
    if(req.query.ownerID) filters.ownerID = req.query.ownerID.toString().replace(/"/g, '')

    forumService.getForums(filters, function (err, result) {
        if(err) {
            // 500: internal server error
            logger.error(err)
            return res.status(500).send(err)
        }
        else {
            // 200: OK
            logger.debug("found forumThreads " + result)
            return res.status(200).send(Object.values(result))
        }
    })
})

// get all forums for user
router.get('/myForumThreads', authenticationService.isAuthenticated, function(req, res, next) {
    userService.getUserFromToken(req, function(err, user) {
        if(err) {
            // 500: internal server error
            logger.error(err)
            return res.status(500).send({ error: 'Could not find user for token' })
        }
        else {
            forumService.findForumsByOwner(user.userID, function (err, result) {
                if (result) {
                    // 200: OK
                    logger.debug("found forums" + result)
                    return res.status(200).send(Object.values(result))
                } else {
                    // 500: internal server error
                    logger.error(err)
                    return res.status(200).send({ error: 'Could not find forumThreads for the user' })
                }
            })
        }
    })
})

// create forumThread
router.post('/', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find forumThreads, if not exists create
    const { name } = req.body
    if(name) {
        let filters = {}
        filters.name = name
        forumService.getForums(filters, function (err, forum) {
            // if forumThread with that name already exists throw conflicting error
            if(forum.length !== 0) {
                // 409: conflict
                logger.error("Error: ForumThread already exists")
                res.status(409).send({ error: "ForumThread " + name + " already exists" })
            }
            // create forumThread
            else {
                logger.debug("ForumThread does not exist yet, creating now")
                // get requesting user from token
                userService.getUserFromToken(req, function (err, user) {
                    if(err) {
                        // 500: internal server error
                        logger.error("Could not get User from token: " + err)
                        res.status(500).json({ error: "Could not get User from token" })
                    }
                    else {
                        forumService.insertOne(req.body, user, function (err, forum) {
                            if(forum) {
                                // 201: created
                                logger.info(JSON.stringify(forum))
                                res.status(201).json(forum).send()
                            }
                            else {
                                // 500: internal server error
                                logger.error("Error while creating Forum: " + err)
                                res.status(500).json({ error: "Could not create Forum" })
                            }
                        })
                    }
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

// update
router.put('/:id', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find forumThread, if exists update
    const { id } = req.params
    if(id) {
        forumService.findForumByID(id, function (err, forum) {
            // update forumThreads
            JSON.stringify(forum)
            if(forum) {
                logger.debug("Forum exists, trying to update properties")
                userService.getUserFromToken(req, function (err, user) {
                    if(user) {
                        logger.debug("is " + user.userID + " admin? " + user.isAdministrator + " | forumThreads owner: " + forum.ownerID)
                        if(user.isAdministrator === true || forum.ownerID === user.userID) {
                            forumService.updateOne(forum, req.body, user, function (err, forum) {
                                if(forum) {
                                    // 201: created
                                    logger.info("Updated ForumThread: " + JSON.stringify(forum))
                                    res.status(201).json(forum).send()
                                }
                                else {
                                    // 500: internal server error
                                    logger.error("Error while updating Forum: " + err)
                                    res.status(500).send({ error: err })
                                }
                            })
                        }
                        else {
                            // 403: forbidden
                            logger.warn("Error: Not enough rights to modify")
                            res.status(403).json({ error: "Permission denied: Not enough rights" })
                        }
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
                logger.error("Could not find forumThread with the id " + id +  ": " + err)
                res.status(404).send({ error: err })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing name")
        res.status(400).send({ error: 'no name in URL specified' })
    }
})

// delete forumThread
router.delete('/:id', authenticationService.isAuthenticated, function(req, res, next){
    const { id } = req.params
    if(id) {
        userService.getUserFromToken(req, function (err, user) {
            if(err) {
                res.status(500).json({ error: "Could not get User" })
            }
            // only delete if user is owner or admin
            forumService.findForumByID(id, function(err, forum) {
                if(forum) {
                    if(forum.ownerID === user.userID || user.isAdministrator) {
                        forumService.deleteOne(forum, function(err, deleted) {
                            if(err) {
                                // 500: internal server error
                                logger.error("Error while deleting ForumThread: " + err)
                                res.status(500).send({ error: err })
                            }
                            else {
                                // 200: OK
                                logger.info("Deleted ForumThread with id " + id)
                                res.status(200).send({ "Success": "Deleted ForumThread with id " + id })
                            }
                        })
                    }
                    else {
                        // 403: forbidden
                        logger.error("Not enough rights to delete forumThread: " + err)
                        res.status(403).send({ error: err })
                    }
                }
                else {
                    // 404: not found
                    logger.error("Deletion of forumThreads with id: " + id + " failed: Forum not found")
                    res.status(404).send({ error: err })
                }
            })
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing name")
        res.status(400).send({ error: 'no name in URL specified' })
    }
})

module.exports = router