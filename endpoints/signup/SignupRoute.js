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
            // 409: conflict
            logger.debug("User already exists")
            logger.error("Error: User already exists")
            res.status(409).json({ error: "User already exists" })
        }
        // create user
        else {
            logger.debug("Starting signup process")
            userService.insertOne(req.body, false, function (err, user) {
                if (user) {
                    // 201: created
                    const { id, userID, userName, email, ...partialObject } = user
                    const subset = { id, userID, userName, email }
                    console.log(JSON.stringify(subset))
                    res.status(201).json(subset).send()
                }
                else {
                    // 500: internal server error
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
                // 400: bad request
                logger.error("Could not verify user: " + err)
                res.status(400).json({ error: err }).send()
            }
            else {
                // 200: OK
                logger.info("Verification of " + user.userID + " succeeded")
                res.status(200).send({ "Success": "Verification of " + user.userID + " succeeded" })
            }
        })
    }
    else {
        // 400: bad request
        logger.error("Bad request: missing token")
        res.status(500).json({ error: "no verificationToken given in the URL" }).send()
    }
})

module.exports = router