var mongoose = require('mongoose')

const ForumSchema = new mongoose.Schema({
        id: Number,
        forumName: {type: String, unique: true},
        forumDescription: String,
        ownerID: String
    }, { timestamps: true }
);

const Forum = mongoose.model("Forum", ForumSchema)

module.exports = Forum;