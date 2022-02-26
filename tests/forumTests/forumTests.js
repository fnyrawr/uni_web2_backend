const request = require('supertest')
const app = require('../../httpServer')
const expect = require('chai').expect

var adminToken = ""
var userToken = ""
describe("[PREP] creating users and generating their tokens for forum tests", function() {
    it("Creating token for admin", function(done) {
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

    it("Create manfred", function(done) {
        var manfred = {
            "userID": "manfred",
            "userName": "Manfred Müller",
            "password": "asdf"
        }
        request(app)
            .post('/user/')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(manfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Creating token for manfred", function(done) {
        request(app)
            .post('/authenticate')
            .set('Authorization', 'Basic ' + new Buffer("manfred:asdf").toString("base64"))
            .end(function(err, res) {
                expect(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.userID).to.equal("manfred")
                userToken = res.header.authorization

                if(err) done(err)
                done()
            })
    })
})

describe("[TEST] Testing forum functionalities", function() {
    it("Get all Forums (should be none right now)", function(done) {
        request(app)
            .get('/forum')
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if(err) done(err)
                done()
            })
    })

    it("Add forum owned by admin", function(done) {
        var adminForum = {
            "forumName": "Test Forum",
            "forumDescription": "Forum created by admin for testing purposes",
            "ownerID": "admin"
        }
        request(app)
            .post('/forum/')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(adminForum)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.ownerID).to.equal("admin")

                if(err) done(err)
                done()
            })
    })

    it("Get all Forums (should be 1 right now)", function(done) {
        request(app)
            .get('/forum')
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)

                if(err) done(err)
                done()
            })
    })

    it("Try to modify admin forum with user token - should throw 403 status code (error)", function(done) {
        var adminForum = {
            "forumName": "Test Forum",
            "forumDescription": "Here is Manni",
            "ownerID": "manfred"
        }
        request(app)
            .post('/forum/')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(adminForum)
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Modify admin forum: Change ownership to manfred", function(done) {
        var adminForum = {
            "forumName": "Test Forum",
            "forumDescription": "Forum created by admin for testing purposes",
            "ownerID": "manfred"
        }
        request(app)
            .post('/forum/')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(adminForum)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.ownerID).to.equal("manfred")

                if(err) done(err)
                done()
            })
    })

    it("Try to modify the same forum with user token - should work now\nalthough the owner is set to manfred since he can't transfer ownership as non-admin user", function(done) {
        var adminForum = {
            "forumName": "Test Forum",
            "forumDescription": "Here is Manni",
            "ownerID": "killah247"
        }
        request(app)
            .post('/forum/')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(adminForum)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.ownerID).to.equal("manfred")

                if(err) done(err)
                done()
            })
    })

    it("Try to get Forums without token", function(done) {
        request(app)
            .get('/forum/getByOwnerID')
            .end(function(err, res) {
                expect(res.status).to.equal(403)

                if(err) done(err)
                done()
            })
    })

    it("Get all Forums of manfred with his userToken", function(done) {
        request(app)
            .get('/forum/getByOwnerID')
            .set('Authorization', userToken)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)

                if(err) done(err)
                done()
            })
    })

    it("Get all Forums of manfred with adminToken", function(done) {
        var manfred = {
            "ownerID": "manfred"
        }
        request(app)
            .post('/forum/getByOwnerID')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(manfred)
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)

                if(err) done(err)
                done()
            })
    })
})

describe("[CLEANUP] Cleaning up database", function() {
    it("Removing test forum from database", function(done) {
        var testForum = {
            "forumName": "Test Forum"
        }
        request(app)
            .post('/forum/deleteForumByName')
            .set('Authorization', adminToken)
            .set('content-type', 'application/json')
            .send(testForum)
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("Removing manfred from database", function(done) {
        var manfred = {
            "userID": "manfred"
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

    it("Removing admin from database", function(done) {
        var admin = {
            "userID": "admin"
        }
        request(app)
            .post('/user/deleteUserByID')
            .set('Authorization', adminToken)
            .set('content-type', 'application/json')
            .send(admin)
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })
})