const mongoose = require('mongoose')
const typeString = { type: String, default: null }
const typeStringReq = { type: String, default: null }
const typeNumber = { type: Number, default: 0 }
const typeActive = { type: String, default: 'A' }

const userSchema = new mongoose.Schema({
    userName: typeStringReq,
    name: typeStringReq,
    refId: typeStringReq,
    role: typeStringReq,
    parentRefId: typeString,
    parent: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
        default: null
    },
    mobileNumber: typeStringReq,
    mailId: typeString,
    address: {
        type: mongoose.Schema.ObjectId,
        ref: 'address',
    },
    nomineeName: typeString,
    dob: typeString,
    gender: typeString,
    nomineeRelation: typeString,
    placementId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
        default: null
    },
    leftBonus: { type: Boolean, default: false },
    rightBonus: { type: Boolean, default: false },
    freeCoinAddress: typeString,
    joiningDate: typeString,
    activeStat: typeActive
})

userSchema.set('timestamps', true)

module.exports = mongoose.model('users', userSchema, 'users')