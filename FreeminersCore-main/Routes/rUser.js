const express = require('express')
const router = express.Router();
const responseService = require('../Service/responseService')
const userService = require('../Service/UserService')
const mUser = require('../Models/mUser');
const mBankDetails = require('../Models/mBankDetails');
const mPanDetails = require('../Models/mPanDetails');
const mBalance = require('../Models/mBalance');
const mAuth = require('../Models/mAuth');

router.post('/createUser', async (req, res) => {
    try {
        const user = await mUser.findOne({ mailId: req.body.mailId }, {}, {})
        if (user === null) {
            const newUser = await userService.createUser(req.body);
            responseService.sendSuccessResponse(res, newUser)
        } else {
            res.status(204).send({ data: { message: 'Email Id already exists' } })
        }
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})


router.get('/getUserDetails/:refId', async (req, res) => {
    try {
        const getDetails = await mUser.findOne({ refId: req.params.refId }, {}, {})
        responseService.sendSuccessResponse(res, getDetails)
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})

router.post('/updateUser', async (req, res) => {
    try {
        const updateUser = await userService.updateUser(req.body);
        responseService.sendSuccessResponse(res, updateUser)
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})

router.get('/getBankDetails/:userId', async (req, res) => {
    try {
        const getBankDetails = await mBankDetails.findOne({ userId: req.params.userId }, {}, {})
        responseService.sendSuccessResponse(res, getBankDetails)
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})


router.post('/uploadBankDetails', async (req, res) => {
    try {
        const uploadBank = await userService.uploadBankDetails(req.body)
        responseService.sendSuccessResponse(res, uploadBank)
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})


router.get('/getPanDetails/:userId', async (req, res) => {
    try {
        const getPanDetails = await mPanDetails.findOne({ userId: req.params.userId }, {}, {});
        responseService.sendSuccessResponse(res, getPanDetails)
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})

router.post('/uploadPanDetails', async (req, res) => {
    try {
        const uploadPan = await userService.uploadPanDetails(req.body);
        responseService.sendSuccessResponse(res, uploadPan)
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})

router.get('/getAllUsers', async (req, res) => {
    try {
        const userList = await mUser.find({}, {}, {});
        responseService.sendSuccessResponse(res, userList);
    } catch (err) {
        console.log(err)
        responseService.sendErrorResponse(res, err)
    }
})

router.get('/getTotalInvestment', async (req, res) => {
    try {
        const investmentList = await mBalance.find({}, {}, {}).populate('userId');
        responseService.sendSuccessResponse(res, investmentList)
    } catch (err) {
        console.log(err)
        responseService.sendErrorResponse(res, err)
    }
})

router.get('/getAllUsersAuth', async (req, res) => {
    try {
        const getAllMessage = await mAuth.find({}, {}, {}).populate('userId');
        responseService.sendSuccessResponse(res, getAllMessage)
    } catch (err) {
        console.log(err)
        responseService.sendErrorResponse(res, err)
    }
})

module.exports = router