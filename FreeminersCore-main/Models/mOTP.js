const mongoose = require('mongoose');
const typeString = { type: String, default: null }
const typeActive = { type: String, default: 'A' }

const otpSchema = new mongoose.Schema({
    otp: typeString,
    mailId: typeString,
    refId: typeString,
    activeStat: typeActive
})

otpSchema.set('timestamps', true)

module.exports = mongoose.model("otp", otpSchema, 'otp')