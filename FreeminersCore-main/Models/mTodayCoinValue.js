const mongoose = require('mongoose');
const typeActive = { type: String, default: 'A' };
const typeStringReq = { type: String, required: true }
const typeNumber = { type: Number, default: 0 }

const coinValueSchema = new mongoose.Schema({
    date: typeStringReq,
    coinValue: typeNumber,
    oneCoinPrice: typeNumber,
    activeStat: typeActive
})

coinValueSchema.set('timestamps', true)

module.exports = mongoose.model('coinValue', coinValueSchema, 'coinValue')