var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var userService = require("./UserService")

// get all users
router.get('/', function(req, res, next) {
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

// delete all users
router.delete('/deleteAllUsers', function (req, res, next) {
    // for testing purposes to clean the database beforehand
    userService.deleteAllUsers(function(err, deleted) {
        if(err) {
            // 500: internal server error
            logger.error("Error: " + err)
            res.status(500).send({ error: err })
        }
        // 200: OK
        logger.info("Deleted all previous users")
        res.status(200).send({ 'Success': 'Deleted all previous users.' })
    })
})

// create user
router.post('/', function(req, res, next) {
    // try to find user given in the body
    const { userID } = req.body
    if(userID) {
        userService.findUserBy(userID, function (err, user) {
            // NOTE: admin account is automatically created and can't be created manually
            // if user exists already throw conflicting error
            if (user) {
                // 409: conflict
                logger.error("Error: User already exists")
                res.status(409).send({ error: userID + ' already exists' })
            }
            // create user
            else {
                logger.debug("User does not exist yet, creating now")
                userService.insertOne(req.body, true, function (err, result) {
                    if (result) {
                        // 200: OK
                        logger.info("User created - " + result)
                        res.status(201).json(result).send()
                    } else {
                        // 500: internal server error
                        logger.error("Error while creating User: " + err)
                        res.status(500).send({ error: err })
                    }
                })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing userID")
        res.status(400).send({ error: 'no userID in body specified' })
    }
})

// update user
router.put('/:userID', function(req, res, next) {
    // try to find user
    const { userID } = req.params
    if(userID) {
        userService.findUserBy(userID, function (err, user) {
            // update user
            if (user) {
                logger.debug("Found user, trying to update properties")
                userService.updateOne(user, req.body, true, function (err, result) {
                    if (result) {
                        // 200: OK
                        logger.info("User updated - " + result)
                        res.status(201).json(result).send()
                    } else {
                        // 403: forbidden
                        logger.error("Error while updating User: " + err)
                        res.status(403).send({ error: err })
                    }
                })
            }
            else {
                // 404: not found
                logger.error("Failed updating user with userID " + userID + ": " + err)
                res.status(404).send({ error: err })
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
router.delete('/:userID', function(req, res, next){
    // extract userID from URL
    const { userID } = req.params
    if(userID) {
        userService.deleteOne(userID, function (err, result) {
            if (err) {
                // 404: not found
                logger.error("Failed deleting user with userID " + userID + ": " + err)
                res.status(404).send({ error: err })
            }
            else {
                // 200: OK
                logger.info("User deleted - " + result)
                res.status(200).send({ "Success": "Deleted user with userID" + userID })
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
router.get('/:userID', function(req, res, next) {
    // try to find user
    const { userID } = req.params
    if(userID) {
        userService.findUserBy(userID, function (err, user) {
            if (user) {
                // 200: OK
                logger.debug("Result: " + user)
                res.status(200).json(user).send()
            }
            else {
                // 404: not found
                logger.warn("User with userID " + userID + " not found: " + err)
                res.status(404).send({ error: err })
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