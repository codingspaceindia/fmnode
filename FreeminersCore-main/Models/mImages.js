const mongoose = require('mongoose');
const typeString = { type: String, default: null }
const typeStringReq = { type: String, required: true }
const typeActive = { type: String, default: 'A' }

const imagesSchema = new mongoose.Schema({
    imageUrl: typeString,
    activeStat: typeActive
})

imagesSchema.set('timestamps', true)

module.exports = mongoose.model('images', imagesSchema, 'images')