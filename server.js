// check development status
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// set up imports, can use import statement since using esm
import express from 'express'
const app = express()
import expressLayouts from 'express-ejs-layouts'
import mongoose from 'mongoose'
import flash from 'connect-flash'
import session from 'express-session'
import passport from 'passport'
import initializePassport from './config/passport-config'
import methodOverride from 'method-override'

// import routers
import indexRouter from './routes/index'
import userRouter from './routes/users'
import deckRouter from './routes/decks'

// config app

// express session
// TODO: CHANGE SECRET KEY
app.use(session({
    secret: process.env.SECRET_SESSION_KEY,
    resave: true,
    saveUninitialized: true
}))

// passport
initializePassport(passport)
app.use(passport.initialize())
app.use(passport.session())

app.use(methodOverride('_method'))

// connect flash
app.use(flash())

// app
app.set('view engine', 'ejs')
app.set('views', `${__dirname}/views`)
app.set('layout', 'layouts/layout')
app.use(expressLayouts)
app.use(express.static('public'))
app.use(express.urlencoded({
    extended: true
}))

// global variables/middleware
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage')
    res.locals.errorMessage = req.flash('errorMessage')
    // these names are reserved for passport flashes
    res.locals.error = req.flash('error')
    res.locals.success = req.flash('success')
    res.locals.isAuthenticated = req.isAuthenticated()
    res.locals.currentUser = req.user
    next()
})



// use routes
app.use('/', indexRouter)
app.use('/users', userRouter)
app.use('/decks', deckRouter)

// db connection
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const db = mongoose.connection
db.on('error', error => console.log(error))
db.once('open', () => console.log("Database connection established"))

app.listen(process.env.PORT || 3000)