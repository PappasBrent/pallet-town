const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    decks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deck'
    }]
})

module.exports = mongoose.model('User', userSchema)