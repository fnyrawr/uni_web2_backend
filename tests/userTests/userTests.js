const request = require('supertest')
const app = require('../../HttpServer')
const config = require("config");
const jwt = require("jsonwebtoken");
const expect = require('chai').expect

var adminToken = ""
var userToken = ""
describe("[TEST] /authenticate - testing login with Basic authentication", function() {
    it("Trying to create a token using correct credentials to create adminToken", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("admin:123").toString("base64"))
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                adminToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })

    it("Trying to use wrong credentials: expecting a 401 status code (unauthorized) here", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("admin:1234").toString("base64"))
            .end(function(err, res) {
                expect(401)

                if(err) done(err)
                done()
            })
    })
})

describe("[TEST] /users - testing the users endpoint (should only work if authorized and administrator)", function() {
    it("testing without authorization: expecting a 401 status code (unauthorized) here", function(done) {
        request(app)
            .get('/users')
            .end(function(err, res) {
                expect(res.status).to.equal(401)

                if(err) done(err)
                done()
            })
    })

    it("Testing with authorization: should return one user from the database", function(done) {
        request(app)
            .get('/users')
            .set('Authorization', adminToken)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)
                if(err) done(err)
                done()
            })
    })

    it("Add killah247 by admin", function(done) {
        var killah247 = {
            "userID": "killah247",
            "userName": "Stefan Stecher",
            "password": "h4cKm3n0oB",
            "email": "iN00b@trash-me.com",
            "isVerified": true
        }
        request(app)
            .post('/users')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(killah247)
            .end(function(err, res) {
                expect(res.status).to.equal(201)
                expect(res.body.userID).to.equal("killah247")
                expect(res.body.userName).to.equal("Stefan Stecher")
                expect(res.body.email).to.equal("iN00b@trash-me.com")
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Add bigsmoke by admin", function(done) {
        var bigsmoke = {
            "userID": "bigsmoke",
            "userName": "Big Smoke",
            "password": "ballasSnitch",
            "email": "youpickedthewronghouse@fool.me",
            "isVerified": true
        }
        request(app)
            .post('/users')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(bigsmoke)
            .end(function(err, res) {
                expect(res.status).to.equal(201)
                expect(res.body.userID).to.equal("bigsmoke")
                expect(res.body.userName).to.equal("Big Smoke")
                expect(res.body.email).to.equal("youpickedthewronghouse@fool.me")
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to fetch other user with admin rights should get a 200 status code (ok) here", function(done) {
        request(app)
            .get('/users/bigsmoke')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect(res.body.userID).to.equal("bigsmoke")
                expect(res.body.userName).to.equal("Big Smoke")
                expect(res.body.email).to.equal("youpickedthewronghouse@fool.me")
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Logging in as Stefan Stecher to create userToken", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("killah247:h4cKm3n0oB").toString("base64"))
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                userToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })

    it("Trying to add ghostface by user should get a 403 status code (forbidden) here", function(done) {
        var ghostface = {
            "userID": "ghostface",
            "userName": "Scream McBeam",
            "password": "br0oO",
            "email": "mi@ni.me"
        }
        request(app)
            .post('/users')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(ghostface)
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to fetch other user without admin rights should get a 403 status code (forbidden) here", function(done) {
        request(app)
            .get('/users/bigsmoke')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to fetch oneself without admin rights should get a 200 status code (ok) here", function(done) {
        request(app)
            .get('/users/killah247')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect(res.body.userID).to.equal("killah247")
                expect(res.body.userName).to.equal("Stefan Stecher")
                expect(res.body.email).to.equal("iN00b@trash-me.com")
                expect(res.body.isVerified).to.equal(true)
                expect(res.body.isAdministrator).to.equal(false)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to modify other users without admin rights should get a 403 status code (forbidden) here", function(done) {
        var modifiedBigsmoke = {
            "userID": "ghostface",
            "userName": "Scream McBeam",
            "password": "br0oO",
            "email": "mi@ni.me"
        }
        request(app)
            .put('/users/bigsmoke')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedBigsmoke)
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to modify oneself without admin rights should get a 201 status code (ok) here", function(done) {
        var modifiedKillah247 = {
            "userID": "ghostface",
            "userName": "Scream McBeam",
            "password": "br0oO",
            "email": "mi@ni.me"
        }
        request(app)
            .put('/users/killah247')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedKillah247)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to rename oneself back after changing credentials should get a 401 status code (unauthorized) here", function(done) {
        var modifiedGhostface = {
            "userID": "killah247",
            "userName": "Stefan Stecher",
            "password": "h4cKm3n0oB",
            "email": "iN00b@trash-me.com"
        }
        request(app)
            .put('/users/ghostface')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedGhostface)
            .end(function(err, res) {
                expect(res.status).to.equal(401)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to login as Scream McBeam to create new userToken (401 - unauthorized: need to verify after changes)", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("ghostface:br0oO").toString("base64"))
            .end(function(err, res) {
                expect(res.status).to.equal(401)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Re-Enabling (verifying) ghostface as admin that he can login", function(done) {
        var modifiedGhostface = {
            "isVerified": true
        }
        request(app)
            .put('/users/ghostface')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(modifiedGhostface)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Logging in as Scream McBeam to create new userToken", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("ghostface:br0oO").toString("base64"))
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                userToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })

    it("Trying to rename oneself back with new token should get a 404 status code (not found) here", function(done) {
        var modifiedGhostface = {
            "userID": "killah247",
            "userName": "Stefan Stecher",
            "password": "h4cKm3n0oB",
            "email": "iN00b@trash-me.com"
        }
        request(app)
            .put('/users/killah247')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedGhostface)
            .end(function(err, res) {
                expect(res.status).to.equal(404)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })


    it("Trying to delete other users without admin rights should get a 403 status code (forbidden) here", function(done) {
        request(app)
            .delete('/users/bigsmoke')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to delete oneself without admin rights should get a 200 status code (ok) here", function(done) {
        request(app)
            .delete('/users/ghostface')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying to change users with admin rights should get a 201 status code (created) here", function(done) {
        var modifiedBigsmoke = {
            "userID": "ryder",
            "userName": "Ryder",
            "password": "ballasSnitch",
            "email": "youpickedthewronghouse@fool.me",
            "isVerified": true
        }
        request(app)
            .put('/users/bigsmoke')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(modifiedBigsmoke)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("ryder")
                expect(res.body.userName).to.equal("Ryder")

                if(err) done(err)
                done()
            })
    })

    it("Trying to delete users with admin rights should get a 200 status code (ok) here", function(done) {
        request(app)
            .delete('/users/ryder')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    var confirmationToken = ""
    it("Create manfred via signup", function(done) {
        var manfred = {
            "userID": "manfred",
            "userName": "Manfred Müller",
            "password": "asdf",
            "email": "trashmehard@existiert.net"
        }
        // recreate token for testing purposes
        var issuedAt = new Date().getTime()
        var expirationTime = config.get('verification.timeout')
        var expiresAt = issuedAt + (expirationTime * 1000)
        var privateKey = config.get('verification.tokenKey')
        confirmationToken = Buffer.from(jwt.sign({ "email": "trashmehard@existiert.net" }, privateKey, { expiresIn: expiresAt, algorithm: 'HS256' })).toString("base64")
        request(app)
            .post('/signup')
            .set({ 'content-type': 'application/json' })
            .send(manfred)
            .end(function(err, res) {
                expect(res.status).to.equal(201)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Try to create a token for manfred (not verified yet) - expecting 403 status code (error) here", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("manfred:asdf").toString("base64"))
            .end(function(err, res) {
                expect(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Verify manfred with confirmationToken", function(done) {
        var route = '/signup/confirm/' + confirmationToken
        request(app)
            .get(route)
            .set({ 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Creating token for manfred", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("manfred:asdf").toString("base64"))
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                userToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })

    it("Try to verify manfred with confirmationToken for a 2nd time - should throw a 400 status code (bad request) here", function(done) {
        request(app)
            .get('/signup/confirm/' + confirmationToken)
            .set({ 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(400)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Changing email address - should work but user has to re-verify himself after changes", function(done) {
        var modifiedManfred = {
            "email": "manni@trash-me.com"
        }
        request(app)
            .put('/users/manfred')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedManfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Try changing password - should throw 401 (unauthorized) due to pending re-verification", function(done) {
        // recreate token for testing purposes
        var issuedAt = new Date().getTime()
        var expirationTime = config.get('verification.timeout')
        var expiresAt = issuedAt + (expirationTime * 1000)
        var privateKey = config.get('verification.tokenKey')
        confirmationToken = Buffer.from(jwt.sign({ "email": "manni@trash-me.com" }, privateKey, { expiresIn: expiresAt, algorithm: 'HS256' })).toString("base64")
        var modifiedManfred = {
            "email": "manni@trash-me.com"
        }
        request(app)
            .put('/users/manfred')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedManfred)
            .end(function(err, res) {
                expect(res.status).to.equal(401)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Verify manfred with confirmationToken", function(done) {
        var route = '/signup/confirm/' + confirmationToken
        request(app)
            .get(route)
            .set({ 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Try changing password - should work now but will unverify user again due to changes", function(done) {
        var modifiedManfred = {
            "password": "qwertz"
        }
        request(app)
            .put('/users/manfred')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedManfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Re-Verify manfred by admin", function(done) {
        var modifiedManfred = {
            "isVerified": true
        }
        request(app)
            .put('/users/manfred')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(modifiedManfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Logging in as manfred to recheck if verified and to create a new token after changes", function(done) {
        request(app)
            .get('/authenticate')
            .set('Authorization', 'Basic ' + Buffer.from("manfred:qwertz").toString("base64"))
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                userToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })

    it("Making manfred admin", function(done) {
        var modifiedManfred = {
            "isAdministrator": true
        }
        request(app)
            .put('/users/manfred')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(modifiedManfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Changing other admin account with manfred, who is also admin now", function(done) {
        var modifiedAdmin = {
            "userName": "Udo Mustermann"
        }
        request(app)
            .put('/users/admin')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedAdmin)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userName).to.equal("Udo Mustermann")

                if(err) done(err)
                done()
            })
    })

    it("Removing admin rights for manfred as himself", function(done) {
        var modifiedManfred = {
            "isAdministrator": false
        }
        request(app)
            .put('/users/manfred')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedManfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Trying modify admin now (403 - forbidden)", function(done) {
        var modifiedAdmin = {
            "isAdministrator": false
        }
        request(app)
            .put('/users/admin')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(modifiedAdmin)
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })
})

describe("[CLEANUP] Cleaning up database", function() {
    it("Removing manfred from database", function(done) {
        request(app)
            .delete('/users/manfred')
            .set('Authorization', userToken)
            .set('content-type', 'application/json')
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("Removing admin from database", function(done) {
        request(app)
            .delete('/users/admin')
            .set('Authorization', adminToken)
            .set('content-type', 'application/json')
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("Recheck: User count should be 0 by now", function(done) {
        request(app)
            .get('/publicUsers')
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)
                if(err) done(err)
                done()
            })
    })
})