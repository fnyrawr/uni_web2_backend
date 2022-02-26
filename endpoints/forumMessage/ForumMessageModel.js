var mongoose = require('mongoose')
var logger = require('../../config/winston')

const ForumMessageSchema = new mongoose.Schema({
        id: Number,
        forumID: String,
        messageTitle: String,
        messageText: String,
        authorID: String
    }, { timestamps: true }
);

const ForumMessage = mongoose.model("ForumMessage", ForumMessageSchema)

module.exports = ForumMessage;