const mongoose = require('mongoose');
const typeString = { type: String, default: null }
const typeNumber = { type: Number, default: 0 }
const typeStringReq = { type: String, required: null }
const typeActive = { type: String, default: 'A' }

const totalWalletSchema = new mongoose.Schema({
    walletCoins: typeNumber,
    walletBalance: typeNumber,
    refId: typeStringReq,
    name: typeString,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    parentRefId: typeString,
    activeStat: typeActive
})

totalWalletSchema.set('timestamps', true)

module.exports = mongoose.model('totalWallet', totalWalletSchema, 'totalWallet')