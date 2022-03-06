var express = require('express')
var router = express.Router()
const signupService = require("./SignupService")
const userService = require("../user/UserService")
const logger = require("../../config/winston")

// route for users to signup
router.post('/', function(req, res, next) {
    // try to find user, if exists throw error, if not create
    userService.findUserBy(req.body.userID, function (err, user) {
        if (user) {
            logger.debug("User already exists")
            logger.error("Error: User already exists")
            res.status(500).json({ error: "User already exists" })
        }
        // create user
        else {
            logger.debug("Starting signup process")
            userService.insertOne(req.body, false, function (err, user) {
                if (user) {
                    const { id, userID, userName, email, ...partialObject } = user
                    const subset = { id, userID, userName, email }
                    console.log(JSON.stringify(subset))
                    res.send(subset)
                } else {
                    logger.error("Error while creating User: " + err)
                    res.status(500).json({ error: "Error while creating User: " + err })
                }
            })
        }
    })
})

router.get('/confirm/:confirmationToken', function(req, res, next) {
    var url = (req.params.confirmationToken)
    if(url) {
        signupService.verifyUser(url, function(err, user) {
            if(err) {
                res.status(500).json({ error: err })
            }
            else {
                logger.info("Verification of " + user.userID + " succeeded")
                res.send("Verification of " + user.userID + " succeeded")
            }
        })
    }
    else {
        res.status(500).json({ error: "Can't read confirmationToken from url" })
    }
})

module.exports = router