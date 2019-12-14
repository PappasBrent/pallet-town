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
    // keys are urls to cards
    cardUrlCounts: {
        type: Map,
        of: Number
    }
})

export default mongoose.model('Deck', deckSchema)