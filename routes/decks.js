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

        // see if deck exists, and update if so
        let deckToSave = await Deck.findOne({
            name: deckName,
            creator: req.user
        })
        if (deckToSave === null) {
            deckToSave = new Deck()
        }
        deckToSave.name = deckName
        deckToSave.creator = req.user
        deckToSave.cards = cards

        await deckToSave.save()

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

router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.id)
        return res.render("../views/index.ejs", {
            deck
        })
    } catch (error) {
        return res.redirect("/")
    }
})

// TODO: add front-end functionality for this
router.patch('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const {
            cards,
            deckName
        } = req.body

        const deckToEdit = await Deck.findById(req.params.id)

        if (deckToEdit.creator != req.user) {
            return res.status(403).json({
                "ok": false,
                "errorMessage": "You can only edit a deck you made, not someone else's"
            })
        }

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

        deckToEdit.name = deckName
        deckToEdit.cards = cards

        await deckToEdit.save()

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
        // TODO: Paginate this
        const decks = await Deck.find({
            creator: req.user.id
            // }).limit(10).exec()
        }).exec()
        return res.render("../views/decks/decks.ejs", {
            decks,
            user: await User.findById(req.params.userId)
        })
    } catch (error) {
        console.log(error);
        return res.redirect('/')
    }
})

// TODO: Make some middleware for validating decks

export default router