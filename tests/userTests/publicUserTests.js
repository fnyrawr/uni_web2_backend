const request = require('supertest')
const app = require('../../httpServer')
const expect = require('chai').expect

describe("[TEST] Checking response from /publicUser endpoint", function() {
    it("Status Code should be 200", function(done) {
        request(app)
            .get('/publicUser')
            .end(function (err, res) {
                expect(200)
                if (err) done(err)
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
var hashedPW

describe("[TEST] Tests with admin user", function() {
    it("Add admin and check properties", function(done) {
        var adminUser = {
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
                hashedPW = res.body.password
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("admin")
                expect(res.body.userName).to.equal("Udo Müller")
                expect(res.body.isAdministrator).to.equal(true)

                if(err) done(err)
                done()
            })
    })

    it("Checking if admin user was added to the database", function(done) {
        var adminUser = {
            "userID": "admin"
        }
        request(app)
            .post('/publicUser/getUserByID')
            .set('content-type', 'application/json')
            .send(adminUser)
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("admin")

                if(err) done(err)
                done()
            })
    })

    it("Checking if hash value of password updates on change", function(done) {
        var adminUser = {
            "userID": "admin",
            "password": "12345"
        }
        request(app)
            .post('/publicUser/')
            .set('content-type', 'application/json')
            .send(adminUser)
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("admin")
                expect(res.body.password).to.be.not.equal(hashedPW)

                if(err) done(err)
                done()
            })
    })
})

describe("[TEST] Tests with user manfred", function() {
    it("Add manfred and check properties", function(done) {
        var manfred = {
            "userID": "manfred",
            "userName": "Manfred Mustermann",
            "password": "asdf"
        }
        request(app)
            .post('/publicUser/')
            .set('content-type', 'application/json')
            .send(manfred)
            .end(function(err, res) {
                hashedPW = res.body.password
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("manfred")
                expect(res.body.userName).to.equal("Manfred Mustermann")
                expect(res.body.isAdministrator).to.equal(false)

                if(err) done(err)
                done()
            })
    })

    it("Change name and check properties, hashed password should not have changed", function(done) {
        var manfred = {
            "userID": "manfred",
            "userName": "Manfred Müller"
        }
        request(app)
            .post('/publicUser/')
            .set('content-type', 'application/json')
            .send(manfred)
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("manfred")
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

describe("[CLEANUP] Cleanup operations", function() {
    it("Removing manfred from database", function(done) {
        var manfred = {
            "userID": "manfred"
        }
        request(app)
            .post('/publicUser/deleteUserByID')
            .set('content-type', 'application/json')
            .send(manfred)
            .end(function(err, res) {
                expect(200)

                if(err) done(err)
                done()
            })
    })

    it("Removing admin from database", function(done) {
        var manfred = {
            "userID": "admin"
        }
        request(app)
            .post('/publicUser/deleteUserByID')
            .set('content-type', 'application/json')
            .send(manfred)
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