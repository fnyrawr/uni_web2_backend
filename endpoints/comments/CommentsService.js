const Comments = require("./CommentsModel")
const userService = require("../user/UserService")
var logger = require('../../config/winston')

// Admin-Function: getting ALL forumThreads comments regardless of forums
function getComments(filters, callback) {
    var query = Comments.find(filters)
    query.exec(function (err, comments) {
        if(err) {
            logger.error("Error while searching: " + err)
            return callback(err, null)
        }
        else {
            logger.debug("Retrieving comments")
            return callback(null, comments)
        }
    })
}

// find comments belonging to a message
function findCommentByID(searchCommentID, callback) {
    logger.debug("Trying to find messages for messageTitle " + searchCommentID)

    if(!searchCommentID) {
        callback("messageTitle is missing", null)
    }
    else {
        var query = Comments.findOne({ _id: searchCommentID })
        query.exec(function(err, comment) {
            if(err) {
                logger.warn("Could not find comments for id: " + searchCommentID)
                callback("Could not find comments for id: " + searchCommentID, null)
            }
            else {
                if(comment) {
                    logger.debug(`Found comment: ${ searchCommentID }`)
                    callback(null, comment)
                }
                else {
                    logger.warn("Could not find comments for id: " + searchCommentID)
                    callback("id " + searchCommentID + " not found", null)
                }
            }
        })
    }
}

// get the number of the latest comment of messageTitle | returning 0 if none is found (no comments yet)
function getCurrentCommentNo(searchMessageID, callback) {
    Comments.findOne({ messageID: searchMessageID }).sort({ _id: -1 }).limit(1).exec(function(err, res) {
        if(err) {
            logger.error("Error: " + err)
            return callback(err, null)
        }
        if(!res) {
            logger.debug("No comments for this message yet")
            return callback(null, 0)
        }
        else {
            logger.debug("Latest commentNo: " + res.commentNo)
            return callback(null, res.commentNo)
        }
    })
}

function insertOne(commentProps, user, callback) {
    logger.debug("Trying to create a new comment")
    // set owner according to props only if requester is admin, otherwise owner is user
    var authorID = user.userID
    var messageID = commentProps.messageID
    var text = commentProps.text
    var timestamp = new Date().toLocaleString()

    // only create if all required properties are given
    if(messageID && text) {
        getCurrentCommentNo(messageID, function(err, count) {
            if(err) {
                return callback("Could not create comment: " + err, null)
            }

            var newComment = new Comments({
                messageID: messageID,
                commentNo: count + 1,
                text: text,
                authorID: authorID,
                creationTimestamp: timestamp,
            })

            newComment.save(function (err, newMessage) {
                if (err) {
                    logger.error("Could not create comment: " + err)
                    return callback("Could not create comment: " + err, null)
                } else {
                    return callback(null, newMessage)
                }
            })
        })
    }
    else {
        logger.error("Could not create message: required attributes not given")
        return callback("Could not create message: required attributes not given")
    }
}

function updateOne(comment, commentProps, user, callback) {
    logger.debug("Trying to update comment from commentID " + comment._id)
    // set author according to props only if requester is admin, otherwise author is user
    var timestamp = new Date().toLocaleString()

    // add note to message if edited by admin
    var adminEdit = false
    if(user.userID != comment.authorID && user.isAdministrator) {
        logger.info("Comment " + comment._id + " of user " + comment.authorID + " edited by admin " + user)
        adminEdit = true
    }

    if(comment && (!(user.userID != comment.authorID) || adminEdit)) {
        comment.edited = true
        comment.editAuthor = user.userID
        comment.editTimestamp = timestamp

        comment.save(function(err, newComment) {
            if(err) {
                logger.error("Could not update comment: " + err)
                return callback("Could not update comment: " + err, null)
            }
            else {
                return callback(null, newComment)
            }
        })
    }
    else {
        return callback("Could not update comment: not enough rights", null)
    }
}

function deleteOne(comment, callback) {
    logger.debug("Trying to delete comment with commentID: " + comment._id + " from messageID " + comment.messageID)

    comment.remove(function (err) {
        if (err) {
            logger.error("Error while deletion of comment with commentID: " + comment._id + " from messageID " + comment.messageID)
            callback("Error while deletion", null)
        } else {
            callback(null, "Deleted comment with commentID: " + comment._id + " from messageID " + comment.messageID)
        }
    })
}

// deleting all comments from a message (used in process of message deletion)
function deleteCommentsOfMessage(searchMessageID, callback) {
    logger.debug("Trying to delete all comments for messageID " + searchMessageID)

    if(!searchMessageID) {
        return callback("messageID is missing", false)
    }
    else {
        var query = Comments.deleteMany({ messageID: searchMessageID })
        query.exec(function(err, message) {
            if(err) {
                logger.warn("Could not find comments for messageID: " + searchMessageID)
                return callback("Could not find comments for messageID: " + searchMessageID, false)
            }
            else {
                logger.debug(`Deleted all comments of message with messageID: ${ searchMessageID }`)
                return callback(null, true)
            }
        })
    }
}

module.exports = {
    getComments,
    findCommentByID,
    insertOne,
    updateOne,
    deleteOne,
    deleteCommentsOfMessage
}