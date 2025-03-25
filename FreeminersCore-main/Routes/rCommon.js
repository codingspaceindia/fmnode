const express = require('express');
const router = express.Router();
const responseServ = require('../Service/responseService');
const mTodayCoinValue = require('../Models/mTodayCoinValue');
const mBalance = require('../Models/mBalance');
const mTransferWallet = require('../Models/mTransferWallet');
const mUser = require('../Models/mUser');
const mStakingWallet = require('../Models/mStakingWallet');
const mBusinessTotal = require('../Models/mBusinessTotal');
const mOfferWallet = require('../Models/mOfferWallet');
const mEarningWallet = require('../Models/mEarningWallet');
const mTotalWallet = require('../Models/mTotalWallet');
const mSupport = require('../Models/mSupport');
const mDailyLeftRight = require('../Models/mDailyLeftRight');
const mNodes = require('../Models/mNodes');
const multer = require('multer')
const fileServ = require('../Service/fileService');
const mMedia = require('../Models/mMedia');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const mailServ = require('../Service/mailService');
const mOTP = require('../Models/mOTP');
const mActiveUser = require('../Models/mActiveUser');
const mWalletHistory = require('../Models/mWalletHistory');

router.get('/getDashboardDetails', async (req, res) => {
    try {
        const userId = req.body.token.subject._id;
        const refId = req.body.token.subject.refId;
        const [
            rosTotal,
            coinValue,
            totalStaking,
            // businessTotal,
            offerWallet,
            stakingWallet,
            transferWallet,
            earningWallet,
            todayBonus,
            totalWallet,
            activeUsers,
            getVisibleMedia
        ] = await Promise.all([
            // mWalletHistory.findOne({ userId, walletType: "staking" }, {}, {}).sort({ _id: -1 }),
            mWalletHistory.findOne({
                $or: [
                    { userId: userId },
                    { refId: refId }
                ], walletType: "staking"
            }, {}, {}).sort({ _id: -1 }),
            mTodayCoinValue.findOne({}, {}, { sort: { _id: -1 } }),
            mBalance.findOne({ userId }, {}, {}),
            // mBusinessTotal.findOne({ userId }, {}, {}),
            mOfferWallet.findOne({ userId }, {}, {}),
            mStakingWallet.findOne({ userId }, {}, {}),
            mTransferWallet.findOne({ userId }, {}, {}),
            mEarningWallet.findOne({ userId }, {}, {}),
            mDailyLeftRight.findOne({ userId }, {}, {}),
            mTotalWallet.findOne({ userId }, {}, {}),
            mActiveUser.findOne({ userId }, {}, {}),
            mMedia.find({ isViewable: true })
        ]);

        // const result = await buildOrgChart(rootNodes, userId);

        const totalWalletCoins = [
            offerWallet?.walletCoins || 0,
            stakingWallet?.walletCoins || 0,
            earningWallet?.walletCoins || 0
        ].reduce((acc, val) => acc + val, 0);

        const responseBody = {
            dailyRos: rosTotal?.walletCoins || 0,
            totalStaking: totalStaking?.totalCoins || 0,
            leftBusinessTotal: activeUsers?.leftBalanceTotal ? activeUsers.leftBalanceTotal : 0,
            rightBusinessTotal: activeUsers?.rightBalanceTotal ? activeUsers.rightBalanceTotal : 0,
            totalWallet: totalWalletCoins,
            transferWallet: transferWallet?.walletCoins || 0,
            stakingWallet: stakingWallet?.walletCoins || 0,
            offerWallet: offerWallet?.walletCoins || 0,
            earningWallet: earningWallet?.walletCoins || 0,
            todayBonus: todayBonus || 0,
            leftCount: activeUsers?.leftUsers ? activeUsers.leftUsers : 0,
            activeLeftCount: activeUsers?.leftActiveUsers ? activeUsers.leftActiveUsers : 0,
            rightCount: activeUsers?.rightUsers ? activeUsers.rightUsers : 0,
            activeRightCount: activeUsers?.rightActiveUsers ? activeUsers.rightActiveUsers : 0,
            medias: getVisibleMedia
        };

        responseServ.sendSuccessResponse(res, responseBody);
    } catch (err) {
        console.error(err);
        responseServ.sendErrorResponse(res, err);
    }
});

router.get('/getCoinValue', async (req, res) => {
    try {
        const coinValue = await mTodayCoinValue.findOne({}).sort({ _id: -1 }).limit(1)
        responseServ.sendSuccessResponse(res, coinValue)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.post('/updateCoinValue', async (req, res) => {
    try {
        const insertCoin = await new mTodayCoinValue(req.body).save()
        responseServ.sendSuccessResponse(res, insertCoin)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getBalance', async (req, res) => {
    try {
        const getBalance = await mBalance.findOne({ userId: req.body.token.subject._id }, {}, {});
        responseServ.sendSuccessResponse(res, getBalance)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getTransferWalletBalance', async (req, res) => {
    try {
        const getTransferWalletBalance = await mTransferWallet.findOne({ userId: req.body.token.subject._id }, {}, {});
        responseServ.sendSuccessResponse(res, getTransferWalletBalance)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.post('/support', async (req, res) => {
    try {
        const submitSupport = await new mSupport(req.body).save()
        responseServ.sendSuccessResponse(res, submitSupport)
    } catch (err) {
        console.log(err)
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getSupportList/:orgCode', async (req, res) => {
    try {
        const supportList = await mSupport.find({ orgCode: req.params.orgCode }, {}, {}).populate('userId');
        responseServ.sendSuccessResponse(res, supportList)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/getTotalBalance', async (req, res) => {
    try {
        const getTotalBalance = await mTotalWallet.findOne({ userId: req.body.token.subject._id }, {}, {});
        responseServ.sendSuccessResponse(res, getTotalBalance)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

const buildOrgChart = async (nodes, rootId) => {
    const balances = await mBalance.find()
    const nodeMap = new Map();
    nodes.forEach(node => {
        if (node.userId) {
            nodeMap.set(node.userId._id.toString(), node);
        }
    });

    const tree = { leftCount: 0, rightCount: 0, leftActiveCount: 0, rightActiveCount: 0 };

    const stack = [rootId];
    while (stack.length) {
        const userId = stack.pop();
        const currentNode = nodeMap.get(userId.toString());
        if (!currentNode) continue;

        const leftChild = currentNode.leftChild && nodeMap.get(currentNode.leftChild.toString());
        const rightChild = currentNode.rightChild && nodeMap.get(currentNode.rightChild.toString());

        if (leftChild) stack.push(leftChild.userId._id.toString());
        if (rightChild) stack.push(rightChild.userId._id.toString());

        tree.leftCount += leftChild ? 1 : 0;
        tree.rightCount += rightChild ? 1 : 0;

        tree.leftActiveCount += leftChild && leftChild.userId.activeStat === "A" ? 1 : 0;
        tree.rightActiveCount += rightChild && rightChild.userId.activeStat === "A" ? 1 : 0;
    }

    return tree;
};

router.post('/addMedia', upload.array('files'), fileServ.uploadFiles, async (req, res) => {
    try {
        const mediaImages = await req.body.uploadResults;
        const mediaData = mediaImages.map((x) => ({
            fileUrl: x
        }))
        const bulkOps = mediaData.map(data => ({
            insertOne: {
                document: data
            }
        }));
        await mMedia.bulkWrite(bulkOps)
            .then(result => {
                console.log('Bulk write operation result:', result);
            })
            .catch(err => {
                console.error('Bulk write operation error:', err);
            });
        responseServ.sendSuccessResponse(res, true)
    } catch (err) {
        console.log(err)
    }
})

router.get('/getUploadedFiles', async (req, res) => {
    try {
        const medias = await mMedia.find({}, {}, {});
        responseServ.sendSuccessResponse(res, medias)
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

router.get('/requestOTP', async (req, res) => {
    try {
        console.log(req.body)
        const user = await mUser.findOne({ _id: req.body.token.subject._id }, {}, {});
        let values = {
            refId: user.refId,
            mailId: user.mailId,
            recipientEmail: user.mailId
        }
        const sendOTP = await mailServ.sendOtpEmail(values);
        responseServ.sendSuccessResponse(res, sendOTP)
    } catch (err) {
        console.log(err)
    }
})

router.post('/verifyOTP', async (req, res) => {
    try {
        const otp = await mOTP.findOne({ refId: req.body.refId, activeStat: 'A' });
        console.log(otp)
        if (otp) {
            if (otp.otp === req.body.otp) {
                otp.activeStat = 'D'
                await mOTP.findOneAndUpdate({ _id: otp._id }, otp);
                responseServ.sendSuccessResponse(res, { message: "OTP verified successfully" })
            } else {
                responseServ.sendErrorResponse(res, { message: "Incorrect OTP" })
            }
        } else {
            responseServ.sendErrorResponse(res, { message: "Incorrect OTP" })
        }
    } catch (err) {
        console.log(err)
    }
})

router.post('/requestNewOTP', async (req, res) => {
    try {
        const user = await mUser.findOne({ refId: req.body.refId }, {}, {});
        let values = {
            refId: user.refId,
            mailId: user.mailId,
            recipientEmail: user.mailId
        }
        const sendOTP = await mailServ.sendOtpEmail(values);
        responseServ.sendSuccessResponse(res, sendOTP)
    } catch (err) {
        console.log(err)
    }
})

module.exports = router