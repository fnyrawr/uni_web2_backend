var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var forumService = require("./ForumService")
var authenticationService = require("../authentication/AuthenticationService")
const userService = require("../user/UserService")

// get all forums
router.get('/', function(req, res, next) {
    forumService.getForums(function (err, result) {
        if (result) {
            logger.debug("found forums" + result)
            return res.send(Object.values(result))
        }
        else {
            logger.error(err)
            return res.send(err)
        }
    })
})

// get all forums for user
router.get('/getByOwnerID', authenticationService.isAuthenticated, function(req, res, next) {
    authenticationService.getUserFromToken(req, function(err, user) {
        if(err) {
            res.send(err)
        }
        forumService.findForumsByOwner(user,function (err, result) {
            if (result) {
                logger.debug("found forums" + result)
                return res.send(Object.values(result))
            } else {
                logger.error(err)
                return res.send(err)
            }
        })
    })
})

// get all forums for specified user (only with admin rights)
router.post('/getByOwnerID', authenticationService.isAdministrator, function(req, res, next) {
    var user = req.body.ownerID

    if(user) {
        forumService.findForumsByOwner(user, function (err, result) {
            if (result) {
                logger.debug("found forums" + result)
                return res.send(Object.values(result))
            } else {
                logger.error(err)
                return res.send(err)
            }
        })
    }
    else {
        logger.error("no username given to search for")
        return res.send("Error: no user to search for specified")
    }
})

router.post('/', authenticationService.isAuthenticated, function(req, res, next) {
    // try to find forum, if exists update, if not create
    forumService.findForumByName(req.body.forumName, function(err, forum) {
        // update forum
        if(forum) {
            logger.debug("Forum already exists, trying to update properties")
            authenticationService.getUserFromToken(req, function(err, user) {
                userService.getIsAdmin(user, (err, adminStatus) => {
                    logger.debug("is " + user + " admin? " + adminStatus + " | forum owner: " + forum.ownerID)
                    if(adminStatus === true || forum.ownerID === user) {
                        forumService.updateOne(forum, req.body, user, function (err, forum) {
                            if (forum) {
                                console.log(JSON.stringify(forum))
                                res.send(forum)
                            } else {
                                logger.error("Error while updating Forum: " + err)
                                res.status(500).json({ error: "Could not update Forum" })
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
        // create forum
        else {
            logger.debug("Forum does not exist yet, creating now")
            authenticationService.getUserFromToken(req, function(err, user) {
                if(err) {
                    res.status(500).json({ error: "Could not get User" })
                }
                forumService.insertOne(req.body, user, function (err, forum) {
                    if(forum) {
                        console.log(JSON.stringify(forum))
                        res.send(forum)
                    } else {
                        logger.error("Error while creating Forum: " + err)
                        res.status(500).json({ error: "Could not create Forum" })
                    }
                })
            })
        }
    })
})

router.post('/deleteForumByName', authenticationService.isAuthenticated, function(req, res, next){
    authenticationService.getUserFromToken(req, function(err, user) {
        if(err) {
            res.status(500).json({ error: "Could not get User" })
        }
        forumService.deleteOne(req.body.forumName, user, function (err, result) {
            if (result) {
                logger.info(result)
                res.send(result)
            } else {
                res.status(500).json({error: "Could not delete Forum"})
            }
        })
    })
})

module.exports = router