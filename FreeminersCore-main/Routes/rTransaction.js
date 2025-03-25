const express = require('express')
const router = express.Router()
const transactionServ = require('../Service/transactionService')
const responseServ = require('../Service/responseService')
const mTopupRequest = require('../Models/mTopupRequest')
const mWithdraw = require('../Models/mWithdraw')

router.post('/topup', async (req, res) => {
    try {
        const submitRequest = await transactionServ.submitTopupRequest(req.body)
        responseServ.sendSuccessResponse(res, submitRequest)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.post('/approveOrRejection', async (req, res) => {
    try {
        const decision = await transactionServ.topupRequestDecision(req.body)
        responseServ.sendSuccessResponse(res, decision)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getTopupRequestList', async (req, res) => {
    try {
        const getList = await mTopupRequest.find({ status: 'Pending' }, {}, {}).populate('userId proof')
        responseServ.sendSuccessResponse(res, getList)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})


router.post('/withdraw', async (req, res) => {
    try {
        const withDraw = await transactionServ.withDrawFunction(req.body);
        responseServ.sendSuccessResponse(res, withDraw)
    } catch (err) {
        console.log(err)
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getWithDrawRequest', async (req, res) => {
    try {
        const request = await mWithdraw.find({ status: 'Pending' }, {}, {}).populate('userId');
        responseServ.sendSuccessResponse(res, request)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.post('/approveOrRejectionWithdraw', async (req, res) => {
    try {
        const decision = await transactionServ.withdrawDecision(req.body);
        responseServ.sendSuccessResponse(res, decision)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.post('/transfer-wallet', async (req, res) => {
    try {
        const transferWallet = await transactionServ.transferWallet(req.body)
        responseServ.sendSuccessResponse(res, transferWallet)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.post('/adminTopup', async (req, res) => {
    try {
        const topupAccount = await transactionServ.adminTopup(req.body);
        responseServ.sendSuccessResponse(res, topupAccount)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

module.exports = router