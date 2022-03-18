const Messages = require("./ForumMessageModel")
const userService = require("../user/UserService")
const commentService = require("../comments/CommentsService")
var logger = require('../../config/winston')

// Admin-Function: getting ALL forumThreads messages regardless of forums
function getForumMessages(filters, callback) {
    var query = Messages.find(filters)
    query.exec(function (err, forums) {
        if(err) {
            logger.error("Error while searching: " + err)
            return callback(err, null)
        }
        else {
            logger.debug("Retrieving ForumMessages")
            return callback(null, forums)
        }
    })
}

// find messages belonging to a forumThreads
function findMessagesByForumThreadID(forumThreadID, callback) {
    logger.debug("Trying to find messages for forumID " + forumThreadID)

    if(!forumThreadID) {
        callback("forumID is missing", null)
    }
    else {
        var query = Messages.find({ forumThreadID: forumThreadID })
        query.exec(function(err, messages) {
            if(err) {
                logger.warn("Could not find messages for forumID: " + forumThreadID)
                callback("Could not find messages for forumID: " + forumThreadID, null)
            }
            else {
                if(messages) {
                    logger.debug(`Found forumID: ${ forumThreadID }`)
                    callback(null, messages)
                }
                else {
                    logger.warn("Could not find messages for forumID: " + forumThreadID)
                    callback("ForumID " + forumThreadID + " not found", null)
                }
            }
        })
    }
}

// find message by title
function findMessageByTitle(searchMessageTitle, callback) {
    logger.debug("Trying to find messages for messageTitle " + searchMessageTitle)

    if(!searchMessageTitle) {
        callback("messageTitle is missing")
    }
    else {
        var query = Messages.findOne({ title: searchMessageTitle })
        query.exec(function(err, message) {
            if(err) {
                logger.warn("Could not find message for messageTitle: " + searchMessageTitle)
                callback("Could not find message for messageTitle: " + searchMessageTitle, null)
            }
            else {
                if(message) {
                    logger.debug(`Found messageTitle: ${ searchMessageTitle }`)
                    callback(null, message)
                }
                else {
                    logger.debug("Could not find message for messageTitle: " + searchMessageTitle)
                    callback("MessageTitle " + searchMessageTitle + " not found", null)
                }
            }
        })
    }
}

// find message by title
function findMessageByID(searchMessageID, callback) {
    logger.debug("Trying to find messages for id " + searchMessageID)

    if(!searchMessageID) {
        callback("id is missing")
    }
    else {
        var query = Messages.findOne({ _id: searchMessageID })
        query.exec(function(err, message) {
            if(err) {
                logger.warn("Could not find message for id: " + searchMessageID)
                callback("Could not find message for id: " + searchMessageID, null)
            }
            else {
                if(message) {
                    logger.debug(`Found id: ${ searchMessageID }`)
                    callback(null, message)
                }
                else {
                    logger.debug("Could not find message for id: " + searchMessageID)
                    callback("id " + searchMessageID + " not found", null)
                }
            }
        })
    }
}

function insertOne(messageProps, user, callback) {
    logger.debug("Trying to create a new message")
    // set owner according to props only if requester is admin, otherwise owner is user
    var authorID = user
    var forumThreadID = messageProps.forumThreadID
    var title = messageProps.title
    var text = messageProps.text
    var timestamp = new Date().toLocaleString()

    // only create if all required properties are given
    if(forumThreadID && title && text && authorID) {
        var newMessage = new Messages({
            forumThreadID: forumThreadID,
            title: title,
            text: text,
            authorID: authorID,
            creationTimestamp: timestamp
        })

        newMessage.save(function (err, newMessage) {
            if (err) {
                logger.error("Could not create message: " + err)
                return callback("Could not create message: " + err, null)
            } else {
                return callback(null, newMessage)
            }
        })
    }
    else {
        logger.error("Could not create message: required attributes not given")
        return callback("Could not create message: required attributes not given")
    }
}

function updateOne(message, messageProps, user, callback) {
    logger.debug("Trying to update message with messageTitle: " + message.title)
    // set author according to props only if requester is admin, otherwise author is user
    userService.getIsAdmin(user, (err, adminStatus) => {
        var timestamp = new Date().toLocaleString()

        // add note to message if edited by admin
        var adminEdit = false
        if(user != message.authorID && adminStatus) {
            logger.info("Message " + message.title + " of user " + message.authorID + " edited by admin " + user)
            adminEdit = true
        }

        if(message && (!(user != message.authorID) || adminEdit)) {
            message.text = messageProps.text
            message.edited = true
            message.editAuthor = user
            message.editTimestamp = timestamp

            message.save(function(err, newMessage) {
                if(err) {
                    logger.error("Could not update message: " + err)
                    return callback("Could not update message: " + err, null)
                }
                else {
                    return callback(null, newMessage)
                }
            })
        }
        else {
            return callback("Could not update message: not enough rights", null)
        }
    })
}

function deleteOne(message, callback) {
    logger.debug("Trying to delete message with messageTitle: " + message.title)

    commentService.deleteCommentsOfMessage(message._id, function(err, deleted) {
        if(err || !deleted) {
            logger.error("Could not delete comments of message with messageTitle " + message.title)
            return callback(err, null)
        }
        message.remove(function (err) {
            if (err) {
                logger.error("Error while deletion of message with messageTitle: " + message.title)
                callback("Error while deletion", null)
            } else {
                callback(null, true)
            }
        })
    })
}

// deleting all messages from a forumID (used in process of forumThreads deletion)
function deleteMessagesOfForum(searchForumID, callback) {
    logger.debug("Trying to delete all messages for forumID " + searchForumID)

    if(!searchForumID) {
        return callback("messageTitle is missing", false)
    }
    else {
        findMessagesByForumThreadID(searchForumID, function(err, messages) {
            if(err) {
                return callback("error while trying to find messages", false)
            }
            // delete all comments belonging to the messages first before deleting the messages themselves
            messages.forEach(message => {
                commentService.deleteCommentsOfMessage(message._id, function(err, deleted) {
                    if(err || !deleted) {
                        logger.warn("Error while deleting comments of message " + message._id + ": " + err)
                    }
                })
            })
            // delete the actual messages now
            var query = Messages.deleteMany({ forumThreadID: searchForumID })
            query.exec(function(err, message) {
                if(err) {
                    logger.warn("Could not find messages for forumID: " + searchForumID)
                    callback("Could not find messages for forumID: " + searchForumID, false)
                }
                else {
                    logger.debug(`Deleted all messages of forum with forumID: ${ searchForumID }`)
                    callback(null, true)
                }
            })
        })
    }
}

module.exports = {
    getForumMessages,
    findMessageByTitle,
    findMessageByID,
    insertOne,
    updateOne,
    deleteOne,
    deleteMessagesOfForum
}