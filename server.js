// check development status
if (process.env.NODE_ENV !== 'production') require('dotenv').config()


// set up imports
const express = require('express')
const app = express()
const expressLayouts = require('express-ejs-layouts')
const mongoose = require('mongoose')
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})


// config app
app.use('view engine', 'ejs')
app.set('views', `${__dirname}/views`)
app.set('layout', 'layouts/layout')
app.use(expressLayouts)
app.use(express.static('public'))


// set up db connection
const db = mongoose.connection
db.on('error', error => console.log(error))
db.once('open', () => console.log("Database connection established"))

app.listen(process.env.PORT || 3000)


// TODO: Add routes