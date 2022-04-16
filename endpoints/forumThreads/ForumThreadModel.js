var mongoose = require('mongoose')

const ForumThreadSchema = new mongoose.Schema({
        name: { type: String, unique: true },
        description: String,
        pictureURL: String,
        ownerID: String,
        timestamp: String
    }
);

const ForumThread = mongoose.model("ForumThread", ForumThreadSchema)

module.exports = ForumThread;