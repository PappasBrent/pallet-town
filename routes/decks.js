const express = require('express')
const router = express.Router()
const Deck = require('../models/deck')

router.get('/', (req, res) => {
    res.sendStatus(200)
})

module.exports = router