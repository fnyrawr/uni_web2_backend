var mongoose = require('mongoose')

const CommentSchema = new mongoose.Schema({
        messageID: String,
        commentNo: Number,
        text: String,
        authorID: String,
        edited: { type: Boolean, default: false },
        editAuthor: String,
        creationTimestamp: String,
        editTimestamp: String
    }
);

const Comment = mongoose.model("Comment", CommentSchema)

module.exports = Comment;