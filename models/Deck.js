import mongoose from 'mongoose'

const deckSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Creator'
    },
    // based on json response from https: //pokemontcg.io/
    cards: [mongoose.Schema.Types.Mixed]
})

export default mongoose.model('Deck', deckSchema)