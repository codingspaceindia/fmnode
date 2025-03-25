const mongoose = require('mongoose');
const typeStringReq = { type: String, required: true }
const typeString = { type: String, default: null }
const typeActive = { type: String, default: 'A' }

const panSchema = new mongoose.Schema({
    panName: typeString,
    panCardNo: typeStringReq,
    panProof: typeString,
    refId: typeStringReq,
    activeStat: typeActive,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    }
})

panSchema.set('timestamps', true)

module.exports = mongoose.model('panDetails', panSchema, 'panDetails')