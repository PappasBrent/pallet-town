import express from 'express'
import aws from 'aws-sdk'
const router = express.Router()
import fs from 'fs'
import path from 'path'
import request from 'request'
import jimp from 'jimp'
import uuidv1 from 'uuid/v1'
import uuidv4 from 'uuid/v4'

// check development status
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const S3_BUCKET = process.env.S3_BUCKET

// TODO: Separate much of this functionality to an API router

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
            const txtFilePath = await makeDeckListText(cards)
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

async function uploadToAWS(fileName, fileType, file) {

    const s3Params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: file,
        ContentType: fileType,
        ACL: 'public-read'
    };

    const upload = new aws.S3.ManagedUpload({
        params: s3Params
    })

    return await upload.promise()
}

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

// TODO: Sometimes get a network error when downloading file
// need to make sure file is done being made before user can download it
// actually may just be a quirk with nodemon restarting when changes are found
// check in prod to be sure
async function makeDeckJson(cards, imageUrl) {
    return await new Promise((resolve, reject) => {
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
                DeckIDs.push(cardId)
            }
        })
        deckJson.ObjectStates[0]["ContainedObjects"] = ContainedObjects
        deckJson.ObjectStates[0]["DeckIDs"] = DeckIDs
        try {
            fs.writeFileSync(absPath, new Buffer.from(JSON.stringify(deckJson)))
        } catch (error) {
            reject(error)
        }
        // make sure relative to root web directory
        resolve('/' + downloadHref)
    })
}

// have to return link to deck image
// NOTE: liveserver must be OFF for this to work!
async function makeDeckImage(baseUrl, cards) {
    const cardWidth = 341
    // actual pokemon card aspect ratio in cm
    const cardAspectRatio = 6.3 / 8.8
    const cardHeight = Math.floor(cardWidth / cardAspectRatio)
    const numCardsPerRow = 10
    const numRows = 6
    const baseImageWidth = numCardsPerRow * cardWidth
    const baseImageHeight = numRows * cardHeight
    const cardPaths = []

    // TODO: Move card downloading to a separate function
    const cardDir = path.join("public", "cards")
    if (!fs.existsSync(cardDir)) {
        fs.mkdirSync(cardDir)
    }

    // downloading cards for image creation
    for (const card of cards) {
        const cardPath = path.join(cardDir, '~' + uuidv4() + '.png')
        console.log(card.name, cardPath);
        try {
            // have to account for imageUrlHiRes property of dataset being renamed to lowercase
            await downloadImage(card.imageUrlHiRes != null ? card.imageUrlHiRes : card.imageurlhires, cardPath)
        } catch (error) {
            console.log(error);
            throw (error)
        }
        cardPaths.push(cardPath)
    }

    async function placeCardOnImgAtPoint(baseImg, cardImg, x, y) {
        await baseImg.composite(cardImg, x, y, [jimp.BLEND_DESTINATION_OVER, 0, 0])
    }

    const imgBuffer = await new Promise((resolve, reject) => {
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
                resolve(await baseImg.getBufferAsync(jimp.MIME_PNG))
            })
        } catch (error) {
            reject(error)
        }
    })

    const fileName = `${uuidv4()}.png`
    // Note: don't actually have to download card since sending to AWS S3
    const data = await uploadToAWS(fileName, jimp.MIME_PNG, imgBuffer)
    const deckJsonHref = data.Location
    // delete downloaded cards since they are no longer needed
    // TODO: Move to function? Should if download becomes a function
    cardPaths.forEach(cardPath => fs.unlinkSync(cardPath))
    return deckJsonHref
}

async function makeDeckListText(cards) {
    return await new Promise((resolve, reject) => {
        const appPath = path.dirname(require.main.filename)
        const destDir = path.join(appPath, 'public', 'deck-txts')
        const ext = '.txt'
        const absPath = generateFilePath(destDir, ext)
        const downloadHref = path.relative('public', absPath)
        try {
            let deckList = ""
            for (const card of cards) {
                deckList += `${card.count} ${card.name} ${card.setCode != null ? card.setCode.toUpperCase() : card.setcode.toUpperCase()} ${card.number}\n`
            }
            fs.writeFileSync(absPath, deckList)
        } catch (error) {
            reject(error)
        }
        // make sure relative to root web directory
        resolve('/' + downloadHref)
    })
}

export default router