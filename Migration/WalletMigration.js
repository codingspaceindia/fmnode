const { MongoClient } = require("mongodb");
const express = require("express");
const router = express.Router();
const mOfferWallet = require('../Models/mOfferWallet');
const mWalletHistory = require("../Models/mWalletHistory");
const mEarningWallet = require('../Models/mEarningWallet');
const mStakingWallet = require('../Models/mStakingWallet')
const mTotalWallet = require('../Models/mTotalWallet');
const mBalance = require("../Models/mBalance");
const mTransferWallet = require("../Models/mTransferWallet");

router.get('/migrateOfferWallet', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");

        await mOfferWallet.deleteMany({});
        await mWalletHistory.deleteMany({});

        const BATCH_SIZE = 500;
        const TRANSACTION_BATCH_SIZE = 100;
        let newOfferBatch = [];
        let newHistoryBatch = [];
        let skippedWallets = 0;

        const userCollection = await oldDb.collection("user").find().toArray();
        const userMap = userCollection.reduce((acc, user) => {
            acc[user._id.toString()] = user;
            return acc;
        }, {});

        const totalWallets = await oldDb.collection("wallet").countDocuments();
        console.log(`Total wallets to migrate: ${totalWallets}`);

        for (let skip = 0; skip < totalWallets; skip += BATCH_SIZE) {
            const wallets = await oldDb.collection("wallet").find().skip(skip).limit(BATCH_SIZE).toArray();

            for (const wallet of wallets) {
                const user = userMap[wallet.userId.toString()];
                if (!user) {
                    skippedWallets++;
                    console.log(`Skipping wallet with userId ${wallet.userId} - user not found`);
                    continue;
                }

                const migrateWallet = {
                    walletCoins: wallet.offerWallet || 0,
                    refId: user.refId,
                    name: user.name,
                    userId: wallet.userId,
                    parentRefId: user.parentRefId,
                    activeStat: 'A',
                };
                newOfferBatch.push(migrateWallet);

                for (let i = 0; i < wallet.transactions.length; i += TRANSACTION_BATCH_SIZE) {
                    const transactionBatch = wallet.transactions.slice(i, i + TRANSACTION_BATCH_SIZE);
                    transactionBatch.forEach((transaction) => {
                        if (['NEW_JOIN', 'NEW_RIGHT_CHILD_JOIN', 'NEW_LEFT_CHILD_JOIN', 'TOPUP_DONE'].includes(transaction.message)) {
                            const migrateHistory = {
                                walletCoins: transaction.fcAmount || 0,
                                refId: user.refId,
                                name: user.name,
                                parentRefId: user.parentRefId,
                                message: transaction.message,
                                walletType: 'offer',
                                walletBalance: transaction.amount || 0,
                                activeStat: 'A',
                                date: transaction.transactionAt,
                                createdAt: transaction.transactionAt,
                                updatedAt: transaction.transactionAt,
                            };
                            newHistoryBatch.push(migrateHistory);
                        }
                    });

                    if (newHistoryBatch.length >= TRANSACTION_BATCH_SIZE) {
                        await mWalletHistory.insertMany(newHistoryBatch);
                        newHistoryBatch = [];
                    }
                }
            }

            if (newOfferBatch.length > 0) {
                await mOfferWallet.insertMany(newOfferBatch);
                newOfferBatch = [];
            }

            if (newHistoryBatch.length > 0) {
                await mWalletHistory.insertMany(newHistoryBatch);
                newHistoryBatch = [];
            }
        }

        console.log(`Migration completed. Skipped wallets: ${skippedWallets}`);
        await oldClient.close();
        res.json({ message: `Migration completed successfully with ${skippedWallets} skipped wallets.` });
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).send("Error during migration");
    }
});

router.get('/migrateEarningWallet', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");

        await mEarningWallet.deleteMany({});

        const BATCH_SIZE = 500;
        const TRANSACTION_BATCH_SIZE = 100;
        let newEarningBatch = [];
        let newHistoryBatch = [];
        let skippedWallets = 0;

        const userCollection = await oldDb.collection("user").find().toArray();
        const userMap = userCollection.reduce((acc, user) => {
            acc[user._id.toString()] = user;
            return acc;
        }, {});

        const totalWallets = await oldDb.collection("wallet").countDocuments();
        console.log(`Total wallets to migrate: ${totalWallets}`);

        for (let skip = 0; skip < totalWallets; skip += BATCH_SIZE) {
            const wallets = await oldDb.collection("wallet").find().skip(skip).limit(BATCH_SIZE).toArray();

            for (const wallet of wallets) {
                const user = userMap[wallet.userId.toString()];
                if (!user) {
                    skippedWallets++;
                    console.log(`Skipping wallet with userId ${wallet.userId} - user not found`);
                    continue;
                }

                const migrateWallet = {
                    walletCoins: wallet.earningsWallet || 0,
                    refId: user.refId,
                    name: user.name,
                    userId: wallet.userId,
                    parentRefId: user.parentRefId,
                    activeStat: 'A',
                };
                newEarningBatch.push(migrateWallet);

                for (let i = 0; i < wallet.transactions.length; i += TRANSACTION_BATCH_SIZE) {
                    const transactionBatch = wallet.transactions.slice(i, i + TRANSACTION_BATCH_SIZE);
                    transactionBatch.forEach((transaction) => {
                        if (['CHILD_TOPUP_DONE', 'BUSINESS_MATCH'].includes(transaction.message)) {
                            const migrateHistory = {
                                walletCoins: transaction.fcAmount || 0,
                                refId: user.refId,
                                name: user.name,
                                parentRefId: user.parentRefId,
                                message: transaction.message,
                                walletType: 'earning',
                                walletBalance: transaction.amount || 0,
                                activeStat: 'A',
                                date: transaction.transactionAt,
                                createdAt: transaction.transactionAt,
                                updatedAt: transaction.transactionAt,
                            };
                            newHistoryBatch.push(migrateHistory);
                        }
                    });

                    if (newHistoryBatch.length >= TRANSACTION_BATCH_SIZE) {
                        await mWalletHistory.insertMany(newHistoryBatch);
                        newHistoryBatch = [];
                    }
                }
            }

            if (newEarningBatch.length > 0) {
                await mEarningWallet.insertMany(newEarningBatch);
                newEarningBatch = [];
            }

            if (newHistoryBatch.length > 0) {
                await mWalletHistory.insertMany(newHistoryBatch);
                newHistoryBatch = [];
            }
        }

        console.log(`Migration completed. Skipped wallets: ${skippedWallets}`);
        await oldClient.close();
        res.json({ message: `Migration completed successfully with ${skippedWallets} skipped wallets.` });
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).send("Error during migration" + err);
    }
});

router.get('/migrateStakingWallet', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";
        const oldClient = new MongoClient(oldDbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");

        const BATCH_SIZE = 200; // Increase cautiously based on memory
        const TRANSACTION_BATCH_SIZE = 100;
        let newStakingBatch = [];
        let newHistoryBatch = [];
        let skippedWallets = 0;

        // Delete existing records for a fresh migration
        await Promise.all([
            mStakingWallet.deleteMany({}),
            mWalletHistory.deleteMany({ walletType: 'staking' })
        ]);

        // Load users into memory as a map for quick lookup
        const userCollection = await oldDb.collection("user").find().toArray();
        const userMap = userCollection.reduce((acc, user) => {
            acc[user._id.toString()] = user;
            return acc;
        }, {});

        // Fetch total wallets and process in batches
        const totalWallets = await oldDb.collection("wallet").countDocuments();
        console.log(`Total wallets to migrate: ${totalWallets}`);

        for (let skip = 0; skip < totalWallets; skip += BATCH_SIZE) {
            const wallets = await oldDb.collection("wallet").find().skip(skip).limit(BATCH_SIZE).toArray();
            console.log("wallet", skip)
            for (const wallet of wallets) {
                const user = userMap[wallet.userId.toString()];
                if (!user) {
                    skippedWallets++;
                    console.log(`Skipping wallet with userId ${wallet.userId} - user not found`);
                    continue;
                }

                const migrateWallet = {
                    walletCoins: wallet.stackingWallet || 0,
                    refId: user.refId,
                    name: user.name,
                    userId: wallet.userId,
                    parentRefId: user.parentRefId,
                    activeStat: 'A',
                };
                newStakingBatch.push(migrateWallet);

                // Filter and prepare transaction history in batches
                const transactionBatch = wallet.transactions
                    .filter(transaction => transaction.message === 'ROI')
                    .map(transaction => ({
                        walletCoins: transaction.fcAmount || 0,
                        refId: user.refId,
                        name: user.name,
                        parentRefId: user.parentRefId,
                        message: transaction.message,
                        walletType: 'staking',
                        walletBalance: transaction.amount || 0,
                        activeStat: 'A',
                        date: transaction.transactionAt,
                        createdAt: transaction.transactionAt,
                        updatedAt: transaction.transactionAt,
                    }));

                newHistoryBatch.push(...transactionBatch);

                // Insert newHistoryBatch if it reaches the defined size
                if (newHistoryBatch.length >= TRANSACTION_BATCH_SIZE) {
                    await mWalletHistory.insertMany(newHistoryBatch);
                    newHistoryBatch = [];
                }
            }

            // Insert newStakingBatch if not empty
            if (newStakingBatch.length > 0) {
                await mStakingWallet.insertMany(newStakingBatch);
                newStakingBatch = [];
            }
        }

        // Final insert for any remaining history records
        if (newHistoryBatch.length > 0) {
            await mWalletHistory.insertMany(newHistoryBatch);
        }

        console.log(`Migration completed. Skipped wallets: ${skippedWallets}`);
        await oldClient.close();
        res.json({ message: `Migration completed successfully with ${skippedWallets} skipped wallets.` });
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).send("Error during migration: " + err);
    }
});

router.get('/migrateTotalWallet', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");

        await mTotalWallet.deleteMany({});

        const BATCH_SIZE = 500;
        let newTotalBatch = [];
        let skippedWallets = 0;

        const userCollection = await oldDb.collection("user").find().toArray();
        const userMap = userCollection.reduce((acc, user) => {
            acc[user._id.toString()] = user;
            return acc;
        }, {});

        const totalWallets = await oldDb.collection("wallet").countDocuments();
        console.log(`Total wallets to migrate: ${totalWallets}`);

        for (let skip = 0; skip < totalWallets; skip += BATCH_SIZE) {
            const wallets = await oldDb.collection("wallet").find().skip(skip).limit(BATCH_SIZE).toArray();

            for (const wallet of wallets) {
                const user = userMap[wallet.userId.toString()];
                if (!user) {
                    skippedWallets++;
                    console.log(`Skipping wallet with userId ${wallet.userId} - user not found`);
                    continue;
                }

                const migrateWallet = {
                    walletCoins: wallet.offerWallet + wallet.earningsWallet + wallet.stackingWallet || 0,
                    refId: user.refId,
                    name: user.name,
                    userId: wallet.userId,
                    parentRefId: user.parentRefId,
                    activeStat: 'A',
                };
                newTotalBatch.push(migrateWallet);
            }

            if (newTotalBatch.length > 0) {
                await mTotalWallet.insertMany(newTotalBatch);
                newTotalBatch = [];
            }
        }

        console.log(`Migration completed. Skipped wallets: ${skippedWallets}`);
        await oldClient.close();
        res.json({ message: `Migration completed successfully with ${skippedWallets} skipped wallets.` });
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).send("Error during migration" + err);
    }
});

router.get('/migrateBalance', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");

        await mBalance.deleteMany({});

        const BATCH_SIZE = 500;
        let newTotalBatch = [];
        let skippedWallets = 0;

        const userCollection = await oldDb.collection("user").find().toArray();
        const userMap = userCollection.reduce((acc, user) => {
            acc[user._id.toString()] = user;
            return acc;
        }, {});

        const totalWallets = await oldDb.collection("wallet").countDocuments();

        console.log(`Total wallets to migrate: ${totalWallets}`);

        for (let skip = 0; skip < totalWallets; skip += BATCH_SIZE) {
            const wallets = await oldDb.collection("wallet").find().skip(skip).limit(BATCH_SIZE).toArray();
            const topup = await oldDb.collection('businessRecord').find().toArray();

            for (const wallet of wallets) {
                const user = userMap[wallet.userId.toString()];
                if (!user) {
                    skippedWallets++;
                    console.log(`Skipping wallet with userId ${wallet.userId} - user not found`);
                    continue;
                }

                const migrateWallet = {
                    balance: topup.filter((req) => req._id.toString() === wallet.userId.toString()).reduce((total, val) => total + val.totalStacking, 0),
                    totalCoins: wallet.totalStacking || 0,
                    refId: user.refId,
                    name: user.name,
                    userId: wallet.userId,
                    parentRefId: user.parentRefId,
                    activeStat: 'A',
                };
                newTotalBatch.push(migrateWallet);
            }

            if (newTotalBatch.length > 0) {
                await mBalance.insertMany(newTotalBatch);
                newTotalBatch = [];
            }
        }

        console.log(`Migration completed. Skipped wallets: ${skippedWallets}`);
        await oldClient.close();
        res.json({ message: `Migration completed successfully with ${skippedWallets} skipped wallets.` });
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).send("Error during migration" + err);
    }
});

router.get('/migrateTransferWallet', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");

        await mTransferWallet.deleteMany({});

        const BATCH_SIZE = 500;
        const TRANSACTION_BATCH_SIZE = 100;
        let newOfferBatch = [];
        let newHistoryBatch = [];
        let skippedWallets = 0;

        const userCollection = await oldDb.collection("user").find().toArray();
        const userMap = userCollection.reduce((acc, user) => {
            acc[user._id.toString()] = user;
            return acc;
        }, {});

        const totalWallets = await oldDb.collection("previousBalance").countDocuments();
        console.log(`Total wallets to migrate: ${totalWallets}`);

        for (let skip = 0; skip < totalWallets; skip += BATCH_SIZE) {
            const wallets = await oldDb.collection("previousBalance").find().skip(skip).limit(BATCH_SIZE).toArray();

            for (const wallet of wallets) {
                const user = userMap[wallet.userId.toString()];
                if (!user) {
                    skippedWallets++;
                    console.log(`Skipping wallet with userId ${wallet.userId} - user not found`);
                    continue;
                }

                const migrateWallet = {
                    walletCoins: wallet.availableBalance || 0,
                    refId: user.refId,
                    name: user.name,
                    userId: wallet.userId,
                    parentRefId: user.parentRefId,
                    activeStat: 'A',
                };
                newOfferBatch.push(migrateWallet);

                const migrateHistory = {
                    walletCoins: wallet.availableBalance || 0,
                    refId: user.refId,
                    name: user.name,
                    parentRefId: user.parentRefId,
                    message: `Amount transfered to yourself (Internal Transfer)`,
                    walletType: 'transfer',
                    activeStat: 'A',
                };
                newHistoryBatch.push(migrateHistory);
                if (newHistoryBatch.length >= TRANSACTION_BATCH_SIZE) {
                    await mWalletHistory.insertMany(newHistoryBatch);
                    newHistoryBatch = [];
                }
            }

            if (newOfferBatch.length > 0) {
                await mTransferWallet.insertMany(newOfferBatch);
                newOfferBatch = [];
            }

            if (newHistoryBatch.length > 0) {
                await mWalletHistory.insertMany(newHistoryBatch);
                newHistoryBatch = [];
            }
        }

        console.log(`Migration completed. Skipped wallets: ${skippedWallets}`);
        await oldClient.close();
        res.json({ message: `Migration completed successfully with ${skippedWallets} skipped wallets.` });
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).send("Error during migration");
    }
});

const mongoose = require('mongoose');
router.get('/migrateUpdateBalance', async (req, res) => {
    const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

    try {
        // Connect to the old database
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        console.log("Connected to the old database.");

        const oldDb = oldClient.db("freecoindb");

        // Fetch all relevant topupRequests
        const oldCollection = await oldDb.collection("topupRequest").find({
            status: "A",
            is365Days: false,
            is365Reduction: false,
        }).toArray();

        console.log(`Fetched ${oldCollection.length} records from topupRequest.`);

        // Preprocess balances by userId
        const userBalances = oldCollection.reduce((acc, record) => {
            const userId = record.userId.toString();
            acc[userId] = (acc[userId] || 0) + (record.amount || 0);
            return acc;
        }, {});

        // Create bulk operations
        const bulkOperations = Object.entries(userBalances).map(([userId, totalBalance]) => ({
            updateOne: {
                filter: { userId: userId },
                update: {
                    $set: { balance: totalBalance }, // Increment the balance
                },
                upsert: true, // Create a new record if it doesn't exist
            },
        }));

        // Perform bulk write in batches
        const batchSize = 500;
        for (let i = 0; i < bulkOperations.length; i += batchSize) {
            const batch = bulkOperations.slice(i, i + batchSize);
            await mBalance.bulkWrite(batch);
            console.log(`Batch ${i / batchSize + 1} processed.`);
        }

        // Close the old client connection
        await oldClient.close();

        console.log("Migration completed successfully.");
        res.status(200).json({ message: "Migration completed successfully." });
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).json({ error: err.message });
    }
});



module.exports = router;