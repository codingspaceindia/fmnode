const mongoose = require('mongoose')
const typeString = { type: String, default: null }
const typeStringReq = { type: String, required: true }
const typeActive = { type: String, default: 'A' }
const typeBoolean = { type: Boolean, default: false }
const topupType = { type: String, default: 'Normal Staking' }
const typeNumber = { type: Number, default: 0 }

const topupHistorySchema = new mongoose.Schema({
    balance: typeNumber,
    totalCoins: typeNumber,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    refId: typeStringReq,
    parentRefId: typeString,
    activeStat: typeActive,
    yearlyDeduction: typeBoolean,
    topupDate: {
        type: Date,
        default: Date.now
    },
    message: typeString,
    topupType: topupType
})

topupHistorySchema.set('timestamps', true)

module.exports = mongoose.model('stakingHistory', topupHistorySchema, 'stakingHistory')