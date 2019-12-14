import express from 'express'
const router = express.Router()
import User from '../models/user'
import passport from 'passport'
import bcrypt from 'bcrypt'
import {
    ensureAuthenticated,
    forwardAuthenticated
} from '../config/auth'

// view all users
router.get('/', async (req, res) => {
    try {
        // TODO: paginate these results
        const users = await User.find()
        return res.render('../views/users/index', {
            users: users
        })
    } catch (error) {
        res.sendStatus(500)
    }
})

// go to login page
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('../views/users/login.ejs', {
        submitMessage: "Login"
    })
})

// go to register page
router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('../views/users/register.ejs', {
        submitMessage: "Register now!"
    })
})

// attempt to register
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
            message: "Please enter a password"
        })
    }
    if (errors.length > 0) {
        return res.render('users/register', {
            errors,
            username,
            password,
            submitMessage: "Register now!"
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
            password,
            submitMessage: "Register now!"
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

// attempt to login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/users/login',
        failureFlash: true,
        successFlash: true,
    })(req, res, next)
})

// attempt to logout
router.delete('/logout', ensureAuthenticated, async (req, res) => {
    const {
        username
    } = await User.findById(req.user)
    req.logOut()
    req.flash('successMessage', `You have successully logged out. See you later ${username}!`)
    res.redirect('/')
})

router.get('/edit', async (req, res) => {
    if (typeof req.user != 'undefined')
        return res.render('../views/users/edit-account', {
            user: req.user
        })
    return res.redirect('/users')
})

// view a specific user
router.get('/:id', async (req, res) => {
    try {
        console.log("Current user", req.user);

        const foundUser = await User.findById(req.params.id)
        console.log("Found user", foundUser);
        if (typeof req.user != 'undefined' && req.user.id === foundUser.id)
            return res.render('../views/users/edit-account', {
                user: foundUser
            })
        return res.render('../views/users/view-account.ejs', {
            user: foundUser
        })
    } catch (error) {
        console.log(error);
        return res.sendStatus(400)
    }
})

// TODO: ensure that current user matches the info of the user accessed

// attempt to update account
router.patch('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const {
            username,
            email
        } = req.body
        // This doesn't work; need to make sure that the current user matches the one being edited
        if (req.params.id != req.user.id) {
            req.flash("errorMessage", "You can't edit somebody else's info! Only your own silly")
            return res.redirect(`/users/edit/`)
        }
        const currentUser = await User.findById(req.user.id)
        if (username != req.user.username && await User.findOne({
                username: username
            })) {
            req.flash('errorMessage', 'Username already taken')
            return res.redirect(`/users/${req.user.id}`)
        }
        currentUser.username = username
        currentUser.email = email
        await currentUser.save()
        req.flash('successMessage', 'Updated account info successfully!')
        return res.redirect('/users')
    } catch (error) {
        console.log(error);
        req.flash('errorMessage', 'Could not update user info')
        res.status(500).redirect(`/users/edit/${req.user.id}`)
    }
})

// attempt to delete account
router.delete('/delete/:id', ensureAuthenticated, async (req, res) => {
    try {
        if (req.params.id != req.user.id) {
            req.flash("errorMessage", "You can't delete somebody else's account! That would be mean >:(")
            return res.redirect(`/users/edit/`)
        }
        const currentUser = await User.findById(req.user.id)
        await currentUser.remove()
        req.flash("successMessage", "Successully deleted account")
        return res.redirect("/")
    } catch (error) {
        console.log(error);
        req.flash("errorMessage", "Could not delete account")
        return res.redirect(`/users/${req.user.id}`)
    }
})



export default router