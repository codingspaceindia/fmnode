const mongoose = require('mongoose')
const typeString = { type: String, default: null }
const typeStringReq = { type: String, required: true }
const typeActive = { type: String, default: 'A' }
const typeNumber = { type: Number, default: 0 }

const balanceSchema = new mongoose.Schema({
    balance: typeNumber,
    totalCoins: typeNumber,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    refId: typeStringReq,
    pairMatchedAmount: typeNumber,
    pairMatchOverDue: typeNumber,
    parentRefId: typeString,
    activeStat: typeActive
})

balanceSchema.set('timestamps', true)

module.exports = mongoose.model('balance', balanceSchema, 'balance')