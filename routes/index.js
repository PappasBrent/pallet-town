import express from 'express'
const router = express.Router()
import Deck from '../models/deck'
import passport from 'passport'

router.get('/', (req, res) => {
    return res.render('../views/index.ejs')
})

export default router