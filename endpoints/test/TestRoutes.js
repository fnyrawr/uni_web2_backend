const express = require('express')
const router = express.Router()

router.get('/', function(request, response) {
    response.send('Hello')
})

router.get('/json', function(request, response) {
    response.json({name: 'JSON Hello'})
})

module.exports = router