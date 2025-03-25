const mTopupRequest = require("../Models/mTopupRequest")
const mTodayCoinValue = require("../Models/mTodayCoinValue")
const mUsers = require("../Models/mUser")
const mBalance = require('../Models/mBalance')
const mEarningWallet = require("../Models/mEarningWallet")
const mTotalWallet = require("../Models/mTotalWallet")
const mOfferWallet = require("../Models/mOfferWallet")
const mUser = require("../Models/mUser")
const mTopupHistory = require("../Models/mTopupHistory")
const mWalletHistory = require("../Models/mWalletHistory")
const mWithdraw = require('../Models/mWithdraw')
const mTransferWallet = require("../Models/mTransferWallet")
const mConfig = require("../Models/mConfig")
const fileServ = require('../Service/fileService')

exports.submitTopupRequest = async (details) => {
    try {
        const proofUpload = await fileServ.proofUpload(details.proof)
        let values = {
            amount: details.amount,
            otherAmount: details.otherAmount,
            proof: proofUpload._id,
            userId: details.token.subject._id,
            refId: details.token.subject.refId,
            parentRefId: details.token.subject.parentRefId
        }
        const newSubmit = await new mTopupRequest(values).save()
        return newSubmit
    } catch (err) {
        console.log(err)
        return err
    }
}

exports.topupRequestDecision = async (details) => {
    try {
        console.log(details)
        const requestDecision = await mTopupRequest.findById({ _id: details._id }, {}, { lean: true })
        requestDecision.status = details.status
        const updateDecision = await mTopupRequest.findOneAndUpdate({ _id: details._id }, requestDecision, {});
        if (details.status === 'Approve') {
            await updateBalance(requestDecision, "Normal Staking")
        }
        return updateDecision
    } catch (err) {
        console.log(err)
        return err
    }
}

async function updateBalance(details, stakingType = "Normal Staking") {
    try {
        const balanceFetch = await mBalance.findOne({ refId: details.refId }, {}, { lean: true })
        const coinValue = await mTodayCoinValue.findOne({}).sort({ _id: -1 }).limit(1)
        const userDetail = await mUsers.findOne({ refId: details.refId }, {}, {})
        const getConfigs = await mConfig.findOne({ orgCode: 'freeminers' }, {}, {})
        if (balanceFetch === null) {
            let values = {
                balance: details.amount,
                totalCoins: details.amount * coinValue.oneCoinPrice,
                userId: userDetail._id,
                refId: details.refId,
                pairMatchOverDue: 0 + details.amount,
                parentRefId: userDetail.parentRefId
            }
            await new mBalance(values).save();
            if (getConfigs.topupCommission) {
                const offerWallet = await mOfferWallet.findOne({ refId: userDetail.refId }, {}, {})
                const totalChildWallet = await mTotalWallet.findOne({ refId: userDetail.refId }, {}, {});
                totalChildWallet.walletBalance += 1.5
                totalChildWallet.walletCoins += 1.5 * coinValue.oneCoinPrice
                offerWallet.walletBalance += 1.5
                offerWallet.walletCoins += 1.5 * coinValue.oneCoinPrice
                await mOfferWallet.findOneAndUpdate({ userId: userDetail._id }, offerWallet, {});
                await mTotalWallet.findOneAndUpdate({ userId: userDetail._id }, totalChildWallet, {});
                //Need to insert totalWallet for the logged in user
                // Insert a wallet history record for offer wallet
                await new mWalletHistory({
                    walletCoins: 1.5 * coinValue.oneCoinPrice,
                    walletBalance: 1.5,
                    refId: userDetail.refId,
                    name: userDetail.name,
                    userId: userDetail._id,
                    walletType: 'offer',
                    message: "Commision generated for your first topup",
                    parentRefId: userDetail.parentRefId,
                    date: new Date().toISOString(),
                    activeStat: 'A'
                }).save();
                const earningWallet = await mEarningWallet.findOne({ refId: userDetail.parentRefId }, {}, {})
                const totalWallet = await mTotalWallet.findOne({ refId: userDetail.parentRefId }, {}, {})
                const parent = await mUser.findOne({ refId: userDetail.parentRefId }, {}, {});
                if (parent !== null && earningWallet === null) {
                    let values = {
                        walletBalance: ((details.amount / 100) * 10),
                        walletCoins: ((details.amount / 100) * 10) * coinValue.oneCoinPrice,
                        refId: parent.refId,
                        userId: parent._id,
                        parentRefId: parent.parentRefId,
                        name: parent.name
                    }
                    await new mEarningWallet(values).save();
                    await new mTotalWallet(values).save();
                } else {
                    earningWallet.walletBalance += ((details.amount / 100) * 10)
                    earningWallet.walletCoins += ((details.amount / 100) * 10) * coinValue.oneCoinPrice
                    await mEarningWallet.findOneAndUpdate({ refId: parent.refId }, earningWallet, {});
                    totalWallet.walletBalance += ((details.amount / 100) * 10)
                    totalWallet.walletCoins += ((details.amount / 100) * 10) * coinValue.oneCoinPrice
                    await mTotalWallet.findOneAndUpdate({ refId: parent.refId }, totalWallet, {});
                }
                // Insert a wallet history record for earning wallet
                await new mWalletHistory({
                    walletCoins: ((details.amount / 100) * 10) * coinValue.oneCoinPrice,
                    walletBalance: ((details.amount / 100) * 10),
                    refId: parent.refId,
                    name: parent.name,
                    userId: parent._id,
                    walletType: 'earning',
                    message: "Commission generated towards your child first topup",
                    childRefId: userDetail.refId,
                    parentRefId: parent.parentRefId,
                    date: new Date().toISOString(),
                    activeStat: 'A'
                }).save();
            }
            const parent = await mUser.findOne({ refId: userDetail.refId }, {}, {});
            await new mTopupHistory({
                refId: details.refId,
                userId: userDetail._id,
                balance: details.amount,
                parentRefId: parent.parentRefId,
                totalCoins: details.amount * coinValue.oneCoinPrice
            }).save();
        } else {
            balanceFetch.balance = balanceFetch.balance + details.amount
            balanceFetch.totalCoins = balanceFetch.totalCoins + (details.amount * coinValue.oneCoinPrice)
            await mBalance.findByIdAndUpdate({ _id: balanceFetch._id }, balanceFetch, {});
            if (getConfigs.topupCommission) {
                const earningWallet = await mEarningWallet.findOne({ refId: userDetail.parentRefId }, {}, {})
                const totalWallet = await mTotalWallet.findOne({ refId: userDetail.parentRefId }, {}, {});
                const parent = await mUser.findOne({ refId: userDetail.parentRefId }, {}, {});
                if (parent !== null && earningWallet === null) {
                    let values = {
                        walletBalance: ((details.amount) * (10 / 100)),
                        walletCoins: ((details.amount) * (10 / 100)) * coinValue.oneCoinPrice,
                        refId: parent.refId,
                        userId: parent._id,
                        parentRefId: parent.parentRefId,
                        name: parent.name
                    }
                    await new mEarningWallet(values).save();
                    totalWallet === null && await new mTotalWallet(values).save();
                } else {
                    if (earningWallet !== null) {
                        earningWallet.walletBalance += ((details.amount) * (10 / 100))
                        earningWallet.walletCoins += ((details.amount) * (10 / 100)) * coinValue.oneCoinPrice
                        await mEarningWallet.findOneAndUpdate({ refId: parent.refId }, earningWallet, {});
                        totalWallet.walletBalance += ((details.amount) * (10 / 100))
                        totalWallet.walletCoins += ((details.amount) * (10 / 100)) * coinValue.oneCoinPrice
                        await mTotalWallet.findOneAndUpdate({ refId: parent.refId }, totalWallet, {});
                    }
                }
                // Insert a wallet history record for earning wallet
                earningWallet !== null && await new mWalletHistory({
                    walletCoins: ((details.amount) * (10 / 100)) * coinValue.oneCoinPrice,
                    walletBalance: ((details.amount) * (10 / 100)),
                    refId: parent.refId,
                    name: parent.name,
                    userId: parent._id,
                    message: "Commission generated towards your child  topup",
                    walletType: 'earning',
                    parentRefId: parent.parentRefId,
                    date: new Date().toISOString(),
                    activeStat: 'A'
                }).save();

            }
            const parent = await mUser.findOne({ refId: userDetail.refId }, {}, {});
            await new mTopupHistory({
                refId: details.refId,
                userId: userDetail._id,
                balance: details.amount,
                topupType: stakingType,
                parentRefId: parent ? parent.parentRefId : null,
                totalCoins: details.amount * coinValue.oneCoinPrice
            }).save();
        }
    } catch (err) {
        console.log(err)
        return err
    }
}

exports.withDrawFunction = async (details) => {
    try {
        const alreadyExist = await mWithdraw.findOne({ userId: details.token.subject._id }, {}, {}).sort({ _id: -1 }).limit(1)
        const balance = await mBalance.findOne({ userId: details.token.subject._id }, {}, {})
        if (balance !== null && balance.totalCoins > 0) {
            const dayLimitCheck = alreadyExist ? await isWithin15Days(alreadyExist.createdAt) : false
            if (details.withDrawType === 'withdraw' && (alreadyExist === null || !dayLimitCheck || alreadyExist.status === 'Reject')) {
                let withdrawRequest;
                if ((details.coins >= 10000000 && details.coins <= 100000000)) {
                    let values = {
                        amount: details.amount,
                        coins: details.coins,
                        withDrawType: details.withDrawType,
                        parentRefId: details.token.subject.parentRefId,
                        refId: details.token.subject.refId,
                        userId: details.token.subject._id,
                    }
                    withdrawRequest = await new mWithdraw(values).save()
                    const balanceUpdate = await mTotalWallet.findOne({ userId: values.userId }, {}, {});
                    balanceUpdate.walletBalance -= details.amount
                    balanceUpdate.walletCoins -= details.coins
                    await mTotalWallet.findOneAndUpdate({ userId: values.userId }, balanceUpdate, {});
                } else {
                    return { status: 204, message: `Your withdraw limit is between  10000000 to 100000000` }
                }
                return withdrawRequest
            } else if (details.withDrawType === 'internalTransfer') {
                let values = {
                    amount: details.amount,
                    coins: details.coins,
                    withDrawType: details.withDrawType,
                    parentRefId: details.token.subject.parentRefId,
                    refId: details.token.subject.refId,
                    userId: details.token.subject._id,
                    status: 'Approve'
                }
                let withdrawRequest = await new mWithdraw(values).save();
                const balanceUpdate = await mTotalWallet.findOne({ userId: values.userId }, {}, {});
                balanceUpdate.walletBalance -= details.amount
                balanceUpdate.walletCoins -= details.coins
                await mTotalWallet.findOneAndUpdate({ userId: values.userId }, balanceUpdate, {});
                await insertOrUpdateTransferWallet(values)
                return withdrawRequest
            } else {
                return { status: 204, message: `Can't raise now. Please try again later` }
            }
        } else {
            return { status: 204, message: `Can't raise now. Please try again later` }
        }
    } catch (err) {
        console.log(err)
        return err
    }
}

exports.withdrawDecision = async (details) => {
    try {
        if (details.status === 'Decline') {
            const balanceUpdate = await mTotalWallet.findOne({ userId: details.userId }, {}, {});
            const withDrawRequest = await mWithdraw.findOne({ _id: details.withDrawId }, {}, {});
            withDrawRequest.status = details.status
            await mWithdraw.findOneAndUpdate({ _id: details.withDrawId }, withDrawRequest, {});
            balanceUpdate.balance += withDrawRequest.amount
            balanceUpdate.totalCoins += withDrawRequest.coins
            await mTotalWallet.findOneAndUpdate({ userId: details.userId }, balanceUpdate, {});
            return true
        } else {
            const withDrawRequest = await mWithdraw.findOne({ _id: details.withDrawId }, {}, {});
            withDrawRequest.status = details.status
            await mWithdraw.findOneAndUpdate({ _id: details.withDrawId }, withDrawRequest, {});
            return true
        }
    } catch (err) {
        console.log(err)
        return err
    }
}

async function isWithin15Days(createdAt) {
    // Parse the createdAt date
    const createdDate = new Date(createdAt);

    // Get the current date
    const currentDate = new Date();

    // Calculate the difference in milliseconds
    const diffTime = currentDate - createdDate;

    // Convert the difference to days
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    // Check if the difference is less than or equal to 15 days
    return diffDays <= 15;
};

async function insertOrUpdateTransferWallet(details) {
    try {
        const transferWallet = await mTransferWallet.findOne({ refId: details.refId }, {}, {});
        const userDetail = await mUsers.findOne({ refId: details.refId }, {}, {})
        if (transferWallet === null) {
            let values = {
                walletCoins: details.coins,
                walletBalance: details.amount,
                refId: userDetail.refId,
                name: userDetail.name,
                userId: userDetail._id,
                parentRefId: userDetail.parentRefId,
            };
            await new mTransferWallet(values).save()
        } else {
            transferWallet.walletBalance += details.amount
            transferWallet.walletCoins += details.coins
            await mTransferWallet.findOneAndUpdate({ refId: details.refId }, transferWallet, {})
        }
        await new mWalletHistory({
            walletCoins: details.coins,
            walletBalance: (details.amount),
            refId: userDetail.refId,
            name: userDetail.name,
            userId: userDetail._id,
            fromRefId: userDetail.refId,
            toRefId: userDetail.refId,
            message: `Amount transfered to yourself (Internal Transfer)`,
            walletType: 'transfer',
            parentRefId: userDetail.parentRefId,
            date: new Date().toISOString(),
            activeStat: 'A'
        }).save();
        return true
    } catch (err) {
        console.log(err)
        return err
    }
}

exports.transferWallet = async (details) => {
    const getBalance = await mBalance.findOne({ refId: details.token.subject.refId }, {}, {})
    try {
        if (getBalance !== null && getBalance.totalCoins > 0) {
            if (details.transferType === 'transfer') {
                const transferWallet1 = await mTransferWallet.findOne({ refId: details.token.subject.refId }, {}, {}).populate('userId')
                const transferWallet2 = await mTransferWallet.findOne({ refId: details.toWallet }, {}, {}).populate('userId')
                const userDetails = await mUser.findOne({ refId: details.toWallet }, {}, {})
                if (transferWallet2 === null) {
                    let values = {
                        walletCoins: details.transferCoins,
                        walletBalance: details.amount,
                        refId: userDetails.refId,
                        name: userDetails.name,
                        userId: userDetails._id,
                        parentRefId: userDetails.parentRefId,
                    };
                    await new mTransferWallet(values).save()
                    await new mWalletHistory({
                        walletCoins: details.transferCoins,
                        walletBalance: (details.amount),
                        refId: userDetails.refId,
                        name: userDetails.name,
                        userId: userDetails._id,
                        fromRefId: transferWallet1.userId.refId,
                        toRefId: details.toWallet,
                        message: `Amount transferred from ${transferWallet1.userId.refId} to ${details.toWallet}`,
                        walletType: 'transfer',
                        parentRefId: userDetails.parentRefId,
                        date: new Date().toISOString(),
                        activeStat: 'A'
                    }).save();
                    transferWallet1.walletBalance -= details.amount
                    transferWallet1.walletCoins -= parseInt(details.transferCoins)
                    await mTransferWallet.findOneAndUpdate({ refId: details.token.subject.refId }, transferWallet1, {})
                    await new mWalletHistory({
                        walletCoins: details.transferCoins,
                        walletBalance: (details.amount),
                        refId: transferWallet1.userId.refId,
                        name: transferWallet1.userId.name,
                        userId: transferWallet1.userId._id,
                        fromRefId: transferWallet1.userId.refId,
                        toRefId: details.toWallet,
                        walletType: 'transfer',
                        message: `Amount transferred to ${details.toWallet} from your account`,
                        parentRefId: transferWallet1.userId.parentRefId,
                        date: new Date().toISOString(),
                        activeStat: 'A'
                    }).save();
                } else {
                    transferWallet1.walletBalance -= details.amount
                    transferWallet1.walletCoins -= parseInt(details.transferCoins)
                    await mTransferWallet.findOneAndUpdate({ refId: details.token.subject.refId }, transferWallet1, {})
                    await new mWalletHistory({
                        walletCoins: details.transferCoins,
                        walletBalance: (details.amount),
                        refId: transferWallet1.userId.refId,
                        name: transferWallet1.userId.name,
                        userId: transferWallet1.userId._id,
                        fromRefId: transferWallet1.userId.refId,
                        toRefId: details.toWallet,
                        walletType: 'transfer',
                        message: `Amount transferred to ${details.toWallet} from your account`,
                        parentRefId: transferWallet1.userId.parentRefId,
                        date: new Date().toISOString(),
                        activeStat: 'A'
                    }).save();
                    transferWallet2.walletBalance += details.amount
                    transferWallet2.walletCoins += parseInt(details.transferCoins)
                    await mTransferWallet.findOneAndUpdate({ refId: details.toWallet }, transferWallet2, {})
                    await new mWalletHistory({
                        walletCoins: details.transferCoins,
                        walletBalance: (details.amount),
                        refId: transferWallet2.userId.refId,
                        name: transferWallet2.userId.name,
                        userId: transferWallet2.userId._id,
                        fromRefId: transferWallet1.userId.refId,
                        toRefId: details.toWallet,
                        walletType: 'transfer',
                        message: `Amount transferred from ${transferWallet1.userId.refId} to ${details.toWallet}`,
                        parentRefId: transferWallet2.userId.parentRefId,
                        date: new Date().toISOString(),
                        activeStat: 'A'
                    }).save();
                }
                return true
            } else if (details.transferType === 'staking' && (getBalance !== 0 || getBalance !== null)) {
                details.refId = details.token.subject.refId
                const transferWallet1 = await mTransferWallet.findOne({ refId: details.token.subject.refId }, {}, {}).populate('userId')
                const coinValue = await mTodayCoinValue.findOne({}).sort({ _id: -1 }).limit(1)
                await updateBalance(details, 'Internal Staking')
                transferWallet1.walletBalance -= details.amount
                transferWallet1.walletCoins -= parseInt(details.amount * coinValue.oneCoinPrice)
                await mTransferWallet.findOneAndUpdate({ refId: details.token.subject.refId }, transferWallet1, {})
                await new mWalletHistory({
                    walletCoins: details.amount * coinValue.oneCoinPrice,
                    walletBalance: (details.amount),
                    refId: transferWallet1.userId.refId,
                    name: transferWallet1.userId.name,
                    userId: transferWallet1.userId._id,
                    fromRefId: transferWallet1.userId.refId,
                    toRefId: details.toWallet,
                    walletType: 'staking',
                    message: `Amount internally staked to your account`,
                    parentRefId: transferWallet1.userId.parentRefId,
                    date: new Date().toISOString(),
                    activeStat: 'A'
                }).save();
                return true
            }
        } else {
            return { status: 204, message: `Can't raise now. Please try again later` }
        }
    } catch (err) {
        console.log(err)
        return err
    }
}

exports.adminTopup = async (details) => {
    try {
        const updateTopup = await updateBalance(details, 'Normal Staking');
        return updateTopup
    } catch (err) {
        console.log(err)
        return err
    }
}