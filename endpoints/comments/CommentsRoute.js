var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var commentService = require("./CommentsService")
var authenticationService = require("../authentication/AuthenticationService")
const userService = require("../user/UserService")

// get by ID
router.get('/:id', function(req, res, next) {
    // extract filters from query
    let filters = { _id: req.params.id }

    commentService.getComments(filters,function (err, result) {
        if(err) {
            // 500: internal server error
            logger.error(err)
            return res.status(500).send(err)
        }
        else {
            // 200: OK
            logger.debug("found comments " + result)
            return res.status(200).send(Object.values(result))
        }
    })
})

// get all comments
router.get('/*', function(req, res, next) {
    // extract filters from query
    let filters = {}
    if(req.query.id) filters._id = req.query.id
    if(req.query.messageID) filters.messageID = req.query.messageID.toString().replace(/"/g, '')
    if(req.query.commentText) filters.commentText = req.query.commentText.toString().replace(/"/g, '')
    if(req.query.authorID) filters.authorID = req.query.authorID.toString().replace(/"/g, '')

    commentService.getComments(filters,function (err, result) {
        if(err) {
            // 500: internal server error
            logger.error(err)
            return res.status(500).send(err)
        }
        else {
            // 200: OK
            logger.debug("found comments " + result)
            return res.status(200).send(Object.values(result))
        }
    })
})

// create comment
router.post('/', authenticationService.isAuthenticated, function(req, res, next) {
    // create new comment
    let newComment = {}
    if(req.body.messageID) newComment.messageID = req.body.messageID
    if(req.body.text) newComment.text = req.body.text

    if(newComment.messageID && newComment.text) {
        logger.debug("Creating new comment now")
        userService.getUserFromToken(req, function(err, user) {
            if(err) {
                // 500: internal server error
                logger.error("Could not get User from token: " + err)
                res.status(500).json({ error: "Could not get User from token" })
            }
            else {
                commentService.insertOne(req.body, user, function (err, comment) {
                    if (comment) {
                        // 201: created
                        logger.info(JSON.stringify(comment))
                        res.status(201).json(comment).send()
                    }
                    else {
                        // 500: internal server error
                        logger.error("Error while creating Comment: " + err)
                        res.status(500).json({ error: "Could not create Comment" })
                    }
                })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing text")
        res.status(400).send({ error: 'no text in body specified' })
    }
})

// update comment
router.put('/:id', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find comment, if exists update
    const searchCommentID = req.params.id
    let updatedComment = {}
    if(req.body.text) updatedComment.text = req.body.text

    if(searchCommentID && updatedComment.text) {
        commentService.findCommentByID(searchCommentID, function (err, comment) {
            logger.debug("Comment exists, trying to update properties")
            if(comment) {
                userService.getUserFromToken(req, function (err, user) {
                    if(user) {
                        logger.debug("is " + user.userID + " admin? " + user.isAdministrator + " | comment author: " + comment.authorID)
                        if(user.isAdministrator === true || comment.authorID === user.userID) {
                            commentService.updateOne(comment, updatedComment, user, function (err, comment) {
                                if(comment) {
                                    // 201: created
                                    logger.info("Updated Comment: " + JSON.stringify(comment))
                                    res.status(201).json(comment).send()
                                }
                                else {
                                    // 500: internal server error
                                    logger.error("Error while updating comment: " + err)
                                    res.status(500).json({ error: err })
                                }
                            })
                        }
                        else {
                            logger.warn("Error: Not enough rights to modify")
                            res.status(403).json({ error: "Permission denied: Not enough rights" })
                        }
                    }
                    else {
                        // 404: not found
                        logger.error("Could not find comment with id " + searchCommentID + ": " + err)
                        res.status(404).send({ error: err })
                    }
                })
            } else {
                // 404: not found
                logger.error("Could not find comment with id " + searchCommentID + ": " + err)
                res.status(404).send({error: err})
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing id or text")
        res.status(400).send({ error: 'no id in URL or text in body specified, need both to update' })
    }
})

// delete comment
router.delete('/:id', authenticationService.isAuthenticated, function(req, res, next){
    const { id } = req.params
    if(id) {
        userService.getUserFromToken(req, function (err, user) {
            if(err) {
                res.status(500).json({ error: "Could not get User" })
            }
            // only delete if user is author or admin
            commentService.findCommentByID(id, function(err, comment) {
                if(comment) {
                    if(comment.authorID === user.userID || user.isAdministrator) {
                        commentService.deleteOne(comment, function(err, deleted) {
                            if(err) {
                                // 500: internal server error
                                logger.error("Error while deleting Comment: " + err)
                                res.status(500).send({ error: err })
                            }
                            else {
                                // 200: OK
                                logger.info("Deleted Comment with id " + id)
                                res.status(200).send({ "Success": "Deleted Comment with id " + id })
                            }
                        })
                    }
                    else {
                        // 403: forbidden
                        logger.error("Not enough rights to delete comment: " + err)
                        res.status(403).send({ error: err })
                    }
                }
                else {
                    // 404: not found
                    logger.error("Deletion of comment with id: " + title + " failed: id not found")
                    res.status(404).send({ error: err })
                }
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