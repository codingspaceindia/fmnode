const mongoose = require('mongoose')
const typeString = { type: String, default: null }
const typeStringReq = { type: String, required: true }
const typeNumber = { type: Number, default: 0 }
const typeActive = { type: String, default: 'A' }

const nodeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users'
    },
    leftChild: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
    },
    rightChild: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
    },
    activeStat: typeActive
})

nodeSchema.set('timestamps', true)

module.exports = mongoose.model('nodes', nodeSchema, 'nodes')