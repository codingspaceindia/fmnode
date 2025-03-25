const mongoose = require('mongoose');
const typeNumber = { type: Number, default: 0 }
const typeActive = { type: String, default: 'A' }


const activeUserSchema = new mongoose.Schema({
    leftUsers: typeNumber,
    leftActiveUsers: typeNumber,
    rightUsers: typeNumber,
    rightActiveUsers: typeNumber,
    leftBalanceTotal: typeNumber,
    rightBalanceTotal: typeNumber,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: "users"
    },
    activeStat: typeActive
})

activeUserSchema.set('timestamps', true)

module.exports = mongoose.model('activeUsers', activeUserSchema, 'activeUsers')