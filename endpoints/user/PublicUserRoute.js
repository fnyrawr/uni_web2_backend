var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var userService = require("./UserService")

// get all users
router.get('/', function(req, res, next) {
    userService.getUsers(function(err, result) {
        logger.debug("Result: " + result)
        if(result) {
            res.send(Object.values(result))
        }
        else {
            res.send(err)
        }
    })
})

router.post('/', function(req, res, next) {
    // try to find user, if exists update, if not create
    userService.findUserBy(req.body.userID, function(err, user) {
        // update user
        if(user) {
            logger.debug("User already exists, trying to update properties")
            userService.updateOne(user, req.body, function(err, result) {
                if(result) {
                    logger.info("User updated - " + result)
                    res.send(result)
                }
                else {
                    logger.error("Error while updating User: " + err)
                    res.send(err)
                }
            })
        }
        // create user
        else {
            logger.debug("User does not exist yet, creating now")
            userService.insertOne(req.body, function(err, result) {
                if(result) {
                    logger.info("User created - " + result)
                    res.send(result)
                }
                else {
                    logger.error("Error while creating User: " + err)
                    res.send(err)
                }
            })
        }
    })
})

router.post('/deleteUserByID', function(req, res, next){
    userService.deleteOne(req.body.userID, function(err, result) {
        if(result) {
            logger.info("User deleted - " + result)
            res.send(result)
        }
        else {
            res.send(err)
        }
    })
})

router.post('/getUserByID', function(req, res, next) {
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