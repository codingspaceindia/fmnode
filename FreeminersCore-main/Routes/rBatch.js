const express = require('express')
const router = express.Router();
const responseServ = require('../Service/responseService')
const calculateServ = require('../Service/calculationService')
const mNodes = require('../Models/mNodes')
const mBalance = require('../Models/mBalance')
const mTodayCoinValue = require('../Models/mTodayCoinValue');
const mEarningWallet = require('../Models/mEarningWallet');
const mUser = require('../Models/mUser');
const mStakingWallet = require('../Models/mStakingWallet');
const mWalletHistory = require('../Models/mWalletHistory');
const mConfig = require('../Models/mConfig');
const { dailyBusinessTotals } = require('../Service/dailyBonusService');
const mTotalWallet = require('../Models/mTotalWallet');
const schedule = require('node-schedule');
const axios = require('axios');
const ActiveUser = require('../Models/mActiveUser')
const mTopup = require('../Models/mTopupHistory')
const DailyLeftRight = require('../Models/mDailyLeftRight')
const yearlyBalance = require('../Service/yearlyBalanceServ')


const callAPI = async (endpoint) => {
    try {
        const response = await axios.get(`http://localhost:3000${endpoint}`);
        console.log(`${endpoint} response:`, response.data);
    } catch (error) {
        console.error(`${endpoint} error:`, error.message);
    }
};

// Array of jobs with their respective endpoints
const jobs = [
    { name: 'runBalanceCheck', endpoint: '/api/batch/runBalanceCheck' },
    { name: 'runRos', endpoint: '/api/batch/runRos' },
    { name: 'getLeftRightTotal', endpoint: '/api/batch/getLeftRightTotal' },
    { name: 'runPairMatch', endpoint: '/api/batch/runPairMatch' },
];

// Array of jobs with their respective endpoints
const jobs1 = [
    { name: 'getLeftRightTotal', endpoint: '/api/batch/getLeftRightTotal' },
    { name: "getDailyBusiness", endpoint: '/api/batch/runDailyBusiness' }
];

// Function to execute jobs sequentially
const runJobsSequentially = async () => {
    console.log('Starting sequential jobs at 12 AM IST');
    for (const job of jobs) {
        console.log(`Running ${job.name}`);
        await callAPI(job.endpoint);
        console.log(`Completed ${job.name}`);
    }
    console.log('All jobs executed successfully.');
};

// // Schedule to start at 12 AM IST
schedule.scheduleJob('0 18 * * *', async () => {
    // 18:00 UTC corresponds to 12:00 AM IST
    await runJobsSequentially();
});

// // Function to execute jobs sequentially
const earlyJobsSequentially = async () => {
    console.log('Starting sequential jobs at 09 PM IST');
    for (const job of jobs1) {
        console.log(`Running ${job.name}`);
        await callAPI(job.endpoint);
        console.log(`Completed ${job.name}`);
    }
    console.log('All jobs executed successfully.');
};

schedule.scheduleJob('0 15 * * *', async () => {
    // 15:00 UTC corresponds to 09:00 PM IST
    await earlyJobsSequentially();
});

router.get('/runBalanceCheck', async (req, res) => {
    try {
        await yearlyBalance.runBalanceCheck()
        return true;
    } catch (err) {
        console.error(err)
    }
})

router.get('/getLeftRightTotal', async (req, res) => {
    try {
        const [users, rootNodes, balances] = await Promise.all([
            mUser.find({ activeStat: "A" }, { _id: 1 }),
            mNodes.find({}, { userId: 1, leftChild: 1, rightChild: 1 }),
            mBalance.find({}, { userId: 1, balance: 1 }),
        ]);

        const balanceMap = new Map(balances.map(b => [b.userId.toString(), b.balance || 0]));
        const nodeMap = new Map(rootNodes.map(n => [n.userId.toString(), n]));

        const batchSize = 1000;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);

            const bulkOperations = await Promise.all(
                batch.map(async user => {
                    const totals = await calculateNodeTotals(nodeMap, balanceMap, user._id.toString());

                    return {
                        updateOne: {
                            filter: { userId: user._id },
                            update: {
                                $set: {
                                    userId: user._id,
                                    leftUsers: totals.leftCount,
                                    leftActiveUsers: totals.leftActiveCount,
                                    rightUsers: totals.rightCount,
                                    rightActiveUsers: totals.rightActiveCount,
                                    leftBalanceTotal: totals.leftTotalBalance,
                                    rightBalanceTotal: totals.rightTotalBalance,
                                },
                            },
                            upsert: true,
                        },
                    };
                })
            );

            await ActiveUser.bulkWrite(bulkOperations);
        }

        res.status(200).json({ message: "Totals calculated and saved successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const calculateNodeTotals = async (nodeMap, balanceMap, rootId) => {
    const tree = {
        leftCount: 0,
        rightCount: 0,
        leftActiveCount: 0,
        rightActiveCount: 0,
        leftTotalBalance: 0,
        rightTotalBalance: 0,
    };

    const processHeap = (rootUserId, side) => {
        const stack = [rootUserId];
        const visited = new Set();

        let count = 0;
        let activeCount = 0;
        let totalBalance = 0;

        while (stack.length) {
            const currentUserId = stack.pop();

            if (visited.has(currentUserId)) continue;
            visited.add(currentUserId);

            const currentNode = nodeMap.get(currentUserId);
            if (!currentNode) continue;

            const balance = balanceMap.get(currentUserId) || 0;

            count++;
            totalBalance += balance;
            if (balance > 0) activeCount++;

            if (currentNode.leftChild) stack.push(currentNode.leftChild.toString());
            if (currentNode.rightChild) stack.push(currentNode.rightChild.toString());
        }

        if (side === "left") {
            tree.leftCount = count;
            tree.leftActiveCount = activeCount;
            tree.leftTotalBalance = totalBalance;
        } else if (side === "right") {
            tree.rightCount = count;
            tree.rightActiveCount = activeCount;
            tree.rightTotalBalance = totalBalance;
        }
    };

    const rootNode = nodeMap.get(rootId);
    if (rootNode) {
        if (rootNode.leftChild) {
            processHeap(rootNode.leftChild.toString(), "left");
        }
        if (rootNode.rightChild) {
            processHeap(rootNode.rightChild.toString(), "right");
        }
    }

    return tree;
};
router.get('/runPairMatch', async (req, res) => {
    try {
        // Preload required data
        const nodes = await mNodes.find({}).populate('userId', 'name refId activeStat');
        const balances = await mBalance.find({});
        const coinValue = await mTodayCoinValue.findOne({}).sort({ _id: -1 });

        if (!coinValue) throw new Error('Coin value not found.');

        // Preload balances and wallets for faster access
        const balanceMap = new Map(balances.map(b => [b.userId?.toString(), b]));
        const earningWallets = await mEarningWallet.find({ userId: { $in: nodes.map(n => n.userId?._id) } });
        const earningWalletMap = new Map(earningWallets.map(w => [w.userId?.toString(), w]));

        // Call the optimized pair match calculation
        await calculatePairMatch(nodes, balanceMap, coinValue, earningWalletMap);

        responseServ.sendSuccessResponse(res, 'Success');
    } catch (err) {
        console.error(err);
        responseServ.sendErrorResponse(res, err.message);
    }
});
async function calculateRos(users, balances, wallet, coinValue, totalWallet) {
    const BATCH_SIZE = 1000; // Adjust based on performance testing
    const stakingBulkOps = [];
    const totalWalletBulkOps = [];
    const newStakings = [];
    const newTotalWallet = [];
    const walletHistoryEntries = [];

    try {
        // Organize data for quick access
        const balancesMap = new Map(balances.map(b => [b.userId.toString(), b]));
        const walletMap = new Map(wallet.map(w => [w.userId.toString(), w]));
        const totalWalletMap = new Map(totalWallet.map(w => [w.userId.toString(), w]));

        // Process users in batches
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            console.log(i, users.length, "running ros")
            const batch = users.slice(i, i + BATCH_SIZE);

            for (const user of batch) {
                const balanceFetch = balancesMap.get(user._id.toString());
                if (balanceFetch) {
                    const walletFetch = walletMap.get(user._id.toString());
                    const totalFetch = totalWalletMap.get(user._id.toString());
                    const balanceMultiplier = (balanceFetch.totalCoins / 100) * 0.37;
                    // const coinValueTotal = balanceMultiplier * coinValue.oneCoinPrice;

                    if (walletFetch) {
                        stakingBulkOps.push({
                            updateOne: {
                                filter: { userId: user._id },
                                update: {
                                    $inc: {
                                        walletCoins: balanceMultiplier
                                    }
                                }
                            }
                        });
                    } else {
                        newStakings.push({
                            walletCoins: balanceMultiplier,
                            refId: user.refId,
                            userId: user._id,
                            parentRefId: user.parentRefId,
                            name: user.name
                        });
                    }

                    walletHistoryEntries.push({
                        walletCoins: balanceMultiplier,
                        refId: user.refId,
                        name: user.name,
                        userId: user._id,
                        walletType: 'staking',
                        message: "Ros Amount Generated",
                        parentRefId: user.parentRefId,
                        date: new Date().toISOString(),
                        activeStat: 'A'
                    });

                    if (totalFetch) {
                        totalWalletBulkOps.push({
                            updateOne: {
                                filter: { userId: user._id },
                                update: {
                                    $inc: {
                                        walletCoins: balanceMultiplier
                                    }
                                }
                            }
                        });
                    } else {
                        newTotalWallet.push({
                            walletCoins: balanceMultiplier,
                            refId: user.refId,
                            userId: user._id,
                            parentRefId: user.parentRefId,
                            name: user.name
                        });
                    }
                }
            }

            // Execute bulk operations for the batch
            if (stakingBulkOps.length > 0) {
                await mStakingWallet.bulkWrite(stakingBulkOps);
                stakingBulkOps.length = 0; // Clear the array
            }
            if (totalWalletBulkOps.length > 0) {
                await mTotalWallet.bulkWrite(totalWalletBulkOps);
                totalWalletBulkOps.length = 0; // Clear the array
            }
            if (newStakings.length > 0) {
                await mStakingWallet.insertMany(newStakings);
                newStakings.length = 0; // Clear the array
            }
            if (walletHistoryEntries.length > 0) {
                await mWalletHistory.insertMany(walletHistoryEntries);
                walletHistoryEntries.length = 0; // Clear the array
            }
            if (newTotalWallet.length > 0) {
                await mTotalWallet.insertMany(newTotalWallet);
                newTotalWallet.length = 0; // Clear the array
            }
        }

        return true;
    } catch (err) {
        console.error("Error in calculateRos:", err);
        return err;
    }
}

router.get('/runRos', async (req, res) => {
    try {
        console.log("runros")
        const allUser = await mUser.find({}, {}, {})
        const allBalance = await mBalance.find({}, {}, {})
        const stakingWallet = await mStakingWallet.find({}, {}, {})
        const totalWallet = await mTotalWallet.find({}, {}, {})
        const coinValue = await mTodayCoinValue.findOne({}).sort({ _id: -1 }).limit(1)
        const getConfigs = await mConfig.findOne({ orgCode: 'freeminers' }, {}, {});
        if (getConfigs.rosCommission) {
            await calculateRos(allUser, allBalance, stakingWallet, coinValue, totalWallet)
        }
        console.log("Ros Completed")
        responseServ.sendSuccessResponse(res, 'Success')
    } catch (err) {
        responseServ.sendErrorResponse(res, err)
    }
})

async function calculatePairMatch(nodes, balanceMap, coinValue, earningWalletMap) {
    const bulkBalanceUpdates = [];
    const bulkEarningUpdates = [];
    const bulkTotalUpdates = [];
    const newTotals = [];
    const newEarnings = [];
    const walletHistoryEntries = [];

    for (const node of nodes) {
        if (!node.userId) continue; // Skip if userId is missing

        const parentBalance = balanceMap.get(node?.userId?._id.toString());
        const leftChild = balanceMap.get(node.leftChild?.toString());
        const rightChild = balanceMap.get(node.rightChild?.toString());

        if (leftChild && rightChild) {
            const leftBalance = leftChild.balance || 0;
            const rightBalance = rightChild.balance || 0;
            const pairMatchedAmount = Math.min(leftBalance, rightBalance);

            // Update balances for children
            if (pairMatchedAmount > 0) {
                bulkBalanceUpdates.push(
                    {
                        updateOne: {
                            filter: { _id: leftChild._id },
                            update: { $inc: { pairMatchOverDue: -(pairMatchedAmount - leftBalance), pairMatchedAmount: pairMatchedAmount } }
                        }
                    },
                    {
                        updateOne: {
                            filter: { _id: rightChild._id },
                            update: { $inc: { pairMatchOverDue: -(pairMatchedAmount - rightBalance), pairMatchedAmount: pairMatchedAmount } }
                        }
                    }
                );

                // Calculate earnings for parent
                if (parentBalance) {
                    const actualEarningAmount = (pairMatchedAmount / 100) * 0.05;
                    const earningAmount = actualEarningAmount <= (parentBalance.balance / 2) ? actualEarningAmount : parentBalance.balance / 2
                    const earningCoins = earningAmount * coinValue.oneCoinPrice;

                    // Update or insert earnings
                    if (earningWalletMap.has(node.userId._id.toString()) && parentBalance.balance > 0) {
                        bulkEarningUpdates.push({
                            updateOne: {
                                filter: { userId: node.userId._id },
                                update: { $inc: { walletBalance: earningAmount, walletCoins: earningCoins } }
                            }
                        });
                        bulkTotalUpdates.push({
                            updateOne: {
                                filter: { userId: node.userId._id },
                                update: { $inc: { walletBalance: earningAmount, walletCoins: earningCoins } }
                            }
                        })
                    } else {
                        newEarnings.push({
                            userId: node.userId._id,
                            refId: node.userId.refId,
                            name: node.userId.name,
                            walletBalance: earningAmount,
                            walletCoins: earningCoins
                        });
                        newTotals.push({
                            userId: node.userId._id,
                            refId: node.userId.refId,
                            name: node.userId.name,
                            walletBalance: earningAmount,
                            walletCoins: earningCoins
                        });
                    }

                    if (earningAmount > 0) {
                        // Insert wallet history
                        walletHistoryEntries.push({
                            userId: node.userId._id,
                            walletBalance: earningAmount,
                            walletCoins: earningCoins,
                            refId: node.userId.refId,
                            name: node.userId.name,
                            walletType: 'earning',
                            message: "Pair-match amount generated",
                            parentRefId: node.userId.parentRefId || null,
                            date: new Date().toISOString(),
                            activeStat: 'A'
                        });
                    }
                }
            }
        }
    }

    // Execute bulk database operations
    if (bulkBalanceUpdates.length > 0) {
        await mBalance.bulkWrite(bulkBalanceUpdates);
    }
    if (bulkEarningUpdates.length > 0) {
        await mEarningWallet.bulkWrite(bulkEarningUpdates);
    }
    if (newEarnings.length > 0) {
        await mEarningWallet.insertMany(newEarnings);
    }
    if (walletHistoryEntries.length > 0) {
        await mWalletHistory.insertMany(walletHistoryEntries);
    }

    if (bulkTotalUpdates.length > 0) {
        await mTotalWallet.bulkWrite(bulkTotalUpdates);
    }

    if (newTotals.length > 0) {
        await mTotalWallet.insertMany(newTotals)
    }

    return true;
}



const getTodayDateRange = () => {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    return { startOfDay, endOfDay };
};

// Route: Calculate and save daily business totals
router.get("/runDailyBusiness", async (req, res) => {
    try {
        const { startOfDay, endOfDay } = getTodayDateRange();

        // Fetch active nodes and their relationships
        const nodes = await mNodes.find({ activeStat: "A" }, { userId: 1, leftChild: 1, rightChild: 1 });
        const nodeMap = new Map(nodes.map(node => [node.userId.toString(), node]));

        // Fetch today's top-up data and map balances to user IDs
        const topups = await mTopup.aggregate([
            {
                $match: {
                    activeStat: "A",
                    topupDate: { $gte: startOfDay, $lte: endOfDay },
                },
            },
            {
                $group: {
                    _id: "$userId",
                    totalBalance: { $sum: "$balance" },
                },
            },
        ]);

        const balanceMap = new Map(topups.map(t => [t._id.toString(), t.totalBalance || 0]));

        const results = [];
        for (const node of nodes) {
            const totals = await calculateBusinessTotals(nodeMap, balanceMap, node.userId.toString());
            const { year, month, day } = getTodayDateDetails();

            const record = {
                userId: node.userId,
                leftBusinessTotal: totals.leftTotalBalance,
                rightBusinessTotal: totals.rightTotalBalance,
                date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                day,
                month,
                year,
                activeStat: "A",
            };

            results.push(record);
        }

        // Save all records in bulk
        await DailyLeftRight.insertMany(results, { ordered: false });
        res.status(200).json({ message: "Daily business totals calculated and saved successfully." });
    } catch (error) {
        console.error("Error calculating daily business totals:", error.message);
        res.status(500).json({ error: "Error calculating daily business totals." });
    }
});

// Helper: Calculate business totals for a user node
const calculateBusinessTotals = async (nodeMap, balanceMap, rootUserId) => {
    const totals = { leftTotalBalance: 0, rightTotalBalance: 0 };
    const stack = [{ userId: rootUserId, side: null }];
    const visited = new Set();

    while (stack.length) {
        const { userId, side } = stack.pop();
        if (visited.has(userId)) continue;

        visited.add(userId);
        const currentNode = nodeMap.get(userId);
        if (!currentNode) continue;

        const balance = balanceMap.get(userId) || 0;

        if (side === "left") {
            totals.leftTotalBalance += balance;
        } else if (side === "right") {
            totals.rightTotalBalance += balance;
        }

        if (currentNode.leftChild) {
            stack.push({ userId: currentNode.leftChild.toString(), side: "left" });
        }
        if (currentNode.rightChild) {
            stack.push({ userId: currentNode.rightChild.toString(), side: "right" });
        }
    }

    return totals;
};

// Helper: Get today's details
const getTodayDateDetails = () => {
    const now = new Date();
    return {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        day: now.getUTCDate(),
    };
};


module.exports = router