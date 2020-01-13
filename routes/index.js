import express from 'express'
const router = express.Router()
import fs from 'fs'
import path from 'path'
import request from 'request'
import jimp from 'jimp'
import uuidv1 from 'uuid/v1'
import uuidv4 from 'uuid/v4'
import url from 'url'

router.get('/', (req, res) => {
    return res.render('../views/index.ejs')
})

router.get('/about', (req, res) => {
    return res.render('../views/about.ejs')
})

// need to send cards in the request body
router.post('/make-deck/:type', async (req, res) => {

    const baseUrl = `${req.protocol}://${req.get('host')}`
    const cards = req.body.cards
    if (req.params.type === "tts") {
        try {
            const imageUrl = await makeDeckImage(baseUrl, cards)
            const jsonFilePath = await makeDeckJson(cards, imageUrl)
            return res.json({
                'ok': true,
                'downloadHref': jsonFilePath
            })
        } catch (error) {
            return res.status(500).json({
                "ok": false
            })
        }
    } else if (req.params.type === "txt") {
        try {
            const txtFilePath = await makeDecklistText(cards)
            return res.json({
                'ok': true,
                'downloadHref': txtFilePath
            })
        } catch (error) {
            return res.status(500).json({
                "ok": false
            })
        }
    } else {
        return res.status(400).json({
            "ok": false
        })
    }
})

function downloadImage(url, destPath) {
    return new Promise((resolve) => {
        request(url).pipe(fs.createWriteStream(destPath)).on('close', resolve)
    })
}

function generateFilePath(destDir, ext) {
    // Returns the path to a randomly named file with
    // a given extension in a given directory
    // Include the dot in the extension argument
    // dir should be the name of a folder in the 
    // public directory
    let fn = uuidv1() + ext
    let absPath = path.join(destDir, fn)
    // not sure if I should do this, but make directory if it doesn't exist
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir)
    // make sure filename is not already taken
    while (fs.existsSync(absPath)) {
        fn = uuidv1() + ext
        absPath = path.join(destDir, fn)
    }
    return absPath
}

async function makeDeckJson(cards, imageUrl) {
    return new Promise((resolve, reject) => {
        const appPath = path.dirname(require.main.filename)
        const destDir = path.join(appPath, 'public', 'deck-jsons')
        const ext = '.json'
        const absPath = generateFilePath(destDir, ext)
        const downloadHref = path.relative('public', absPath)

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
    return await new Promise(async (resolveOuter, rejectOuter) => {
        const appPath = path.dirname(require.main.filename)
        const destDir = path.join(appPath, 'public', 'deck-images')
        const ext = '.png'
        const absPath = generateFilePath(destDir, ext)
        const downloadHref = path.relative('public', absPath)
        const deckJsonHref = new url.URL(downloadHref, baseUrl).toString()

        const cardWidth = 341
        // actual pokemon card aspect ratio in cm
        const cardAspectRatio = 6.3 / 8.8
        const cardHeight = cardWidth / cardAspectRatio
        const numCardsPerRow = 10
        const numRows = 6
        const baseImageWidth = numCardsPerRow * cardWidth
        const baseImageHeight = numRows * cardHeight

        const cardPaths = []
        // downloading cards for image creation
        for (const card of cards) {
            const cardPath = path.join("public", "cards", '~' + uuidv4() + '.png')
            console.log(card.name, cardPath);
            try {
                await downloadImage(card.imageUrl, cardPath)
            } catch (error) {
                rejectOuter(error)
            }
            cardPaths.push(cardPath)
        }

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
                rejectOuter(error)
            }
        })

        // delete downloaded cards since they are no longer needed
        cardPaths.forEach(cardPath => fs.unlinkSync(cardPath))
        resolveOuter(deckJsonHref)
    })
}

async function makeDecklistText(cards) {
    return await new Promise((resolve, reject) => {
        const appPath = path.dirname(require.main.filename)
        const destDir = path.join(appPath, 'public', 'deck-txts')
        const ext = '.txt'
        const absPath = generateFilePath(destDir, ext)
        const downloadHref = path.relative('public', absPath)
        try {
            let deckList = ""
            for (const card of cards) {
                deckList += `${card.count} ${card.name} ${card.setCode.toUpperCase()} ${card.number}\n`
            }
            fs.writeFileSync(absPath, deckList)
        } catch (error) {
            reject(error)
        }
        resolve(downloadHref)
    })
}

export default router