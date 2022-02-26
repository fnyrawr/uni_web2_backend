const server = require('../httpServer')
const db = require('../database/db')
const request = require("supertest")
const app = require("../httpServer")
var logger = require('../config/winston')

describe('/publicUser endpoint Tests', function() {
    logger.info("Starting automated /publicUser endpoint tests")
    require('./userTests/publicUserTests')
})

describe('/authentication and /user endpoint Tests', function() {
    logger.info("Starting automated /authentication and /user endpoint tests")
    require('./userTests/userTests')
})

describe('/forum tests', function() {
    logger.info("Starting automated /forum endpoint tests")
    require('./forumTests/forumTests')
})

after(() => {
    logger.info("Shutting down application")
    db.closeDb()
    server.close()
})