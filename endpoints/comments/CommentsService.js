const Comments = require("./CommentsModel")
const userService = require("../user/UserService")
var logger = require('../../config/winston')

// Admin-Function: getting ALL forum comments regardless of forums
function getComments(callback) {
    Comments.find(function (err, comments) {
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
function findCommentsByMessageTitle(searchMessageTitle, callback) {
    logger.debug("Trying to find messages for messageTitle " + searchMessageTitle)

    if(!searchMessageTitle) {
        callback("messageTitle is missing")
    }
    else {
        var query = Comments.find({ forumID: searchMessageTitle })
        query.exec(function(err, comments) {
            if(err) {
                logger.warn("Could not find comments for messageTitle: " + searchMessageTitle)
                callback("Could not find comments for messageTitle: " + searchMessageTitle, null)
            }
            else {
                if(comments) {
                    logger.debug(`Found messageTitle: ${searchMessageTitle}`)
                    callback(null, comments)
                }
                else {
                    logger.warn("Could not find comments for messageTitle: " + searchMessageTitle)
                    callback("MessageTitle " + searchMessageTitle + " not found", null)
                }
            }
        })
    }
}

// find comments belonging to a user
function findCommentsByUserID(searchUserID, callback) {
    logger.debug("Trying to find comments for userID " + searchUserID)

    if(!searchUserID) {
        callback("userID is missing")
    }
    else {
        var query = Comments.find({ authorID: searchUserID })
        query.exec(function(err, comments) {
            if(err) {
                logger.warn("Could not find comments for userID: " + searchUserID)
                callback("Could not find comments for userID: " + searchUserID, null)
            }
            else {
                if(comments) {
                    logger.debug(`Found userID: ${searchUserID}`)
                    callback(null, comments)
                }
                else {
                    logger.warn("Could not find comments for userID: " + searchUserID)
                    callback("UserID " + searchUserID + " not found", null)
                }
            }
        })
    }
}

// find message by title
function findComment(searchMessageTitle, searchCommentNo, callback) {
    logger.debug("Trying to find messages for messageTitle " + searchMessageTitle + " and commentNo " + searchCommentNo)

    if(!searchMessageTitle) {
        return callback("messageTitle is missing", null)
    }
    // if no commentNo is given the comment can't be existing yet (hence no update but creation instead) -> no error but also no comment to return
    if(!searchCommentNo) {
        return callback(null, null)
    }

    var query = Comments.findOne({ messageTitle: searchMessageTitle, commentNo: { $eq: searchCommentNo } })
    query.exec(function(err, comment) {
        if(err) {
            logger.warn("Could not find comment for messageTitle: " + searchMessageTitle + " and commentNo " + searchCommentNo)
            callback("Could not find comment for messageTitle: " + searchMessageTitle + " and commentNo " + searchCommentNo, null)
        }
        else {
            if(comment) {
                logger.debug(`Found comment for: ${searchMessageTitle}`)
                callback(null, comment)
            }
            else {
                logger.debug("Could not find comment for messageTitle: " + searchMessageTitle + " and commentNo " + searchCommentNo)
                callback("MessageTitle " + searchMessageTitle + " with commentNo " + searchCommentNo + " not found", null)
            }
        }
    })
}

// get the number of the latest comment of messageTitle | returning 0 if none is found (no comments yet)
function getCurrentCommentNo(searchMessageTitle, callback) {
    Comments.findOne({ messageTitle: searchMessageTitle }).sort({ _id: -1 }).limit(1).exec(function(err, res) {
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
    var authorID = user
    var messageTitle = commentProps.messageTitle
    var commentText = commentProps.commentText
    var timestamp = new Date().toLocaleString()

    // only create if all required properties are given
    if(messageTitle && commentText) {
        getCurrentCommentNo(messageTitle, function(err, count) {
            if(err) {
                return callback("Could not create comment: " + err, null)
            }

            var newComment = new Comments({
                messageTitle: messageTitle,
                commentNo: count + 1,
                commentText: commentText,
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
    logger.debug("Trying to update comment with messageTitle: " + comment.messageTitle + " and commentNo " + comment.commentNo)
    // set author according to props only if requester is admin, otherwise author is user
    userService.getIsAdmin(user, (err, adminStatus) => {
        var timestamp = new Date().toLocaleString()

        // add note to message if edited by admin
        var adminEdit = false
        if(user != comment.authorID && adminStatus) {
            logger.info("Message " + comment.messageTitle + " of user " + comment.authorID + " edited by admin " + user)
            adminEdit = true
        }

        if(comment && (!(user != comment.authorID) || adminEdit)) {
            comment.messageText = commentProps.messageText
            comment.edited = true
            comment.editAuthor = user
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
    })
}

function deleteOne(messageTitle, commentNo, user, callback) {
    logger.debug("Trying to delete comment with messageTitle: " + messageTitle + " and commentNo " + commentNo)

    // only delete if user is author or admin
    userService.getIsAdmin(user, (err, adminStatus) => {
        findComment(messageTitle, commentNo, function (err, comment) {
            if(comment) {
                if(comment.authorID === user || adminStatus) {
                    comment.remove(function (err) {
                        if (err) {
                            logger.error("Error while deletion of comment with messageTitle: " + messageTitle + " and commentNo " + commentNo)
                            callback("Error while deletion", null)
                        } else {
                            callback(null, "Deleted comment of " + messageTitle + " with commentNo " + commentNo)
                        }
                    })
                }
                else {
                    logger.warn("Error: Not enough rights to delete comment")
                    callback("Not enough rights to delete comment", null)
                }
            } else {
                logger.error("Deletion of comment failed: Comment not found")
                callback("Could not delete comment: Comment not found", null)
            }
        })
    })
}

// deleting all comments from a message (used in process of message deletion)
function deleteCommentsOfMessage(searchMessageTitle, callback) {
    logger.debug("Trying to delete all comments for messageTitle " + searchMessageTitle)

    if(!searchMessageTitle) {
        return callback("messageTitle is missing", false)
    }
    else {
        var query = Comments.deleteMany({ messageTitle: searchMessageTitle })
        query.exec(function(err, message) {
            if(err) {
                logger.warn("Could not find comments for messageTitle: " + searchMessageTitle)
                return callback("Could not find comments for messageTitle: " + searchMessageTitle, false)
            }
            else {
                logger.debug(`Deleted all comments of message with messageTitle: ${searchMessageTitle}`)
                return callback(null, true)
            }
        })
    }
}

module.exports = {
    getComments,
    findCommentsByMessageTitle,
    findCommentsByUserID,
    findComment,
    insertOne,
    updateOne,
    deleteOne,
    deleteCommentsOfMessage
}