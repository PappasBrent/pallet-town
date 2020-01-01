import express from 'express'
const router = express.Router()
import Deck from '../models/deck'
import User from '../models/user'
import {
    ensureAuthenticated
} from '../config/auth'

// all decks
router.get('/', (req, res) => {
    return res.sendStatus(200)
})

// TODO: Allow users to edit and delete decks after saving them
// TODO: Find a way to check if a user is updating a deck/changing its name vs making a new deck
// need to use deck ID somehow. Tricky part will be when making a new deck.
// Maybe make separate pages for totally new decks and updating preexisting decks?
// Then could redirect user to edit page after initial save, which should be fine
// since deck data will just be loaded in. Need to be careful with that in the front-end
// js though

// save a new deck to the currently logged in user's account
router.post('/save', ensureAuthenticated, async (req, res) => {
    try {
        const {
            cards,
            deckName
        } = req.body

        // TODO: Find a better way of displaying these error messages

        if (deckName.trim() == "") {
            return res.status(400).json({
                "ok": false,
                "errorMessage": "Please enter a deck name"
            })
        }

        if (cards.length === 0) {
            return res.status(400).json({
                "ok": false,
                "errorMessage": "Please add at least one card to your deck before saving it"
            })
        }

        const newDeck = new Deck({
            "name": deckName,
            "creator": req.user,
            "cards": cards
        })

        await newDeck.save()

    } catch (error) {
        console.log(error);
        return res.json({
            "ok": false,
            "errorMessage": "Something went wrong :("
        })
    }
    return res.json({
        "ok": true
    })
})

// look up all decks by a user
// TODO: Remove need for authentication
router.get('/decksByUser/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const decks = await Deck.find({
            creator: req.user.id
        }).limit(10).exec()
        return res.render("../views/decks/decks.ejs", {
            decks,
            user: req.user
        })
    } catch (error) {
        console.log(error);
        return res.redirect('/')
    }
})

export default router