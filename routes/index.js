import express from 'express'
const router = express.Router()
import fs from 'fs'
import path from 'path'
import request from 'request'
import jimp from 'jimp'
import crypto from 'crypto'
// TODO: Enable user to save decks
// import Deck from '../models/deck'
// import passport from 'passport'

router.get('/', (req, res) => {
    return res.render('../views/index.ejs')
})

// need to send cards in the request body
router.post('/make-deck', async (req, res) => {
    // cardUrls must be sorted beforehand
    console.log(req.body)
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const cards = req.body.cards
    try {
        const imageUrl = await makeDeckImage(baseUrl, cards)
        const jsonFilePath = await makeDeckJson(cards, imageUrl)
        return res.json({
            'ok': true,
            'downloadHref': jsonFilePath
        })
    } catch (error) {
        return res.json({
            "ok": false
        })
    }
})

function downloadImage(url, destPath) {
    return new Promise((resolve) => {
        request(url).pipe(fs.createWriteStream(destPath)).on('close', resolve)
    })
}

async function makeDeckJson(cards, imageUrl) {
    return new Promise((resolve, reject) => {
        let fn = crypto.randomBytes(12).toString('hex') + '.json'
        const appPath = path.dirname(require.main.filename)
        const destDir = path.join(appPath, 'public', 'deck-jsons')
        let absPath = path.join(destDir, fn)
        const downloadHref = `/deck-jsons/${fn}`

        // first get a valid filename for the json
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir)
        while (fs.existsSync(absPath)) {
            fn = crypto.randomBytes(12).toString('hex') + '.json'
            absPath = path.join(__dirname, 'public', 'deck-jsons', fn)
        }
        // TODO: Make sure the width and height
        // of this JSON matches that of the deck!
        const cardBackUrl = 'https://upload.wikimedia.org/wikipedia/en/3/3b/Pokemon_Trading_Card_Game_cardback.jpg'
        const deckJson = {
            "ObjectStates": [{
                "Transform": {
                    "posX": 0,
                    "posY": 1,
                    "posZ": 0,
                    "rotX": 0,
                    "rotY": 180,
                    "rotZ": 180,
                    "scaleX": 1,
                    "scaleY": 1,
                    "scaleZ": 1
                },
                "Name": "DeckCustom",
                // "ContainedObjects": [],
                // "DeckIDs": [],
                "CustomDeck": {
                    "1": {
                        "NumWidth": 10,
                        "NumHeight": 6,
                        "FaceURL": imageUrl,
                        "BackURL": cardBackUrl
                    }
                }
            }]
        }
        const ContainedObjects = []
        const DeckIDs = []
        cards.forEach((card, i) => {
            const cardId = 100 + i
            const cardJson = {
                "Name": "Card",
                // TODO: Make this the nickname the
                // name of the actual card
                "Nickname": card.name,
                "Transform": {
                    "posX": 0,
                    "posY": 0,
                    "posZ": 0,
                    "rotX": 0,
                    "rotY": 180,
                    "rotZ": 180,
                    "scaleX": 1,
                    "scaleY": 1,
                    "scaleZ": 1
                },
                "CardID": cardId
            }
            for (let j = 0; j < card.count; j++) {
                ContainedObjects.push(cardJson)
            }
            DeckIDs.push(cardId)
        })
        deckJson.ObjectStates[0]["ContainedObjects"] = ContainedObjects
        deckJson.ObjectStates[0]["DeckIDs"] = DeckIDs
        try {
            fs.writeFileSync(absPath, new Buffer.from(JSON.stringify(deckJson)))
        } catch (error) {
            reject(error)
        }
        return resolve(downloadHref)
    })
}

// have to return link to deck image
// NOTE: liveserver must be OFF for this to work!
async function makeDeckImage(baseUrl, cards) {
    return await new Promise(async (resolveOuter, reject) => {
        // TODO: Make a function that returns a path to a randomly named file in a given directory
        let fn = crypto.randomBytes(12).toString('hex') + '.png'
        const appPath = path.dirname(require.main.filename)
        const destDir = path.join(appPath, 'public', 'image-files')
        let absPath = path.join(destDir, fn)
        const downloadHref = `/image-files/${fn}`
        const deckJsonHref = baseUrl + downloadHref

        // first get a valid filename
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir)
        while (fs.existsSync(absPath)) {
            fn = crypto.randomBytes(12).toString('hex') + '.png'
            absPath = path.join(__dirname, 'public', 'image-files', fn)
        }

        const cardWidth = 341
        const cardAspectRatio = 6.3 / 8.8
        const cardHeight = cardWidth / cardAspectRatio
        const numCardsPerRow = 10
        const numRows = 6
        const baseImageWidth = numCardsPerRow * cardWidth
        const baseImageHeight = numRows * cardHeight

        const cardPaths = []
        // downloading cards for image creation
        for (const [i, card] of cards.entries()) {
            const cardPath = path.join("public", "cards", '~' + i + '.png')
            console.log(card.name, cardPath);
            try {
                await downloadImage(card.imageUrl, cardPath)
            } catch (error) {
                reject(error)
            }
            cardPaths.push(cardPath)
        }

        console.log('Done downloading needed cards');

        async function placeCardOnImgAtPoint(baseImg, cardImg, x, y) {
            await baseImg.composite(cardImg, x, y, [jimp.BLEND_DESTINATION_OVER, 0, 0])
        }

        await new Promise((resolveInner) => {
            try {
                new jimp(baseImageWidth, baseImageHeight, 0x333333, async (err, baseImg) => {
                    if (err) throw (err)
                    for (let i = 0; i < cardPaths.length; i++) {
                        const cardPath = cardPaths[i];
                        const cardImg = await jimp.read(cardPath)
                        cardImg.resize(cardWidth, cardHeight)
                        const x = (i * cardWidth) % baseImageWidth
                        const y = Math.floor((i * cardWidth) / baseImageWidth) * cardHeight
                        placeCardOnImgAtPoint(baseImg, cardImg, x, y)
                    }
                    await baseImg.writeAsync(absPath)
                    resolveInner()
                })
            } catch (error) {
                reject(error)
            }
        })

        // delete downloaded cards since they are no longer needed
        cardPaths.forEach(cardPath => fs.unlinkSync(cardPath))
        console.log(absPath);
        console.log(fs.existsSync(absPath))
        resolveOuter(deckJsonHref)
    })
}

export default router