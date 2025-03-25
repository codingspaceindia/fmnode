const mongoose = require('mongoose');
const typeStringReq = { type: String, required: true }
const typeString = { type: String, default: null }
const typeActive = { type: String, default: 'A' }
const typeNumber = { type: Number, default: 0 }
const statusString = { type: String, default: 'Pending' }

const topupSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    amount: typeNumber,
    refId: typeStringReq,
    parentRefId: typeString,
    status: statusString,
    proof: {
        type: mongoose.Schema.ObjectId,
        ref: 'images',
        default: null
    },
    activeStat: typeActive,
})

topupSchema.set('timestamps', true)

module.exports = mongoose.model('topup', topupSchema, 'topup')