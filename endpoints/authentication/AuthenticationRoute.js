var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var authenticationService = require('./AuthenticationService')

router.post('/login', function(req, res, next) {
    logger.debug('Trying to create a token')
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
                res.send('Could not create token')
            }
        }
        else {
            logger.error("Token has not been created. Error: " + err)
            res.send('Could not create token')
        }
    })
})

module.exports = router