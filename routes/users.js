import express from 'express'
const router = express.Router()
import User from '../models/user'
import Deck from '../models/deck'
import passport from 'passport'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import {
    ensureAuthenticated,
    forwardAuthenticated
} from '../config/auth'

// check development status
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// view all users
/*
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
*/

// TODO: Clean up the password checking functionality; move it to middleware or a function or something
// TODO: Use a better mailing service, gmail ain't gonna cut it in prod

async function sendPasswordResetEmail(req, email, token) {
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const resetLink = `${baseUrl}/users/resetPassword/${token}`
    // const testAccount = await nodemailer.createTestAccount()
    // const transporter = nodemailer.createTransport({
    //     host: "smtp.ethereal.email",
    //     port: 587,
    //     secure: false, // true for 465, false for other ports
    //     auth: {
    //         user: testAccount.user, // generated ethereal user
    //         pass: testAccount.pass // generated ethereal password
    //     }
    // });

    // TODO: Test transporter when SendPulse account has finished review
    const transporter = nodemailer.createTransport({
        service: "SendPulse",
        port: 465,
        secure: true,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
        }
    });
    // send mail with defined transport object
    const info = await transporter.sendMail({
        from: '"Pallet Town" <delibird@pallet-town.me>', // sender address
        to: `${email}`, // list of receivers
        subject: "Pallet Town Password Reset Request", // Subject line
        html: `<p>Hi there!
        Our records show that you recently requested to reset your password.
        If you didn't that's fine and you can ignore this email.</p>
        <a href='${resetLink}'>Otherwise, click here to reset your password</a>` // html body
    });
    console.log(nodemailer.getTestMessageUrl(info));
}

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

// get reset password form
router.get('/requestPasswordReset', forwardAuthenticated, (req, res) => {
    return res.render('../views/users/request-password-reset.ejs')
})

// post request to reset password
router.post('/requestPasswordReset', forwardAuthenticated, async (req, res) => {
    const {
        email
    } = req.body
    const userRequested = await User.findOne({
        email
    })
    if (userRequested == null) {
        req.flash("errorMessage", "Sorry, no user found with that email :(")
        return res.status(404).redirect("/users/requestPasswordReset")
    }

    const passwordResetToken = jwt.sign({
        // TODO: Change this!
        resetURL: 'url'
    }, process.env.JWT_SECRET, {
        expiresIn: "15m"
    })
    userRequested.passwordResetToken = passwordResetToken
    await userRequested.save()
    sendPasswordResetEmail(req, email, passwordResetToken)
    req.flash('successMessage', 'An email was sent to your account; click the link supplied in it to reset your password')
    console.log(userRequested);

    return res.redirect('/users/login')
})

// attempt to view reset password form
router.get('/resetPassword/:token', forwardAuthenticated, async (req, res) => {
    const passwordResetToken = req.params.token
    try {
        jwt.verify(passwordResetToken, process.env.JWT_SECRET)
        const userToUpdate = await User.findOne({
            passwordResetToken
        })
        if (userToUpdate == null) {
            req.flash('errorMessage', 'Sorry, that password reset link is invalid')
            return res.redirect('/users/requestPasswordReset')
        }
        return res.render('../views/users/reset-password-form', {
            userToUpdate
        })
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            req.flash('errorMessage', 'Sorry, that URL is expired. Please try again')
        } else {
            console.log(error);
            req.flash('errorMessage', 'Something went wrong :(')
        }
        return res.status(500).redirect('/users/requestPasswordReset')
    }
})

// attempt to actually reset a password
router.post('/resetPassword/:token', forwardAuthenticated, async (req, res) => {
    const passwordResetToken = req.params.token
    const {
        newPassword,
        confirmNewPassword
    } = req.body

    if (newPassword !== confirmNewPassword) {
        req.flash('errorMessage', 'Passwords must match')
        return res.redirect(`/users/resetPassword/${passwordResetToken}`)
    }

    if (newPassword == '') {
        req.flash('errorMessage', 'Please enter a password')
        return res.redirect(`/users/resetPassword/${passwordResetToken}`)
    }

    try {
        jwt.verify(passwordResetToken, process.env.JWT_SECRET)
        const userToUpdate = await User.findOne({
            passwordResetToken
        })
        if (userToUpdate == null) {
            req.flash('errorMessage', 'Sorry, that password reset link is invalid')
            return res.redirect('/users/requestPasswordReset')
        }
        userToUpdate.password = await bcrypt.hash(newPassword, await bcrypt.genSalt())
        await userToUpdate.save()
        req.flash("successMessage", "Password successfully changed! You may now log in")
        return res.redirect("/users/login")
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            req.flash('errorMessage', 'Sorry, that URL is expired. Please try again')
        } else {
            console.log(error);
            req.flash('errorMessage', 'Something went wrong :(')
        }
        return res.status(500).redirect('/users/requestPasswordReset')
    }
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

// attempt to update account
router.patch('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const {
            username,
            email
        } = req.body
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
        return res.redirect('/')
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
        // delete decks associated with this user before removal
        await Deck.deleteMany({
            creator: currentUser.id
        })
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