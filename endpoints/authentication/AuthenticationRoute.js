var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var authenticationService = require('./AuthenticationService')

router.post('/', function(req, res, next) {
    // check for basic auth header
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
        return res.status(401).json({ message: 'Missing Authorization Header' })
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
                const { id, userID, userName, email, ...partialObject } = user
                const subset = { id, userID, userName, email }
                console.log(JSON.stringify(subset))
                res.send(subset)
            }
            else {
                logger.error("User is null, even though a token has been created. Error: " + err)
                res.status(500).json({ error: err })
            }
        }
        else {
            logger.error("Token has not been created. Error: " + err)
            res.status(403).json({ error: err })
        }
    })
})

module.exports = router