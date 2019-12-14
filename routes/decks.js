import express from 'express'
const router = express.Router()
import Deck from '../models/deck'

router.get('/', (req, res) => {
    res.sendStatus(200)
})

export default router