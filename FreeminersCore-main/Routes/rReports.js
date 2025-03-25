const express = require('express')
const router = express.Router()
const responserv = require('../Service/responseService')
const mUser = require('../Models/mUser')
const mWalletHistory = require('../Models/mWalletHistory')
const mTopupHistory = require('../Models/mTopupHistory')
const mWithdraw = require('../Models/mWithdraw')
const { jsPDF } = require('jspdf');
const ExcelJS = require('exceljs');
const mBalance = require('../Models/mBalance')
const mTopupRequest = require('../Models/mTopupRequest')
const mCoinValue = require('../Models/mTodayCoinValue')
const mNodes = require('../Models/mNodes')

router.get('/direct-referral', async (req, res) => {
    try {
        const refId = req.body.token.subject.refId;

        const referralUsers = await mUser.find({ parentRefId: refId }).lean();

        const referralUserIds = referralUsers.map(user => user._id);
        const nodes = await mNodes.find({
            $or: [{ leftChild: { $in: referralUserIds } }, { rightChild: { $in: referralUserIds } }]
        }).lean();

        const nodePositionMap = {};
        nodes.forEach(node => {
            if (node.leftChild) nodePositionMap[node.leftChild] = 'LEFT';
            if (node.rightChild) nodePositionMap[node.rightChild] = 'RIGHT';
        });

        referralUsers.forEach(user => {
            user.position = nodePositionMap[user._id] || 'RIGHT';
        });

        const balances = await mBalance.find({ parentRefId: refId }).lean();

        const balanceMap = balances.reduce((acc, balance) => {
            acc[balance.userId] = balance;
            return acc;
        }, {});

        const usersWithBalance = referralUsers.map(user => ({
            ...user,
            balance: balanceMap[user._id] || null
        }));

        responserv.sendSuccessResponse(res, usersWithBalance);
    } catch (err) {
        responserv.sendErrorResponse(res, err);
    }
});

router.get('/walletReport/:reportType', async (req, res) => {
    try {
        const refId = req.body.token.subject.refId
        const getReports = await mWalletHistory.find({ refId: refId, walletType: req.params.reportType }, {}, {}).sort({ _id: -1 })
        responserv.sendSuccessResponse(res, getReports)
    } catch (err) {
        responserv.sendErrorResponse(res, err)
    }
})

router.get('/stakingReport', async (req, res) => {
    try {
        const refId = req.body.token.subject.refId
        const coinValue = await mCoinValue.findOne({}).sort({ _id: -1 }).limit(1)
        const getTopupRequestReport = await mTopupRequest.find({ refId: refId, status: { $ne: 'Approve' } }, {}, {}).sort({ _id: -1 });
        let topupHistory = []
        getTopupRequestReport.map((topup) => {
            let values = {
                balance: topup.amount,
                totalCoins: coinValue.oneCoinPrice * topup.amount,
                userId: topup.userId,
                refId: topup.refId,
                parentRefId: topup.parentRefId,
                status: topup.status,
                message: null,
                topupType: 'Normal Staking',
                createdAt: topup.createdAt,
            }
            topupHistory.push(values)
        })
        const getStakingReports = await mTopupHistory.find({ refId: refId }, {}, {})
        responserv.sendSuccessResponse(res, [...getStakingReports, ...topupHistory])
    } catch (err) {
        responserv.sendErrorResponse(res, err)
    }
})

router.get('/withDrawReport', async (req, res) => {
    try {
        const refId = req.body.token.subject.refId
        const getWithDrawReports = await mWithdraw.find({ refId: refId }, {}, {}).sort({ _id: -1 })
        responserv.sendSuccessResponse(res, getWithDrawReports)
    } catch (err) {
        responserv.sendErrorResponse(res, err)
    }
})

router.get('/allWithDrawReport', async (req, res) => {
    try {
        const getWithDrawReports = await mWithdraw.find({}, {}, {}).populate('userId').sort({ _id: -1 })
        responserv.sendSuccessResponse(res, getWithDrawReports)
    } catch (err) {
        responserv.sendErrorResponse(res, err)
    }
})

router.get('/allWithDrawReportList/:fromDate/:toDate', async (req, res) => {
    try {
        const { fromDate, toDate } = req.params;
        const getWithDrawReports = await mWithdraw.find({
            updatedAt: {
                $gte: fromDate,
                $lte: toDate
            }
        }, {}, {}).populate('userId').sort({ _id: -1 })
        responserv.sendSuccessResponse(res, getWithDrawReports)
    } catch (err) {
        responserv.sendErrorResponse(res, err)
    }
})

router.get('/allStakingReport', async (req, res) => {
    try {
        const getStakingReports = await mTopupHistory.find({}, {}, {}).populate('userId').sort({ _id: -1 })
        responserv.sendSuccessResponse(res, getStakingReports)
    } catch (err) {
        responserv.sendErrorResponse(res, err)
    }
})

router.get('/allStakingReportList/:fromDate/:toDate', async (req, res) => {
    try {
        const { fromDate, toDate } = req.params;
        const getStakingReports = await mTopupHistory.find({
            topupDate: {
                $gte: fromDate,
                $lte: toDate
            }
        }).populate('userId').sort({ _id: -1 });
        responserv.sendSuccessResponse(res, getStakingReports)
    } catch (err) {
        responserv.sendErrorResponse(res, err)
    }
})


router.get('/downloadWithDrawReport', async (req, res) => {
    try {
        const format = req.query.format; // pdf or xlsx
        const getWithDrawReports = await mWithdraw.find({}, {}, {}).populate('userId').sort({ _id: -1 });

        if (format === 'pdf') {
            const doc = new jsPDF();
            let y = 10;
            doc.text('Withdrawal Report', 10, y);
            y += 10;
            getWithDrawReports.forEach(report => {
                doc.text(`RefId: ${report.refId}, ParentRefId:${report.userId.parentRefId}, Amount: ${report.amount}, Coins: ${report.coins}, Status: ${report.status}`, 10, y);
                y += 10;
            });

            const pdfBase64 = Buffer.from(doc.output('arraybuffer')).toString('base64');
            responserv.sendSuccessResponse(res, { file: pdfBase64, format: 'pdf' });

        } else if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Withdrawal Report');

            worksheet.columns = [
                { header: 'RefId', key: 'refId', width: 20 },
                { header: 'ParentRefId', key: 'parentRefId', width: 20 },
                { header: 'Amount', key: 'amount', width: 20 },
                { header: 'Coins', key: 'coins', width: 20 },
                { header: 'Status', key: 'status', width: 20 },
            ];

            getWithDrawReports.forEach(report => {
                worksheet.addRow({
                    refId: report.refId,
                    parentRefId: report.userId.parentRefId,
                    amount: report.amount,
                    coins: report.coins,
                    status: report.status
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const xlsxBase64 = buffer.toString('base64');
            responserv.sendSuccessResponse(res, { file: xlsxBase64, format: 'xlsx' });
        } else {
            responserv.sendErrorResponse(res, 'Invalid format');
        }
    } catch (err) {
        console.log(err)
        responserv.sendErrorResponse(res, err);
    }
});


router.get('/downloadStakingReport', async (req, res) => {
    try {
        const format = req.query.format; // pdf or xlsx
        const getWithDrawReports = await mTopupHistory.find({}, {}, {}).populate('userId').sort({ _id: -1 });

        if (format === 'pdf') {
            const doc = new jsPDF();
            let y = 10;
            doc.text('Staking Report', 10, y);
            y += 10;
            getWithDrawReports.forEach(report => {
                doc.text(`RefId: ${report.refId}, Name:${report.userId.name}, ParentRefId:${report.userId.parentRefId}, Amount: ${report.balance}, Coins: ${report.totalCoins}, Topup Date: ${report.topupDate}`, 10, y);
                y += 10;
            });

            const pdfBase64 = Buffer.from(doc.output('arraybuffer')).toString('base64');
            responserv.sendSuccessResponse(res, { file: pdfBase64, format: 'pdf' });

        } else if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Staking Report');

            worksheet.columns = [
                { header: 'RefId', key: 'refId', width: 20 },
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Parent Ref Id', key: 'parentRefId', width: 20 },
                { header: 'Amount', key: 'amount', width: 20 },
                { header: 'Coins', key: 'coins', width: 20 },
                { header: 'Topup Date', key: 'topupDate', width: 20 },
            ];

            getWithDrawReports.forEach(report => {
                worksheet.addRow({
                    refId: report.refId,
                    name: report.userId.name,
                    parentRefId: report.userId.parentRefId,
                    amount: report.balance,
                    coins: report.totalCoins,
                    topupDate: report.topupDate
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const xlsxBase64 = buffer.toString('base64');
            responserv.sendSuccessResponse(res, { file: xlsxBase64, format: 'xlsx' });
        } else {
            responserv.sendErrorResponse(res, 'Invalid format');
        }
    } catch (err) {
        console.log(err)
        responserv.sendErrorResponse(res, err);
    }
});

module.exports = router