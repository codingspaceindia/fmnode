const mongoose = require('mongoose');

const businessTotalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
        required: true,
        unique: true
    },
    name: { type: String, default: null },
    leftBusinessTotal: { type: Number, default: 0 },
    rightBusinessTotal: { type: Number, default: 0 }
});

module.exports = mongoose.model('BusinessTotal', businessTotalSchema, 'businessTotals');
