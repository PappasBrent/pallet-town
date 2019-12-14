import express from 'express'
const router = express.Router()
import User from '../models/user'
import passport from 'passport'
import bcrypt from 'bcrypt'
import {
    forwardAuthenticated
} from '../config/auth'

router.get('/', (req, res) => {
    res.render('../views/users/index')
})

router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('../views/users/login.ejs')
})

router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('../views/users/register.ejs')
})

router.post('/register', async (req, res) => {
    const {
        username,
        password
    } = req.body
    let errors = []
    if (username == '') {
        errors.push({
            message: "Please enter a username"
        })
    }
    if (password == '') {
        errors.push({
            message: "Please enter a passwordS"
        })
    }
    if (errors.length > 0) {
        return res.render('users/register', {
            errors,
            username,
            password
        })
    }
    if (await User.findOne({
            username: username
        })) {
        errors.push({
            message: "That username is already taken"
        })
        return res.render('users/register', {
            errors,
            username,
            password
        })
    }
    const newUser = new User({
        username: username,
        password: password,
        email: ''
    })
    try {
        newUser.password = await bcrypt.hash(password, await bcrypt.genSalt())
        await newUser.save()
        req.flash("successMessage", "You're now registered and can log in :)")
        return res.redirect('/users/login')
    } catch (error) {
        console.log(error);
        return res.sendStatus(500)
    }
})

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/users/login',
        failureFlash: true,
        successFlash: true
    })(req, res, next)
})

router.delete('/logout', async (req, res) => {
    const {
        username
    } = await User.findById(req.user)
    req.logOut()
    req.flash('successMessage', `You have successully logged out. See you later ${username}!`)
    res.redirect('/')
})

export default router