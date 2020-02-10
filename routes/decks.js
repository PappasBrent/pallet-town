import express from 'express'
const router = express.Router()
import Deck from '../models/Deck'
import User from '../models/User'
import {
    ensureAuthenticated
} from '../config/auth'

// TODO: all decks
router.get('/', (req, res) => {
    return res.redirect('/')
})

// save a new deck to the currently logged in user's account
router.post('/new', ensureAuthenticated, async (req, res) => {
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

        let newDeck = new Deck({
            name: deckName,
            creator: req.user,
            cards: cards
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

router.post('/edit', ensureAuthenticated, async (req, res) => {
    try {
        const {
            cards,
            deckName,
            deckId
        } = req.body

        // TODO: Find a better way of displaying these error messages
        // TODO: Make some middleware to verify deck info

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

        let deckToUpdate = await Deck.findById(deckId)

        // check that the deck to update exists
        if (deckToUpdate == null) {
            return res.status(400).json({
                "ok": false,
                "errorMessage": "The specified deck does not exist"
            })
        }
        // check that the deck to update was made by the current
        if (deckToUpdate.creator != req.user.id) {
            return res.status(403).json({
                "ok": false,
                "errorMessage": "You can only save changes to a deck that you made!"
            })
        }

        deckToUpdate.name = deckName
        deckToUpdate.cards = cards

        await deckToUpdate.save()

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

router.delete('/delete/:id', ensureAuthenticated, async (req, res) => {
    const {
        id
    } = req.params

    try {
        const deckToDelete = await Deck.findById(id)

        if (deckToDelete.creator != req.user.id) {
            req.flash("errorMessage", "You can only delete decks that you made >:(")
            return res.status(403).redirect(`/`)
        }

        await deckToDelete.remove()

    } catch (error) {
        console.log(error);
        req.flash("errorMessage", "Something went wrong, deck not deleted :(")
        return res.status(500).redirect(`/decks/decksByUser/${req.user.id}`)
    }

    req.flash("successMessage", "Successfully deleted deck")
    return res.redirect(`/decks/decksByUser/${req.user.id}`)
})

// get decks by user that is not logged in 
router.get('/decksByUser', async (req, res) => {
    return res.render("../views/decks/decks.ejs", {})
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