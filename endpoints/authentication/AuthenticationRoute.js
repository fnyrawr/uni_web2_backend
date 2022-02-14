var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var authenticationService = require('./AuthenticationService')

router.post('/login', function(req, res, next) {
    authenticationService.createSessionToken(req.body, function(err, token, user) {
        if(token) {
            res.header("Authorization", "Bearer " + token)

            if(user) {
                const { id, userID, userName, ...partialObject } = user
                const subset = { id, userID, userName }
                console.log(JSON.stringify(subset))
                res.send(subset)
            }
            else {
                logger.error("User is null, even though a token has been created. Error: " + err)
                res.send('Unable to map token because user is null')
            }
        }
        else {
            logger.error("Token has not been created. Error: " + err)
            res.send('Unable to create token')
        }
    })
})

module.exports = router