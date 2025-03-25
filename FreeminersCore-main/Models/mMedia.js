const mongoose = require('mongoose')
const typeStringReq = { type: String, required: true }
const typeBoolean = { type: Boolean, default: true }
const typeActive = { type: String, default: 'A' }


const mediaSchema = new mongoose.Schema({
    fileUrl: typeStringReq,
    isViewable: typeBoolean,
    activeStat: typeActive
})

mediaSchema.set('timestamps', true)

module.exports = mongoose.model('media', mediaSchema, 'media')