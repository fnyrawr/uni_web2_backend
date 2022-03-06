var mongoose = require('mongoose')

const ForumMessageSchema = new mongoose.Schema({
        id: Number,
        forumID: String,
        messageTitle: { type: String, unique: true },
        messageText: String,
        authorID: String,
        edited: { type: Boolean, default: false },
        editAuthor: String,
        creationTimestamp: String,
        editTimestamp: String
    }, { timestamps: true }
);

const ForumMessage = mongoose.model("ForumMessage", ForumMessageSchema)

module.exports = ForumMessage;