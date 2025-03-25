const mongoose = require('mongoose')
const typeString = { type: String, default: null }
const typeActive = { type: String, default: 'A' }

const addressSchema = new mongoose.Schema({
    addressLine1: typeString,
    addressLine2: typeString,
    city: typeString,
    district: typeString,
    state: typeString,
    country: typeString,
    pinCode: typeString,
    activeStat: typeActive
})

addressSchema.set('timestamps', true)

module.exports = mongoose.model('address', addressSchema, 'address')