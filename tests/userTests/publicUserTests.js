const request = require('supertest')
const app = require('../../httpServer')
const expect = require('chai').expect

describe("[PREP] Cleaning up Database - removing previous users", function() {
    it("Status Code depends if DB got populated before the test, so no checks here", function(done) {
        request(app)
            .delete('/publicUser/deleteAllUsers')
            .end(function (err, res) {
                expect(200)
                if(err) done(err)
                done()
            })
    })
})

describe("[TEST] Checking if DB is empty", function() {
    it("No users should be returned", function(done) {
        request(app)
            .get('/publicUser')
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect([])
                expect(Object.keys(res.body).length).to.equal(0)
                if(err) done(err)
                done()
            })
    })
})

// hashed password to compare changes
var hashedPW = ""

describe("[TEST] Tests with admin user", function() {
    it("Add admin - should throw 409 (conflict) because admin is created by default", function(done) {
        let adminUser = {
            "userID": "admin",
            "userName": "Udo Müller",
            "password": "123",
            "isAdministrator": true
        }
        request(app)
            .post('/publicUser')
            .set('content-type', 'application/json')
            .send(adminUser)
            .end(function(err, res) {
                expect(409)

                if(err) done(err)
                done()
            })
    })

    it("Checking if admin user was added to the database", function(done) {
        request(app)
            .get('/publicUser/admin')
            .end(function(err, res) {
                hashedPW = res.body.password
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("admin")
                expect(res.body.userName).to.equal("Default Administrator Account")
                expect(res.body.email).to.equal("admin@existiert.net")
                expect(res.body.isVerified).to.equal(true)
                expect(res.body.isAdministrator).to.equal(true)
                expect(res.body.confirmationToken).to.equal(null)

                if(err) done(err)
                done()
            })
    })

    it("Checking if values update and hash value of password updates on change", function(done) {
        let adminUser = {
            "userID": "admin",
            "userName": "Udo Müller",
            "password": "12345"
        }
        request(app)
            .put('/publicUser/admin')
            .set('content-type', 'application/json')
            .send(adminUser)
            .end(function(err, res) {
                expect(201)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("admin")
                expect(res.body.userName).to.equal("Udo Müller")
                expect(res.body.password).to.be.not.equal(hashedPW)

                if(err) done(err)
                done()
            })
    })
})

describe("[TEST] Tests with user manfred", function() {
    it("Add manfred and check properties", function(done) {
        let manfred = {
            "userID": "manfred",
            "userName": "Manfred Mustermann",
            "email": "trashmehard@existiert.net",
            "password": "asdf",
            "isVerified": "true"
        }
        request(app)
            .post('/publicUser/')
            .set('content-type', 'application/json')
            .send(manfred)
            .end(function(err, res) {
                hashedPW = res.body.password
                expect(201)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("manfred")
                expect(res.body.userName).to.equal("Manfred Mustermann")
                expect(res.body.isAdministrator).to.equal(false)

                if(err) done(err)
                done()
            })
    })

    it("Change name and check properties, userID and userName changed, hashed password should not have changed", function(done) {
        let manfred = {
            "userID": "freddy",
            "userName": "Manfred Müller"
        }
        request(app)
            .put('/publicUser/manfred')
            .set('content-type', 'application/json')
            .send(manfred)
            .end(function(err, res) {
                expect(201)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("freddy")
                expect(res.body.userName).to.equal("Manfred Müller")
                expect(res.body.password).to.equal(hashedPW)

                if(err) done(err)
                done()
            })
    })

    it("User count should be 2", function(done) {
        request(app)
            .get('/publicUser')
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)
                if(err) done(err)
                done()
            })
    })
})

describe("[TEST] Error handling tests", function() {
    it("Add freddy: expect 409 (conflict): userID already exists", function(done) {
        let freddy = {
            "userID": "freddy",
            "userName": "Fred Feuerstein",
            "email": "flintstonefreddy@existiert.net",
            "password": "qwertz",
            "isVerified": "true"
        }
        request(app)
            .post('/publicUser/')
            .set('content-type', 'application/json')
            .send(freddy)
            .end(function(err, res) {
                expect(409)

                if(err) done(err)
                done()
            })
    })

    it("Try to create a user without ID: expect 400 (bad request)", function(done) {
        var ghost = {
            "userName": "Ghost Face",
            "password": "ghosted"
        }
        request(app)
            .post('/publicUser/')
            .set('content-type', 'application/json')
            .send(ghost)
            .end(function(err, res) {
                expect(400)

                if(err) done(err)
                done()
            })
    })

    it("Try to update a user who doesn't exist: expect 404 (not found)", function(done) {
        var ghost = {
            "userID": "ghostfacekiller",
            "userName": "Ghost Face Killer",
            "password": "ghosted"
        }
        request(app)
            .put('/publicUser/ghostface')
            .set('content-type', 'application/json')
            .send(ghost)
            .end(function(err, res) {
                expect(404)

                if(err) done(err)
                done()
            })
    })

    it("Try to delete a user who doesn't exist: expect 404 (not found)", function(done) {
        request(app)
            .delete('/publicUser/ghostfacekiller')
            .end(function(err, res) {
                expect(404)

                if(err) done(err)
                done()
            })
    })
})

describe("[CLEANUP] Cleanup operations", function() {
    it("Removing freddy from database", function(done) {
        request(app)
            .delete('/publicUser/freddy')
            .end(function(err, res) {
                expect(200)

                if(err) done(err)
                done()
            })
    })

    it("Removing admin from database", function(done) {
        request(app)
            .delete('/publicUser/admin')
            .end(function(err, res) {
                expect(200)

                if(err) done(err)
                done()
            })
    })

    it("User count should be 0", function(done) {
        request(app)
            .get('/publicUser')
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)
                if(err) done(err)
                done()
            })
    })
})