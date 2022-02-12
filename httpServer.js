const express = require('express')
const database = require('./database/db')

const testRoutes = require('./endpoints/test/TestRoutes')
const userRoutes = require('./endpoints/user/UserRoute')

const app = express()

/* Adding Routes */
app.use('/', testRoutes)
app.use('/user', userRoutes)

database.initDb(function (err, db) {
    if(db) {
        console.log("successfully connected to the database")
    }
    else {
        console.log("database could not be opened")
    }
})

const port = 8080

app.listen(port, () => {
    console.log('Listening at http://localhost:${port}')
})