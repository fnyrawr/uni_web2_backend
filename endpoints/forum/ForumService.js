const Forum = require("./ForumModel")
const userService = require("../user/UserService")
const messageService = require("../forumMessage/ForumMessageService")
var logger = require('../../config/winston')

function getForums(callback) {
    Forum.find(function (err, forums) {
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

function findForumByName(searchForumName, callback) {
    logger.debug("Trying to find forumName " + searchForumName)

    if(!searchForumName) {
        callback("forumName is missing")
    }
    else {
        var query = Forum.findOne({ forumName: searchForumName })
        query.exec(function(err, forum) {
            if(err) {
                logger.warn("Could not find forum for forumName: " + searchForumName)
                callback("Could not find forum for forumName: " + searchForumName, null)
            }
            else {
                if(forum) {
                    logger.debug(`Found forumName: ${searchForumName}`)
                    callback(null, forum)
                }
                else {
                    logger.warn("Could not find Forum for forumName: " + searchForumName)
                    callback("ForumName " + searchForumName + " not found", null)
                }
            }
        })
    }
}

function findForumsByOwner(searchUserName, callback) {
    logger.debug("Trying to find forums for " + searchUserName)

    if(!searchUserName) {
        callback("userName is missing")
    }
    else {
        var query = Forum.find({ ownerID: searchUserName })
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
    logger.debug("Trying to create a new forum.")
    // set owner according to props only if requester is admin, otherwise owner is user
    var forumOwnerID = forumProps.ownerID
    userService.getIsAdmin(user, (err, adminStatus) => {
        if(!forumOwnerID || !adminStatus) {
            logger.warn("no owner for the new forum specified OR " + user + " is no admin: setting " + user + " as the owner of " + forumProps.forumName)
            forumOwnerID = user
        }

        var newForum = new Forum({
            forumName: forumProps.forumName,
            forumDescription: forumProps.forumDescription,
            ownerID: forumOwnerID,
            timestamp: new Date().toLocaleString()
        })

        newForum.save(function(err, newForum) {
            if(err) {
                logger.error("Could not create forum: " + err)
                return callback("Could not create forum: " + err, null)
            }
            else {
                return callback(null, newForum)
            }
        })
    })
}

function updateOne(forum, forumProps, user, callback) {
    logger.debug("Trying to update forum with forumName: " + forum.forumName)
    // set owner according to props only if requester is admin, otherwise owner is user
    var forumOwnerID = forumProps.ownerID
    userService.getIsAdmin(user, (err, adminStatus) => {
        if(!forumOwnerID || !adminStatus) {
            logger.warn("no owner for the new forum specified OR " + user + " is no admin: setting " + user + " as the owner of " + forumProps.forumName)
            forumOwnerID = user
        }

        if(forumProps.forumName) {
            forum.forumName = forumProps.forumName
        }
        if(forumProps.forumDescription) {
            forum.forumDescription = forumProps.forumDescription
        }
        if(forumProps.ownerID) {
            forum.ownerID = forumOwnerID
        }

        forum.save(function(err, forum) {
            if(err) {
                logger.error("Could not update forum: " + err)
                return callback("Could not update forum: " + err, null)
            }
            else {
                return callback(null, forum)
            }
        })
    })
}

function deleteOne(forumName, user, callback) {
    logger.debug("Trying to delete forum with forumName: " + forumName)

    // only delete if user is owner or admin
    userService.getIsAdmin(user, function (err, adminStatus) {
        findForumByName(forumName, function(err, forum){
            if(forum) {
                if (forum.ownerID === user || adminStatus) {
                    messageService.deleteMessagesOfForum(forumName, function(err, deleted) {
                        if(err || !deleted) {
                            logger.error("Could not delete messages of forum with forumName " + forumName)
                            return callback(err, null)
                        }
                        forum.remove(function (err) {
                            if (err) {
                                logger.error("Error while deletion of forum with forumName: " + forumName)
                                callback("Error while deletion", null)
                            } else {
                                callback(null, "Deleted Forum " + forumName)
                            }
                        })
                    })
                }
                else {
                    logger.error("Error: Not enough rights to delete forum " + forumName)
                    callback("Not enough rights to delete forum " + forumName, null)
                }
            }
            else {
                logger.error("Deletion of forum with forumName: " + forumName + " failed: Forum not found")
                callback("Could not delete forum " + forumName + ": Forum not found", null)
            }
        })
    })
}

module.exports = {
    getForums,
    findForumByName,
    findForumsByOwner,
    insertOne,
    updateOne,
    deleteOne
}