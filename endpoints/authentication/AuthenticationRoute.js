var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var authenticationService = require('./AuthenticationService')

router.post('/', function(req, res, next) {
    // check for basic auth header
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
        // 401: unauthorized
        logger.error("Error: Missing authorization header")
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
        return res.status(401).send({ error: 'Missing authorization header' })
    }

    // verify auth credentials
    const base64Credentials =  req.headers.authorization.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')

    const userLoginData = {
        "userID": username,
        "password": password
    }
    authenticationService.createSessionToken(userLoginData, function(err, token, user) {
        if(token) {
            res.header("Authorization", "Bearer " + token)

            if(user) {
                // 200: OK
                logger.info("Created token for user " + user.userID)
                res.status(200).send({ "Success": "Token created successfully"})
            }
            else {
                // 500: internal server error
                logger.error("Internal server error: " + err)
                res.status(500).json({ error: err })
            }
        }
        else {
            // 401: unauthorized
            logger.error("Token has not been created. Error: " + err)
            res.status(401).json({ "Error": "Failed to create token: Authentication failed" })
        }
    })
})

module.exports = router