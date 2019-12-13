// check development status
if (process.env.NODE_ENV !== 'production') require('dotenv').config()


// set up imports
const express = require('express')
const app = express()
const expressLayouts = require('express-ejs-layouts')
const mongoose = require('mongoose')

// import routers
const indexRouter = require('./routes/index')
const userRouter = require('./routes/users')
const deckRouter = require('./routes/decks')

// config app
app.set('view engine', 'ejs')
app.set('views', `${__dirname}/views`)
app.set('layout', 'layouts/layout')
app.use(expressLayouts)
app.use(express.static('public'))

// use routes
app.use('/', indexRouter)
app.use('/users', userRouter)
app.use('/decks', deckRouter)

// set up db connection
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const db = mongoose.connection
db.on('error', error => console.log(error))
db.once('open', () => console.log("Database connection established"))

app.listen(process.env.PORT || 3000)