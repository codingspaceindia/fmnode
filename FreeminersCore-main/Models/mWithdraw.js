const mongoose = require('mongoose');
const typeString = { type: String, default: null }
const typeStringReq = { type: String, required: true }
const typeNumber = { type: Number, default: 0 }
const typeActive = { type: String, default: 'A' }
const withdrawStat = { type: String, default: 'Pending' }

const withDrawSchema = new mongoose.Schema({
    amount: typeNumber,
    coins: typeNumber,
    parentRefId: typeString,
    refId: typeStringReq,
    withDrawType: typeStringReq,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    status: withdrawStat,
    activeStat: typeActive,
})

withDrawSchema.set('timestamps', true)

module.exports = mongoose.model('withdraw', withDrawSchema, 'withdraw')