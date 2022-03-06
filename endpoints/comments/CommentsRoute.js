var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var commentService = require("./CommentsService")
var authenticationService = require("../authentication/AuthenticationService")
const userService = require("../user/UserService")

// get all comments
router.get('/', authenticationService.isAdministrator, function(req, res, next) {
    commentService.getComments(function (err, result) {
        if (result) {
            logger.debug("found comments" + result)
            return res.send(Object.values(result))
        }
        else {
            logger.error(err)
            return res.status(500).json({ error: err })
        }
    })
})

// get all messages for messageTitle
router.post('/getByMessageTitle', authenticationService.isAuthenticated, function(req, res, next) {
    var messageTitle = req.body.messageTitle

    if(messageTitle) {
        commentService.findCommentsByMessageTitle(messageTitle, function (err, result) {
            if (result) {
                logger.debug("found comments" + result)
                return res.send(Object.values(result))
            }
            else {
                logger.error(err)
                res.status(404).json({ error: err })
            }
        })
    }
    else {
        logger.error("Error: no messageTitle specified")
        return res.status(500).json({ error: "MessageTitle not specified" })
    }
})

// get all comments for userID
router.post('/getByUserID', authenticationService.isAuthenticated, function(req, res, next) {
    var userID = req.body.userID

    if(userID) {
        commentService.findCommentsByUserID(userID, function (err, result) {
            if (result) {
                logger.debug("found comments " + result)
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
    // try to find comment, if exists update, if not create
    commentService.findComment(req.body.messageTitle, req.body.commentNo, function(err, comment) {
        if(err) {
            res.status(500).json({ error: err })
            return
        }
        // update comment
        if(comment) {
            logger.debug("Comment already exists, trying to update properties")
            authenticationService.getUserFromToken(req, function(err, user) {
                userService.getIsAdmin(user, (err, adminStatus) => {
                    if(adminStatus === true || comment.authorID === user) {
                        commentService.updateOne(comment, req.body, user, function (err, comment) {
                            if (comment) {
                                console.log(JSON.stringify(comment))
                                res.send(comment)
                            } else {
                                logger.error("Error while updating comment: " + err)
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
        // create comment
        else {
            logger.debug("Comment does not exist yet, creating now")
            authenticationService.getUserFromToken(req, function(err, user) {
                if(err) {
                    res.status(500).json({ error: "Could not get User" })
                }
                commentService.insertOne(req.body, user, function (err, comment) {
                    if(comment) {
                        console.log(JSON.stringify(comment))
                        res.send(comment)
                    } else {
                        logger.error("Error while creating comment: " + err)
                        res.status(500).json({ error: err })
                    }
                })
            })
        }
    })
})

router.post('/delete', authenticationService.isAuthenticated, function(req, res, next){
    authenticationService.getUserFromToken(req, function(err, user) {
        if(err) {
            res.status(500).json({ error: "Could not get User" })
        }
        commentService.deleteOne(req.body.messageTitle, req.body.commentNo, user, function (err, result) {
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