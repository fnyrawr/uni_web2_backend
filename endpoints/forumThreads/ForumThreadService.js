const ForumThread = require("./ForumThreadModel")
const userService = require("../user/UserService")
const messageService = require("../forumMessage/ForumMessageService")
var logger = require('../../config/winston')

function getForums(filters, callback) {
    var query = ForumThread.find(filters)
    query.exec(function (err, forums) {
        if(err) {
            logger.error("Error while searching: " + err)
            return callback(err, null)
        }
        else {
            logger.debug("Retrieving Forums")
            return callback(null, forums)
        }
    })
}

function findForumByID(searchID, callback) {
    logger.debug("Trying to find forums for id " + searchID)

    if(!searchID) {
        callback("id is missing")
    }
    else {
        var query = ForumThread.findOne({ _id: searchID })
        query.exec(function(err, forum) {
            if(err) {
                logger.warn("Could not find forums owned by " + searchID)
                callback("Could not find forums owned by " + searchID, null)
            }
            else {
                if(forum) {
                    logger.debug(`Found: ${ searchID }`)
                    callback(null, forum)
                }
                else {
                    logger.warn("Could not find Forums owned by " + searchID)
                    callback("userName " + searchID + " not found", null)
                }
            }
        })
    }
}

function findForumsByOwner(searchUserName, callback) {
    logger.debug("Trying to find forums for " + searchUserName)

    if(!searchUserName) {
        callback("userName is missing", null)
    }
    else {
        var query = ForumThread.find({ ownerID: searchUserName })
        query.exec(function(err, forums) {
            if(err) {
                logger.warn("Could not find forums owned by " + searchUserName)
                callback("Could not find forums owned by " + searchUserName, null)
            }
            else {
                if(forums) {
                    logger.debug(`Found: ${searchUserName}`)
                    callback(null, forums)
                }
                else {
                    logger.warn("Could not find Forums owned by " + searchUserName)
                    callback("userName " + searchUserName + " not found", null)
                }
            }
        })
    }
}

function insertOne(forumProps, user, callback) {
    logger.debug("Trying to create a new forumThreads.")
    // set owner according to props only if requester is admin, otherwise owner is user
    var forumOwnerID = forumProps.ownerID
    userService.getIsAdmin(user, (err, adminStatus) => {
        if(!forumOwnerID || !adminStatus) {
            logger.warn("no owner for the new forumThreads specified OR " + user + " is no admin: setting " + user + " as the owner of " + forumProps.forumName)
            forumOwnerID = user
        }

        var newForum = new ForumThread({
            name: forumProps.name,
            description: forumProps.description,
            ownerID: forumOwnerID,
            timestamp: new Date().toLocaleString()
        })

        newForum.save(function(err, newForum) {
            if(err) {
                logger.error("Could not create forumThreads: " + err)
                return callback("Could not create forumThreads: " + err, null)
            }
            else {
                return callback(null, newForum)
            }
        })
    })
}

function updateOne(forum, forumProps, user, callback) {
    logger.debug("Trying to update forumThreads with forumName: " + forum.name)
    // set owner according to props only if requester is admin, otherwise owner is user
    var forumOwnerID = forumProps.ownerID
    userService.getIsAdmin(user, (err, adminStatus) => {
        if(!forumOwnerID || !adminStatus) {
            logger.warn("no owner for the new forumThreads specified OR " + user + " is no admin: setting " + user + " as the owner of " + forumProps.name)
            forumOwnerID = user
        }

        if(forumProps.name) {
            forum.name = forumProps.name
        }
        if(forumProps.description) {
            forum.description = forumProps.description
        }
        if(forumProps.ownerID) {
            forum.ownerID = forumOwnerID
        }

        forum.save(function(err, forum) {
            if(err) {
                logger.error("Could not update forumThreads: " + err)
                return callback("Could not update forumThreads: " + err, null)
            }
            else {
                return callback(null, forum)
            }
        })
    })
}

function deleteOne(forum, callback) {
    logger.debug("Trying to delete forumThread with name: " + forum.name)

    messageService.deleteMessagesOfForum(forum._id, function(err, deleted) {
        if(err || !deleted) {
            logger.error("Could not delete messages of forumThread with name " + forum.name)
            return callback(err, null)
        }
        forum.remove(function (err) {
            if (err) {
                logger.error("Error while deletion of forumThread with name: " + forum.name)
                callback("Error while deletion: " + err, null)
            } else {
                callback(null, true)
            }
        })
    })
}

module.exports = {
    getForums,
    findForumByID,
    findForumsByOwner,
    insertOne,
    updateOne,
    deleteOne
}