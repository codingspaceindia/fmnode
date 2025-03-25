const mongoose = require('mongoose')
const typeStringReq = { type: String, required: true }
const typeNumber = { type: Number, default: 0 }
const typeStatus = { type: String, default: 'A' }

const dailyTargetSchema = new mongoose.Schema({
    leftBusinessTotal: typeNumber,
    rightBusinessTotal: typeNumber,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    date: typeStringReq,
    day: typeNumber,
    year: typeNumber,
    month: typeNumber,
    activeStat: typeStatus
})

dailyTargetSchema.set('timestamps', true)

module.exports = mongoose.model('dailyLeftRight', dailyTargetSchema, 'dailyLeftRight')