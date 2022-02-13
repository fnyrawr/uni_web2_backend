const express = require('express')
const bodyParser = require('body-parser')
const database = require('./database/db')

var logger = require('./config/winston')

const testRoutes = require('./endpoints/test/TestRoutes')
const userRoutes = require('./endpoints/user/UserRoute')
const authenticationRoutes = require('./endpoints/authentication/AuthenticationRoute')

const app = express()
app.use(bodyParser.json())

/* Adding Routes */
app.use('/', testRoutes)
app.use('/user', userRoutes)
app.use('/authenticate', authenticationRoutes)

database.initDb(function (err, db) {
    if(db) {
        logger.debug("successfully connected to the database")
    }
    else {
        logger.error("database could not be opened")
    }
})

/* Error Handlers */
app.use(function(req, res, next) {
    res.status(404).send("URL not found")
})

app.use(function(req, res, next) {
    res.status(500).send("Sorry, something broke it seems")
})

const port = 8080

app.listen(port, () => {
    logger.debug('Listening at http://localhost:${port}')
})