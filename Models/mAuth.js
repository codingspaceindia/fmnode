const mongoose = require('mongoose')
const typeString = { type: String, default: null }
const typeStringReq = { type: String, required: true }
const typeNumber = { type: Number, default: 0 }
const typeActive = { type: String, default: 'A' }

const authSchema = new mongoose.Schema({
    refId: typeStringReq,
    password: typeStringReq,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    activeStat: typeActive
})

authSchema.set('timestamps', true)

module.exports = mongoose.model('auth', authSchema, 'auth')