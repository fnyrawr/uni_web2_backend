const Messages = require("./ForumMessageModel")
const userService = require("../user/UserService")
const commentService = require("../comments/CommentsService")
var logger = require('../../config/winston')

// Admin-Function: getting ALL forum messages regardless of forums
function getForumMessages(callback) {
    Messages.find(function (err, forums) {
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

// find messages belonging to a forum
function findMessagesByForumID(searchForumID, callback) {
    logger.debug("Trying to find messages for forumID " + searchForumID)

    if(!searchForumID) {
        callback("forumID is missing")
    }
    else {
        var query = Messages.find({ forumID: searchForumID })
        query.exec(function(err, messages) {
            if(err) {
                logger.warn("Could not find messages for forumID: " + searchForumID)
                callback("Could not find messages for forumID: " + searchForumID, null)
            }
            else {
                if(messages) {
                    logger.debug(`Found forumID: ${searchForumID}`)
                    callback(null, messages)
                }
                else {
                    logger.warn("Could not find messages for forumID: " + searchForumID)
                    callback("ForumID " + searchForumID + " not found", null)
                }
            }
        })
    }
}

// find messages belonging to a user
function findMessagesByUserID(searchUserID, callback) {
    logger.debug("Trying to find messages for userID " + searchUserID)

    if(!searchUserID) {
        callback("userID is missing")
    }
    else {
        var query = Messages.find({ authorID: searchUserID })
        query.exec(function(err, forum) {
            if(err) {
                logger.warn("Could not find messages for userID: " + searchUserID)
                callback("Could not find messages for userID: " + searchUserID, null)
            }
            else {
                if(forum) {
                    logger.debug(`Found userID: ${searchUserID}`)
                    callback(null, forum)
                }
                else {
                    logger.warn("Could not find messages for userID: " + searchUserID)
                    callback("UserID " + searchUserID + " not found", null)
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
        var query = Messages.findOne({ messageTitle: searchMessageTitle })
        query.exec(function(err, message) {
            if(err) {
                logger.warn("Could not find message for messageTitle: " + searchMessageTitle)
                callback("Could not find message for messageTitle: " + searchMessageTitle, null)
            }
            else {
                if(message) {
                    logger.debug(`Found messageTitle: ${searchMessageTitle}`)
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

function insertOne(messageProps, user, callback) {
    logger.debug("Trying to create a new message")
    // set owner according to props only if requester is admin, otherwise owner is user
    var authorID = user
    var forumID = messageProps.forumID
    var messageTitle = messageProps.messageTitle
    var messageText = messageProps.messageText
    var timestamp = new Date().toLocaleString()

    // only create if all required properties are given
    if(forumID && messageTitle && messageText) {
        var newMessage = new Messages({
            forumID: forumID,
            messageTitle: messageTitle,
            messageText: messageText,
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
    logger.debug("Trying to update message with messageTitle: " + message.messageTitle)
    // set author according to props only if requester is admin, otherwise author is user
    userService.getIsAdmin(user, (err, adminStatus) => {
        var timestamp = new Date().toLocaleString()

        // add note to message if edited by admin
        var adminEdit = false
        if(user != message.authorID && adminStatus) {
            logger.info("Message " + message.messageTitle + " of user " + message.authorID + " edited by admin " + user)
            adminEdit = true
        }

        if(message && (!(user != message.authorID) || adminEdit)) {
            message.messageText = messageProps.messageText
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

function deleteOne(messageTitle, user, callback) {
    logger.debug("Trying to delete message with messageTitle: " + messageTitle)

    // only delete if user is author or admin
    userService.getIsAdmin(user, (err, adminStatus) => {
        findMessageByTitle(messageTitle, function (err, message) {
            if(message) {
                if(message.authorID === user || adminStatus) {
                    commentService.deleteCommentsOfMessage(messageTitle, function(err, deleted) {
                        if(err || !deleted) {
                            logger.error("Could not delete comments of message with messageTitle " + messageTitle)
                            return callback(err, null)
                        }
                        message.remove(function (err) {
                            if (err) {
                                logger.error("Error while deletion of message with messageTitle: " + messageTitle)
                                callback("Error while deletion", null)
                            } else {
                                callback(null, "Deleted message " + messageTitle)
                            }
                        })
                    })
                }
                else {
                    logger.warn("Error: Not enough rights to delete message " + messageTitle)
                    callback("Not enough rights to delete message " + messageTitle, null)
                }
            } else {
                logger.error("Deletion of message with messageTitle: " + messageTitle + " failed: Message not found")
                callback("Could not delete message " + messageTitle + ": Message not found", null)
            }
        })
    })
}

// deleting all messages from a forumID (used in process of forum deletion)
function deleteMessagesOfForum(searchForumID, callback) {
    logger.debug("Trying to delete all messages for forumID " + searchForumID)

    if(!searchForumID) {
        return callback("messageTitle is missing", false)
    }
    else {
        findMessagesByForumID(searchForumID, function(err, messages) {
            if(err) {
                return callback("error while trying to find messages", false)
            }
            // delete all comments belonging to the messages first before deleting the messages themselves
            messages.forEach(message => {
                commentService.deleteCommentsOfMessage(message.messageTitle, function(err, deleted) {
                    if(err || !deleted) {
                        logger.warn("Error while deleting comments of message " + message.messageTitle + ": " + err)
                    }
                })
            })
            // delete the actual messages now
            var query = Messages.deleteMany({ forumID: searchForumID })
            query.exec(function(err, message) {
                if(err) {
                    logger.warn("Could not find messages for forumID: " + searchForumID)
                    callback("Could not find messages for forumID: " + searchForumID, false)
                }
                else {
                    logger.debug(`Deleted all messages of forum with forumID: ${searchForumID}`)
                    callback(null, true)
                }
            })
        })
    }
}

module.exports = {
    getForumMessages,
    findMessagesByForumID,
    findMessagesByUserID,
    findMessageByTitle,
    insertOne,
    updateOne,
    deleteOne,
    deleteMessagesOfForum
}