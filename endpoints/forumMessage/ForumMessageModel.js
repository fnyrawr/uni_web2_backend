var mongoose = require('mongoose')

const ForumMessageSchema = new mongoose.Schema({
        forumThreadID: String,
        title: { type: String, unique: true },
        text: String,
        authorID: String,
        edited: { type: Boolean, default: false },
        editAuthor: String,
        creationTimestamp: String,
        editTimestamp: String
    }
);

const ForumMessage = mongoose.model("ForumMessage", ForumMessageSchema)

module.exports = ForumMessage;