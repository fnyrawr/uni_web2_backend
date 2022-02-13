var express = require('express')
var router = express.Router()
var logger = require('../../config/winston')

var userService = require("./UserService")

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

module.exports = router