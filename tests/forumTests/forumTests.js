const request = require('supertest')
const app = require('../../HttpServer')
const config = require("config");
const jwt = require("jsonwebtoken");
const expect = require('chai').expect

var adminToken = ""
var userToken = ""
describe("[PREP] creating users and generating their tokens for forumThreads tests", function() {
    it("Creating token for admin", function(done) {
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

    it("Add manfred by admin", function(done) {
        var manfred = {
            "userID": "manfred",
            "userName": "Manfred Müller",
            "password": "asdf",
            "email": "trashmehard@existiert.net",
            "isVerified": true
        }
        request(app)
            .post('/users')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(manfred)
            .end(function(err, res) {
                expect(res.status).to.equal(201)
                expect(res.body.userID).to.equal("manfred")
                expect(res.body.userName).to.equal("Manfred Müller")
                expect(res.body.email).to.equal("trashmehard@existiert.net")
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
})

var testForumID = ""
describe("[TEST] Testing forumThreads functionalities", function() {
    it("Get all Forums (should be none right now)", function(done) {
        request(app)
            .get('/forumThreads')
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if(err) done(err)
                done()
            })
    })

    it("Add forumThread owned by admin", function(done) {
        var adminForum = {
            "name": "Test Forum",
            "description": "Forum created by admin for testing purposes",
            "ownerID": "admin"
        }
        request(app)
            .post('/forumThreads/')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(adminForum)
            .end(function(err, res) {
                testForumID = res.body._id
                expect(res.status).to.equal(201)
                expect('content-type', 'application/json; charset=utf-8')
                expect(res.body.ownerID).to.equal("admin")

                if(err) done(err)
                done()
            })
    })

    it("Add forumThread without name (400 - bad request)", function(done) {
        var adminForum = {
            "description": "Forum created without name",
            "ownerID": "admin"
        }
        request(app)
            .post('/forumThreads/')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(adminForum)
            .end(function(err, res) {
                expect(res.status).to.equal(400)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Get all Forums (should be 1 right now)", function(done) {
        request(app)
            .get('/forumThreads')
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)

                if(err) done(err)
                done()
            })
    })

    it("Try to modify admin forumThreads with user token - should throw 403 status code (error)", function(done) {
        var adminForum = {
            "name": "Test Forum",
            "description": "Here is Manni",
            "ownerID": "manfred"
        }
        request(app)
            .put('/forumThreads/' + testForumID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(adminForum)
            .end(function(err, res) {
                expect(res.status).to.equal(403)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("Modify admin forumThreads: Change ownership to manfred", function(done) {
        var adminForum = {
            "name": "Test Forum",
            "ownerID": "manfred"
        }
        request(app)
            .put('/forumThreads/' + testForumID)
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

    it("Try to modify the same forumThreads with user token - should work now\nalthough the owner is set to manfred since he can't transfer ownership as non-admin user", function(done) {
        var adminForum = {
            "name": "Test Forum",
            "description": "Here is Manni",
            "ownerID": "killah247"
        }
        request(app)
            .put('/forumThreads/' + testForumID)
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

    it("Try to get myForums by ownerID without token", function(done) {
        request(app)
            .get('/forumThreads/myForums')
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("Get all Forums of manfred with his userToken", function(done) {
        request(app)
            .get('/forumThreads/myForums')
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
        request(app)
            .get('/forumThreads/?ownerID="manfred"')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)

                if(err) done(err)
                done()
            })
    })

    it("Get all Forums of admin with userToken", function(done) {
        request(app)
            .get('/forumThreads/?ownerID="admin"')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if(err) done(err)
                done()
            })
    })
})

var message1ID = ""
var message2ID = ""
var message3ID = ""
describe("[TEST] Testing forumMessage functionalities", function() {
    it("get all messages without token, no restrictions on reading", function(done) {
        request(app)
            .get('/forumMessages')
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if (err) done(err)
                done()
            })
    })

    it("get all messages with user token, no restrictions on reading", function(done) {
        request(app)
            .get('/forumMessages')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if (err) done(err)
                done()
            })
    })

    it("get all messages with admin token", function(done) {
        request(app)
            .get('/forumMessages')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if (err) done(err)
                done()
            })
    })

    it("Create a message with adminToken", function(done) {
        var adminMessage = {
            "forumThreadID": testForumID,
            "title": "Welcome Manni",
            "text": "Welcome Manfred to our website. Enjoy your time in our forumThreads."
        }
        request(app)
            .post('/forumMessages')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(adminMessage)
            .end(function(err, res) {
                message1ID = res.body._id
                expect(res.status).to.equal(201)

                if(err) done(err)
                done()
            })
    })

    it("Create a message with userToken", function(done) {
        var userMessage = {
            "forumThreadID": testForumID,
            "title": "Thank you Admin",
            "text": "Hi Admin, nice to meet you too."
        }
        request(app)
            .post('/forumMessages')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(userMessage)
            .end(function(err, res) {
                message2ID = res.body._id
                expect(res.status).to.equal(201)

                if(err) done(err)
                done()
            })
    })

    it("Edit a message with userToken", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "title": "Thank you Admin",
            "text": "Hi Admin, nice to meet you too. I hope I can have a great time here."
        }
        request(app)
            .put('/forumMessages/' + message2ID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("Edit a user message with adminToken (moderation test)", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "title": "Thank you Admin",
            "text": "Hi Admin, nice to meet you too. I hope WE have a great time here. ;)"
        }
        request(app)
            .put('/forumMessages/' + message2ID)
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("Try to edit an admin message with userToken (403 - not enough rights)", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "title": "Heya",
            "text": "Can I edit admin comments?"
        }
        request(app)
            .put('/forumMessages/' + message1ID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(403)

                if(err) done(err)
                done()
            })
    })

    it("Another user message for testing purposes", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "title": "What is it about",
            "text": "By the way, what is this Forum actually good for?"
        }
        request(app)
            .post('/forumMessages')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                message3ID = res.body._id
                expect(res.status).to.equal(201)

                if(err) done(err)
                done()
            })
    })

    it("Try to add the same message twice (409 - conflict)", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "title": "What is it about",
            "text": "Can I add the same message twice?"
        }
        request(app)
            .post('/forumMessages')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(409)

                if(err) done(err)
                done()
            })
    })

    it("Try to add a message without a title (400 - bad request)", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "text": "This message has no title"
        }
        request(app)
            .post('/forumMessages')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(400)

                if(err) done(err)
                done()
            })
    })

    it("Try to add a message without a forumThreadID (400 - bad request)", function(done) {
        var message = {
            "title": "No ForumThreadID",
            "text": "Does this work out?"
        }
        request(app)
            .post('/forumMessages')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(400)

                if(err) done(err)
                done()
            })
    })

    it("Try to add a message without a text (400 - bad request)", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "title": "Who needs a text anyways?",
        }
        request(app)
            .post('/forumMessages')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(400)

                if(err) done(err)
                done()
            })
    })

    it("Get message by ID", function(done) {
        var message = {
            "forumThreadID": testForumID,
            "title": "What is it about",
            "text": "By the way, what is this Forum actually good for?"
        }
        request(app)
            .get('/forumMessages/' + message3ID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function(err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')

                if(err) done(err)
                done()
            })
    })

    it("get all messages with admin token (should be 3 messages now)", function(done) {
        request(app)
            .get('/forumMessages')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(3)

                if (err) done(err)
                done()
            })
    })

    it("get all messages of manfred (should be 2 messages now)", function(done) {
        request(app)
            .get('/forumMessages/?authorID="manfred"')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send({ userID: "manfred" })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)

                if (err) done(err)
                done()
            })
    })

    it("delete message What is it about with user token (owner is manfred)", function(done) {
        request(app)
            .delete('/forumMessages/' + message3ID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)

                if (err) done(err)
                done()
            })
    })

    it("delete message Welcome Manni with user token (owner is admin) - expecting 403 status code (error) here", function(done) {
        request(app)
            .delete('/forumMessages/' + message1ID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(403)

                if (err) done(err)
                done()
            })
    })

    it("get all messages of Test Forum (should be 2 messages now)", function(done) {
        request(app)
            .get('/forumMessages/?forumThreadID=' + testForumID)
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)

                if (err) done(err)
                done()
            })
    })

    it("get all messages of Test Forum by URL /forumThreads/:id/forumMessages", function(done) {
        request(app)
            .get('/forumThreads/' + testForumID + '/forumMessages')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)

                if (err) done(err)
                done()
            })
    })
})

var comment1ID = ''
var comment2ID = ''
var comment3ID = ''
describe("[TEST] Testing comment functionalities", function() {
    it("Comment on message Welcome Manni as manfred", function(done) {
        var message = {
            "messageID": message1ID,
            "text": "Why can't I delete messages? @admin"
        }
        request(app)
            .post('/comments')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                comment1ID = res.body._id
                expect(res.status).to.equal(201)

                if(err) done(err)
                done()
            })
    })

    it("Answer a comment as admin", function(done) {
        var message = {
            "messageID": message1ID,
            "text": "Because you can only delete your own messages. @manfred"
        }
        request(app)
            .post('/comments')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                comment2ID = res.body._id
                expect(res.status).to.equal(201)

                if(err) done(err)
                done()
            })
    })

    it("Create another comment as manfred", function(done) {
        var message = {
            "messageID": message1ID,
            "text": "Oh, I see."
        }
        request(app)
            .post('/comments')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                comment3ID = res.body._id
                expect(res.status).to.equal(201)

                if(err) done(err)
                done()
            })
    })

    it("Modifying the last comment as admin", function(done) {
        var message = {
            "text": "Oh, I see. Really?"
        }
        request(app)
            .put('/comments/' + comment3ID)
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send(message)
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("get all comments of Message Welcome Manni (should be 3 comments now)", function(done) {
        request(app)
            .get('/comments/?messageID=' + message1ID)
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(3)

                if (err) done(err)
                done()
            })
    })

    it("get all comments of manfred (should be 2 comments now)", function(done) {
        request(app)
            .get('/comments/?authorID="manfred')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)

                if (err) done(err)
                done()
            })
    })

    it("delete last comment of Welcome Manni with user token (owner is user)", function(done) {
        request(app)
            .delete('/comments/' + comment3ID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)

                if (err) done(err)
                done()
            })
    })

    it("get all comments of Message Welcome Manni (should be 2 comments now)", function(done) {
        request(app)
            .get('/forumMessages/' + message1ID + '/comments')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)

                if (err) done(err)
                done()
            })
    })

    it("Create a duplicate comment - no issues here", function(done) {
        var comment = {
            "messageID": message1ID,
            "text": "Why can't I delete messages? @admin"
        }
        request(app)
            .post('/comments')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(comment)
            .end(function(err, res) {
                expect(res.status).to.equal(201)

                if(err) done(err)
                done()
            })
    })

    it("Create a message without messageID (400 - bad request)", function(done) {
        var comment = {
            "text": "Random comment"
        }
        request(app)
            .post('/comments')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(comment)
            .end(function(err, res) {
                expect(res.status).to.equal(400)

                if(err) done(err)
                done()
            })
    })

    it("Create a comment without text (400 - bad request)", function(done) {
        var comment = {
            "messageID": message1ID
        }
        request(app)
            .post('/comments')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .send(comment)
            .end(function(err, res) {
                expect(res.status).to.equal(400)

                if(err) done(err)
                done()
            })
    })

    it("get all comments of Message Welcome Manni (should be 3 comments now)", function(done) {
        request(app)
            .get('/comments/?messageID=' + message1ID)
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(3)

                if (err) done(err)
                done()
            })
    })

    it("get all comments of manfred (should be 2 comments now)", function(done) {
        request(app)
            .get('/comments/?authorID="manfred"')
            .set({ 'Authorization': userToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)

                if (err) done(err)
                done()
            })
    })
})

describe("[CLEANUP] Cleaning up database", function() {
    it("get all forums (should be 1 now)", function(done) {
        request(app)
            .get('/forumThreads')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(1)

                if (err) done(err)
                done()
            })
    })

    it("get all messages (should be 2 now)", function(done) {
        request(app)
            .get('/forumThreads/' + testForumID + '/forumMessages')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(2)

                if (err) done(err)
                done()
            })
    })

    it("Removing test forumThread from database", function(done) {
        request(app)
            .delete('/forumThreads/' + testForumID)
            .set('Authorization', adminToken)
            .set('content-type', 'application/json')
            .end(function(err, res) {
                expect(res.status).to.equal(200)

                if(err) done(err)
                done()
            })
    })

    it("get all forums (should be 0 now)", function(done) {
        request(app)
            .get('/forumThreads')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if (err) done(err)
                done()
            })
    })

    it("checking if messages got deleted with the forumThreads aswell", function(done) {
        request(app)
            .get('/forumMessages/')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .send({ forumID: "Test Forum" })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if (err) done(err)
                done()
            })
    })

    it("checking if comments got deleted with the forumThreads and messages aswell", function(done) {
        request(app)
            .get('/comments')
            .set({ 'Authorization': adminToken, 'content-type': 'application/json' })
            .end(function (err, res) {
                expect(res.status).to.equal(200)
                expect('content-type', 'application/json; charset=utf-8')
                expect(Object.keys(res.body).length).to.equal(0)

                if (err) done(err)
                done()
            })
    })

    it("Removing manfred from database", function(done) {
        request(app)
            .delete('/users/manfred')
            .set('Authorization', adminToken)
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

    it("Cleanup recheck: user count should be 0 by now", function(done) {
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