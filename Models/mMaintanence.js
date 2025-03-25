const mongoose = require('mongoose');
const typeString = { type: String, default: null }
const typeBoolean = { type: Boolean, default: false }

const maintainSchema = new mongoose.Schema({
    underMaintanence: typeBoolean,
    from: typeString,
    to: typeString,
    fromTime: typeString,
    toTime: typeString,
    message: typeString
})

maintainSchema.set('timestamps', true)

module.exports = mongoose.model('maintanence', maintainSchema, 'maintanence')