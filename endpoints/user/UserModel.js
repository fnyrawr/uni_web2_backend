var mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
var logger = require('../../config/winston')

const UserSchema = new mongoose.Schema({
    userID: { type: String, unique: true },
    userName: String,
    email: { type: String }, // re-add unique: true after milestone 1
    password: String,
    isAdministrator: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    confirmationToken: String
}, { timestamps: true })

UserSchema.pre('save', function (next) {
    var user = this

    if(!user.isModified('password')) { return next() }
    bcrypt.hash(user.password, 10).then((hashedPassword) => {
        user.password = hashedPassword
        next()
    })
}, function (err) {
    next(err)
})

UserSchema.methods.comparePassword = function (candidatePassword, next) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if(err) {
            return next(err, null)
        }
        else
            next(null, isMatch)
    })
}

const User = mongoose.model("User", UserSchema)

module.exports = User