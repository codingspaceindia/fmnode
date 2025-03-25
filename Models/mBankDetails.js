const mongoose = require('mongoose');
const typeStringReq = { type: String, required: true }
const typeString = { type: String, default: null }
const typeActive = { type: String, default: "A" }

const bankDetailsSchema = new mongoose.Schema({
    accountHolderName: typeStringReq,
    accountNo: typeStringReq,
    ifsc: typeStringReq,
    branch: typeStringReq,
    bankName: typeString,
    activeStat: typeActive,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    }
})

bankDetailsSchema.set('timestamps', true)

module.exports = mongoose.model('bankDetaills', bankDetailsSchema, 'bankDetails')