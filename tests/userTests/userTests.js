const request = require('supertest')
const app = require('../../httpServer')
const expect = require('chai').expect

var adminToken = ""
describe("[TEST] /authenticate - testing login with Basic authentication", function() {
    it("Trying to create a token using correct credentials", function(done) {
        request(app)
            .post('/authenticate')
            .set('Authorization', 'Basic ' + new Buffer("admin:123").toString("base64"))
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("admin")
                adminToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })

    it("Trying to use wrong credentials: expecting a 500 status code (error) here", function(done) {
        request(app)
            .post('/authenticate')
            .set('Authorization', 'Basic ' + new Buffer("admin:1234").toString("base64"))
            .end(function(err, res) {
                expect(500)

                if(err) done(err)
                done()
            })
    })
})

describe("[TEST] /user - testing the user endpoint (should only work if authorized and administrator)", function() {
    it("testing without authorization: expecting a 403 status code (error) here", function(done) {
        request(app)
            .get('/user')
            .end(function(err, res) {
                expect(res.status).to.equal(403)

                if(err) done(err)
                done()
            })
    })

    it("testing with authorization: should return one user from the database", function(done) {
        request(app)
            .get('/user')
            .set('Authorization', adminToken)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)
                if(err) done(err)
                done()
            })
    })

    it("Add killah247", function(done) {
        var killah247 = {
            "userID": "killah247",
            "userName": "Stefan Stecher",
            "password": "h4cKm3n0oB"
        }
        request(app)
            .post('/user/')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(killah247)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    var userToken = ""
    it("Logging in as Stefan Stecher", function(done) {
        request(app)
            .post('/authenticate')
            .set('Authorization', 'Basic ' + new Buffer("killah247:h4cKm3n0oB").toString("base64"))
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("killah247")
                userToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })

    it("Trying to modify without admin rights should get a 403 status code (error) here", function(done) {
        var killah247 = {
            "userID": "admin",
            "userName": "I hacked you",
            "password": "y0uR3d0nE"
        }
        request(app)
            .post('/user/')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(killah247)
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })
})

describe("[CLEANUP] Cleaning up database", function() {
    it("Removing killah247 from database", function(done) {
        var killah247 = {
            "userID": "killah247"
        }
        request(app)
            .post('/user/deleteUserByID')
            .set('Authorization', adminToken)
            .set('content-type', 'application/json')
            .send(killah247)
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("Removing admin from database", function(done) {
        var manfred = {
            "userID": "admin"
        }
        request(app)
            .post('/user/deleteUserByID')
            .set('Authorization', adminToken)
            .set('content-type', 'application/json')
            .send(manfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })
})