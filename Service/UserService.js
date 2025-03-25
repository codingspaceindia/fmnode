
const mUser = require("../Models/mUser")
const addressService = require('../Service/addressService')
const mAuth = require('../Models/mAuth')
const mNodes = require("../Models/mNodes")
const mTodayCoinValue = require("../Models/mTodayCoinValue")
const mOfferWallet = require("../Models/mOfferWallet")
const mBankDetails = require("../Models/mBankDetails")
const mPanDetails = require("../Models/mPanDetails")
const mConfig = require("../Models/mConfig")
const mWalletHistory = require("../Models/mWalletHistory")
const mTotalWallet = require("../Models/mTotalWallet")
const mailServ = require('../Service/mailService')

exports.createUser = async (details) => {
    try {
        const userCount = await mUser.countDocuments()
        details.refId = details.refId ? details.refId : `FM${(Math.floor(1000000 + Math.random() * 9000000)).toString()}`
        const address = details.address !== null ? await addressService.createOrUpdateAddress(details.address) : null
        details.address = address
        details.userName = details.name + details.refId
        const parent = await mUser.findOne({ refId: details.parentRefId, activeStat: 'A' }, {}, { lean: true })
        details.parent = parent !== null ? parent._id : null
        const newUser = await new mUser(details).save();
        const coinValue = await mTodayCoinValue.findOne({}).sort({ _id: -1 }).limit(1)
        const getConfigs = await mConfig.findOne({ orgCode: 'freeminers' }, {}, {})
        let values = {
            walletBalance: getConfigs?.joinBonusCommission ? 1.5 : 0,
            walletCoins: getConfigs?.joinBonusCommission ? 1.5 * coinValue.oneCoinPrice : 0,
            refId: newUser.refId,
            userId: newUser._id,
            parentRefId: newUser.parentRefId,
            name: newUser.name
        }
        await new mOfferWallet(values).save();
        await new mTotalWallet(values).save();
        await new mWalletHistory({
            walletCoins: getConfigs?.joinBonusCommission ? 1.5 * coinValue.oneCoinPrice : 0,
            walletBalance: getConfigs?.joinBonusCommission ? 1.5 : 0,
            refId: newUser.refId,
            name: newUser.name,
            userId: newUser._id,
            walletType: 'offer',
            parentRefId: newUser.parentRefId,
            message: `Joining Bonus Generated`,
            date: new Date().toISOString(),
            activeStat: 'A'
        }).save();
        let authValues = {
            refId: newUser.refId,
            userId: newUser._id,
            password: newUser.refId + newUser.mobileNumber.slice(-4)
        }
        await new mAuth(authValues).save({});
        let mailContent = {
            recipientEmail: newUser.mailId,
            userName: newUser.refId,
            password: authValues.password
        }
        await mailServ.sendRegisterEmail(mailContent);
        if (details.nodePosition !== null) {
            newUser.nodePosition = details.nodePosition
            if (newUser.nodePosition === 'left') {
                insertLeftNodes(newUser)
            } else {
                insertRightNodes(newUser)
            }
        }
        await insertParentCommision(parent, coinValue, details.nodePosition, newUser)
        return ({ data: newUser })
    } catch (err) {
        console.log("createUserErrr", err)
        return { status: "error", data: "User is not created due to some error" }; // Re-throw the error to propagate it to the caller
    }
}

async function insertLeftNodes(details) {
    try {
        const nodeUpdate = await mNodes.findOne({ userId: details.parent, activeStat: 'A' }, {}, { lean: true })
        if (nodeUpdate === null) {
            let values = {
                userId: details.parent,
                leftChild: details._id
            }
            await new mNodes(values).save();
            let newLeftChild = {
                userId: details._id
            }
            await new mNodes(newLeftChild).save()
        } else if (nodeUpdate.leftChild) {
            let values = {
                userId: nodeUpdate.leftChild,
                parent: nodeUpdate.leftChild,
                _id: details._id
            }
            await insertLeftNodes(values)
        } else {
            await mNodes.findOneAndUpdate({ userId: details.parent, activeStat: 'A' }, { ...nodeUpdate, leftChild: details.id })
            let newLeftChild = {
                userId: details._id
            }
            await new mNodes(newLeftChild).save()
        }
    } catch (err) {
        return err
    }
}

async function insertRightNodes(details) {
    try {
        const nodeUpdate = await mNodes.findOne({ userId: details.parent, activeStat: 'A' }, {}, { lean: true })
        if (nodeUpdate === null) {
            let values = {
                userId: details.parent,
                rightChild: details._id
            }
            await new mNodes(values).save();
            let newRightValues = {
                userId: details._id
            }
            await new mNodes(newRightValues).save()
        } else if (nodeUpdate.rightChild) {
            let values = {
                userId: nodeUpdate.rightChild,
                parent: nodeUpdate.rightChild,
                _id: details._id
            }
            await insertRightNodes(values)
        } else {
            await mNodes.findOneAndUpdate({ userId: details.parent, activeStat: 'A' }, { ...nodeUpdate, rightChild: details.id })
            let newRightValues = {
                userId: details._id
            }
            await new mNodes(newRightValues).save()
        }
    } catch (err) {
        return err
    }
}



async function insertParentCommision(details, coinValue, position, child) {
    try {
        const getConfigs = await mConfig.findOne({ orgCode: 'freeminers' }, {}, {})
        if (!details.leftBonus && position === 'left') {
            details.leftBonus = true
            await mUser.findOneAndUpdate({ _id: details._id }, details, {})
            const offerWallet = await mOfferWallet.findOne({ refId: details.refId }, {}, {})
            const totalWallet = await mTotalWallet.findOne({ refId: details.refId }, {}, {})
            if (offerWallet === null && getConfigs.leftRightCommission) {
                let values = {
                    walletBalance: 1.5,
                    walletCoins: 1.5 * coinValue.oneCoinPrice,
                    refId: details.refId,
                    userId: details._id,
                    parentRefId: details.parentRefId,
                    name: details.name
                }
                await new mOfferWallet(values).save();
                totalWallet === null && await new mTotalWallet(values).save();
            } else if (getConfigs.leftRightCommission) {
                offerWallet.walletBalance += 1.5
                offerWallet.walletCoins += 1.5 * coinValue.oneCoinPrice
                await mOfferWallet.findOneAndUpdate({ refId: details.refId }, offerWallet, {});
                totalWallet.walletBalance += 1.5
                totalWallet.walletCoins += 1.5 * coinValue.oneCoinPrice
                await mTotalWallet.findOneAndUpdate({ refId: details.refId }, totalWallet, {});
            }
            await new mWalletHistory({
                walletCoins: getConfigs?.joinBonusCommission ? 1.5 * coinValue.oneCoinPrice : 0,
                walletBalance: getConfigs?.joinBonusCommission ? 1.5 : 0,
                refId: details.refId,
                name: details.name,
                userId: details._id,
                walletType: 'offer',
                message: `Parent Commission Generated for the ${position} child joined`,
                parentRefId: child.parentRefId,
                childRefId: child.refId,
                date: new Date().toISOString(),
                activeStat: 'A'
            }).save();
        } else if (!details.rightBonus && position === 'right' && getConfigs.leftRightCommission) {
            details.rightBonus = true
            await mUser.findOneAndUpdate({ _id: details._id }, details, {})
            const offerWallet = await mOfferWallet.findOne({ refId: details.refId }, {}, {})
            const totalWallet = await mTotalWallet.findOne({ refId: details.refId }, {}, {})
            if (offerWallet === null) {
                let values = {
                    walletBalance: 1.5,
                    walletCoins: 1.5 * coinValue.oneCoinPrice,
                    refId: details.refId,
                    userId: details._id,
                    parentRefId: details.parentRefId,
                    name: details.name
                }
                await new mOfferWallet(values).save();
                totalWallet === null && await new mTotalWallet(values).save();
            } else if (getConfigs.leftRightCommission) {
                offerWallet.walletBalance += 1.5
                offerWallet.walletCoins += 1.5 * coinValue.oneCoinPrice
                await mOfferWallet.findOneAndUpdate({ refId: details.refId }, offerWallet, {});
                totalWallet.walletBalance += 1.5
                totalWallet.walletCoins += 1.5 * coinValue.oneCoinPrice
                await mTotalWallet.findOneAndUpdate({ refId: details.refId }, totalWallet, {});
            }
            await new mWalletHistory({
                walletCoins: getConfigs?.joinBonusCommission ? 1.5 * coinValue.oneCoinPrice : 0,
                walletBalance: getConfigs?.joinBonusCommission ? 1.5 : 0,
                refId: details.refId,
                name: details.name,
                userId: details._id,
                walletType: 'offer',
                message: `Parent Commission Generated for the ${position} child joined`,
                parentRefId: child.parentRefId,
                childRefId: child.refId,
                date: new Date().toISOString(),
                activeStat: 'A'
            }).save();
        }
    } catch (err) {
        return err
    }
}

exports.updateUser = async (details) => {
    try {
        details.address = details.address !== null ? await addressService.createOrUpdateAddress(details.address) : null
        const updateUser = await mUser.findOneAndUpdate({ _id: details._id }, details, {})
        return updateUser
    } catch (err) {
        console.log(err)
        return err
    }
}

exports.uploadBankDetails = async (details) => {
    try {
        const bankDetails = await updateOrInsertBankDetails(details)
        return bankDetails
    } catch (err) {
        return err
    }
}


async function updateOrInsertBankDetails(details) {
    try {
        const getDetails = await mBankDetails.findOne({ userId: details.userId }, {}, {})
        if (getDetails === null) {
            const insertBank = await new mBankDetails(details).save()
            return insertBank
        } else {
            const updateBank = await mBankDetails.findOneAndUpdate({ userId: details.userId }, details, {})
            return updateBank
        }
    } catch (err) {
        return err
    }
}

exports.uploadPanDetails = async (details) => {
    try {
        const panDetails = await uploadOrInsetPanDetails(details)
        return panDetails
    } catch (err) {
        return err
    }
}


async function uploadOrInsetPanDetails(details) {
    try {
        const getDetails = await mPanDetails.findOne({ userId: details.userId }, {}, {})
        if (getDetails === null) {
            const insertBank = await new mPanDetails(details).save()
            return insertBank
        } else {
            const updateBank = await mPanDetails.findOneAndUpdate({ userId: details.userId }, details, {})
            return updateBank
        }
    } catch (err) {
        return err
    }
}