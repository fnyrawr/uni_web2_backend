const express = require('express')
const bodyParser = require('body-parser')
const database = require('./database/db')

const app = express()
app.use(bodyParser.json())

var logger = require('./config/winston')

const publicUserRoutes = require('./endpoints/user/PublicUserRoute')
const userRoutes = require('./endpoints/user/UserRoute')
const forumRoutes = require('./endpoints/forum/ForumRoute')
const forumMessageRoutes = require('./endpoints/forumMessage/ForumMessageRoute')
const commentRoutes = require('./endpoints/comments/CommentsRoute')
const authenticationRoutes = require('./endpoints/authentication/AuthenticationRoute')
const signupRoutes = require('./endpoints/signup/SignupRoute')

/* Adding Routes */
app.use('/publicUser', publicUserRoutes)
app.use('/user', userRoutes)
app.use('/forum', forumRoutes)
app.use('/forumMessage', forumMessageRoutes)
app.use('/comment', commentRoutes)
app.use('/authenticate', authenticationRoutes)
app.use('/signup', signupRoutes)

database.initDb(function (err, db) {
    if(db) {
        logger.debug("Connected to the database")
    }
    else {
        logger.error("Error while trying to connect to the database")
    }
})

/* Error Handlers */
app.use(function(req, res, next) {
    logger.warn("Status 404: URL not found")
    res.status(404).send("URL not found")
})

app.use(function(req, res, next) {
    logger.error("Status 500: Internal server error")
    res.status(500).send("Internal server error")
})

const port = 8080

const server = app.listen(port, () => {
    logger.debug('Listening at http://localhost:${port}')
})

module.exports = server