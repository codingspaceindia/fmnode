const mongoose = require('mongoose');
const typeBoolean = { type: Boolean, default: true };
const typeString = { type: String, default: null }

const configSchema = new mongoose.Schema({
    pairMatchCommission: typeBoolean,
    joinBonusCommission: typeBoolean,
    leftRightCommission: typeBoolean,
    referralCommission: typeBoolean,
    topupCommission: typeBoolean,
    rosCommission: typeBoolean,
    orgCode: typeString,
})

configSchema.set('timestamps', true)

module.exports = mongoose.model('config', configSchema, 'config')

