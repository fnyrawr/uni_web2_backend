var mongoose = require('mongoose')

const CommentSchema = new mongoose.Schema({
        id: Number,
        messageTitle: String,
        commentNo: Number,
        commentText: String,
        authorID: String,
        edited: { type: Boolean, default: false },
        editAuthor: String,
        creationTimestamp: String,
        editTimestamp: String
    }, { timestamps: true }
);

const Comment = mongoose.model("Comment", CommentSchema)

module.exports = Comment;