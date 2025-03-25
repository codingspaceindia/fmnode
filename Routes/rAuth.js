const express = require('express')
const router = express.Router()
const responseService = require('../Service/responseService')
const argon2 = require('argon2')
const jwt = require('jsonwebtoken');
const mAuth = require('../Models/mAuth')
const mUser = require('../Models/mUser')
const crypto = require('crypto');
const mailService = require('../Service/mailService')

// Define the algorithm, key, and initialization vector (IV)
const algorithm = 'aes-256-cbc';
const passphrase = 'FREEMINERS+CODINGSPACE'; // Replace with your secure passphrase
const key = crypto.createHash('sha256').update(passphrase).digest('base64').substr(0, 32); // Generate a 256-bit (32-byte) key

const iv = crypto.randomBytes(16);

router.post('/login', async (req, res) => {
    try {
        let fetchAuth = await mAuth.findOne({ refId: req.body.refId, activeStat: 'A' }, {}, { lean: true });
        if (fetchAuth === null) {
            responseService.sendErrorResponse(res, "Account not found")
        } else {
            if (fetchAuth.password === req.body.password) {
                let userDetails = await mUser.findOne({ _id: fetchAuth.userId }, {}, { lean: true }).populate('address')
                const payload = { subject: userDetails }
                const token = jwt.sign(payload, "FREEMINERS+CODINGSPACE")
                responseService.sendSuccessResponse(res, token)
            } else {
                responseService.sendErrorResponse(res, "Password Or RefId is incorrect")
            }
        }
    } catch (err) {
        responseService.sendErrorResponse(res, err)
    }
})

router.post('/forgotPassword', async (req, res) => {
    try {
        let fetchAuth = await mAuth.findOne({ refId: req.body.refId, activeStat: 'A' }, {}, { lean: true });
        if (fetchAuth === null) {
            responseService.sendErrorResponse(res, "Account not found")
        } else {
            let user = await mUser.findOne({ _id: fetchAuth.userId, activeStat: 'A' }, {}, { lean: true })
            console.log(user.mailId)
            let mailContent = {
                recipientEmail: user.mailId,
                subject: "RESET PASSWORD | OTP",
            }
            await mailService.sendOtpEmail(mailContent)
            // Need to implement the message service to send the otp and then needs to verify the otp;
            responseService.sendSuccessResponse(res, { message: "OTP sent" })
        }
    } catch (err) {
        console.log(err)
        responseService.sendErrorResponse(res, err)
    }
})

router.post('/changePassword', async (req, res) => {
    try {
        const updatePass = await mAuth.findOne({ refId: req.body.token.subject.refId, activeStat: 'A' }, {}, {})
        updatePass.password = req.body.newPassword
        const update = await mAuth.findOneAndUpdate({ refId: req.body.token.subject.refId }, updatePass, {})
        responseService.sendSuccessResponse(res, update)
    } catch (err) {
        console.log(err)
        responseService.sendErrorResponse(res, err)
    }
})

router.post('/resetPassword', async (req, res) => {
    try {
        const updatePass = await mAuth.findOne({ refId: req.body.refId, activeStat: 'A' }, {}, {});
        updatePass.password = req.body.password
        const update = await mAuth.findOneAndUpdate({ refId: req.body.refId }, updatePass, {});
        responseService.sendSuccessResponse(res, update)
    } catch (err) {
        console.log(err)
        responseService.sendErrorResponse(res, err)
    }
})

module.exports = router