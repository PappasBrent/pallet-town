import passport from 'passport'
const LocalStrategy = require('passport-local').Strategy
import User from '../models/user';
import bcrypt from 'bcrypt'

async function initialize(passport) {
    passport.use(new LocalStrategy(
        async (username, password, done) => {
            const user = await User.findOne({
                username: username
            })
            if (user == null) {
                console.log("No user registered");

                return done(null, false, {
                    message: "No user registered with that username"
                })
            }
            try {
                if (await bcrypt.compare(password, user.password))
                    return done(null, user, {
                        message: `Successfully logged in. Hi ${username}!`
                    })
                else
                    return done(null, false, {
                        message: "Incorrect password"
                    })
            } catch (error) {
                return done(error)
            }
        }
    ))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser((userID, done) => {
        User.findById(userID, (err, user) => done(err, user))
    })
}

export default initialize