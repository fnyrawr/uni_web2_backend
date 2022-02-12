const User = require("./UserModel")

function getUsers(callback) {
    User.find(function (err, users) {
        if(err) {
            console.log("Error while searching: " + err)
            return callback(err, null)
        }
        else {
            console.log("No issues")
            return callback(null, users)
        }
    })
}

module.exports = {
    getUsers
}