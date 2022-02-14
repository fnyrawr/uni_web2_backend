const server = require('../httpServer')
const db = require('../database/db')
const request = require("supertest")
const app = require("../httpServer")
var logger = require('../config/winston')

describe('PublicUser Endpoint Tests', function() {
    logger.info("Starting automated tests")
    require('./userTests/userTests')
})

after(() => {
    logger.info("Shutting down application")
    db.closeDb()
    server.close()
})