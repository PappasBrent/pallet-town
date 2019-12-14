import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    decks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deck'
    }]
})

export default mongoose.model('User', userSchema)