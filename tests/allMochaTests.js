const server = require('../httpServer')
const db = require('../database/db')
var logger = require('../config/winston')

describe('/publicUser endpoint Tests', function() {
    logger.info("Starting automated /publicUser endpoint tests")
    require('./userTests/publicUserTests')
})

describe('/authentication and /users endpoint Tests', function() {
    logger.info("Starting automated /authentication, /users and /signup endpoint tests")
    require('./userTests/userTests')
})

describe('/forumThreads, /forumMessage and /comment tests', function() {
    logger.info("Starting automated /forumThreads, /forumMessage and /comment endpoint tests")
    require('./forumTests/forumTests')
})

after(() => {
    logger.info("Shutting down application")
    db.closeDb()
    server.close()
})