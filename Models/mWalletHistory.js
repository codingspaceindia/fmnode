const mongoose = require('mongoose');
const typeString = { type: String, default: null }
const typeNumber = { type: Number, default: 0 }
const typeStringReq = { type: String, required: null }
const typeActive = { type: String, default: 'A' }

const walletHistorySchema = new mongoose.Schema({
    walletCoins: typeNumber,
    walletBalance: typeNumber,
    refId: typeStringReq,
    name: typeString,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    fromRefId: typeString,
    toRefId: typeString,
    walletType: typeStringReq,
    parentRefId: typeString,
    date: typeStringReq,
    message: typeString,
    childRefId: typeString,
    activeStat: typeActive
})

walletHistorySchema.set('timestamps', true)

module.exports = mongoose.model('walletHistory', walletHistorySchema, 'walletHistory')