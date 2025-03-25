const express = require('express');
const router = express.Router();
const responseServ = require('../Service/responseService');
const mMaintanence = require('../Models/mMaintanence');
const mConfig = require('../Models/mConfig');

router.post('/updateMaintanence', async (req, res) => {
    try {
        const getMaintanence = await mMaintanence.findOne({}, {}, {});
        if (getMaintanence === null) {
            const inserMaintence = await new mMaintanence(req.body).save();
            responseServ.sendSuccessResponse(res, inserMaintence)
        } else {
            const updateMaintanence = await mMaintanence.findOneAndUpdate({ _id: req.body._id }, req.body, {})
            responseServ.sendSuccessResponse(res, updateMaintanence)
        }
    } catch (err) {
        console.log(err)
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getMaintanenceReport', async (req, res) => {
    try {
        const getMaintanence = await mMaintanence.findOne({}, {}, {});
        responseServ.sendSuccessResponse(res, getMaintanence)
    } catch (err) {
        console.log(err)
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getConfigs/:orgCode', async (req, res) => {
    try {
        const getConfigs = await mConfig.findOne({ orgCode: req.params.orgCode }, {}, {});
        responseServ.sendSuccessResponse(res, getConfigs)
    } catch (err) {
        console.log(err)
        responseServ.sendErrorResponse(res, err)
    }
})

router.post('/updateConfig/:orgCode', async (req, res) => {
    try {
        const getConfig = await mConfig.findOne({ orgCode: req.params.orgCode }, {}, {});
        console.log(getConfig)
        if (getConfig === null) {
            let values = {}
            if (req.body.action === 'pairMatch') {
                values.pairMatchCommission = req.body.value
            } else if (req.body.action === 'joinBonus') {
                values.joinBonusCommission = req.body.value
            } else if (req.body.action === 'leftRight') {
                values.leftRightCommission = req.body.value
            } else if (req.body.action === 'referral') {
                values.referralCommission = req.body.value
            } else if (req.body.action === 'topup') {
                values.topupCommission = req.body.value
            } else if (req.body.action === 'ros') {
                values.rosCommission = req.body.value
            }
            values.orgCode = req.body.orgCode
            const newConfig = await new mConfig(values).save();
            responseServ.sendSuccessResponse(res, newConfig)
        } else {
            if (req.body.action === 'pairMatch') {
                getConfig.pairMatchCommission = req.body.value
            } else if (req.body.action === 'joinBonus') {
                getConfig.joinBonusCommission = req.body.value
            } else if (req.body.action === 'leftRight') {
                getConfig.leftRightCommission = req.body.value
            } else if (req.body.action === 'referral') {
                getConfig.referralCommission = req.body.value
            } else if (req.body.action === 'topup') {
                getConfig.topupCommission = req.body.value
            } else if (req.body.action === 'ros') {
                getConfig.rosCommission = req.body.value
            }
            const updateConfig = await mConfig.findOneAndUpdate({ orgCode: req.body.orgCode }, getConfig, {});
            responseServ.sendSuccessResponse(res, updateConfig);
        }
    } catch (err) {
        console.log(err)
        responseServ.sendErrorResponse(res, err)
    }
})

module.exports = router