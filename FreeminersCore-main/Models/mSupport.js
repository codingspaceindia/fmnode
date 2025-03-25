const mongoose = require('mongoose')
const typeStringReq = { type: String, required: true }
const typeStat = { type: String, default: 'Pending' }
const typeString = { type: String, default: null }
const typeActive = { type: String, default: 'A' }

const supportSchema = new mongoose.Schema({
    refId: typeStringReq,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    orgCode: typeString,
    message: typeStringReq,
    status: typeStat,
    activeStat: typeActive,
})

supportSchema.set('timestamps', true)

module.exports = mongoose.model('support', supportSchema, 'support')