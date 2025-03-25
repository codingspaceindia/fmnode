const { MongoClient } = require("mongodb");
const express = require("express");
const router = express.Router();
const responseServ = require('../Service/responseService');
const mUser = require('../Models/mUser');
const mTopupHistory = require("../Models/mTopupHistory");
const mWithdraw = require("../Models/mWithdraw");

router.get('/stakingReporMigration', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        console.log("Connected to MongoDB");
        const oldDb = oldClient.db("freecoindb");

        await mTopupHistory.deleteMany({}); // Clear the collection if needed

        const batchSize = 500; // Size for processing batches
        const insertBatchSize = 100; // Size for inserting data into MongoDB

        // Fetch data
        const oldTotalStakingCursor = await oldDb.collection('topupRequest').find().toArray();
        const walletRecords = await oldDb.collection('wallet').find().toArray();
        const userRecordsMap = new Map(
            (await mUser.find({}, { refId: 1, parentRefId: 1 })).map(user => [user.refId, user.parentRefId])
        );

        let newTransactionReport = [];
        for await (const record of oldTotalStakingCursor) {
            if (record.status === 'A') {
                const wallet = walletRecords
                    .find(wallet => wallet.userId === record.userId)?.transactions
                    ?.find(trans =>
                        trans.isProcessed &&
                        trans.transactionAt?.toString().split('T')[0] === record.respondedAt?.toString().split('T')[0]
                    );

                if (wallet) {
                    const migrateReport = {
                        topupType: record.proofImageUrl ? 'Normal Staking' : 'Internal Staking',
                        totalCoins: wallet.fcAmount,
                        refId: record.refId,
                        parentRefId: userRecordsMap.get(record.refId),
                        yearlyDeduction: record.is365Reduction,
                        message: wallet.message,
                        balance: record.amount,
                        topupDate: record.respondedAt,
                        userId: record.userId,
                        createdAt: record.requestedAt,
                        updatedAt: record.respondedAt,
                    };
                    newTransactionReport.push(migrateReport);
                }
            }

            // Insert in batches to avoid memory overflow
            if (newTransactionReport.length >= batchSize) {
                await insertReports(newTransactionReport, insertBatchSize);
                newTransactionReport = []; // Clear batch
            }
        }

        // Insert remaining records
        if (newTransactionReport.length > 0) {
            await insertReports(newTransactionReport, insertBatchSize);
        }

        console.log("Migration completed successfully");
        res.status(200).json({ success: true, message: "Migration completed successfully" });

        // Close the database connection
        await oldClient.close();
        console.log("MongoDB connection closed");
    } catch (err) {
        console.error(err);
        responseServ.sendErrorResponse(res, err);
    }
});

// Helper function to insert records in smaller batches
async function insertReports(reports, batchSize) {
    const totalBatches = Math.ceil(reports.length / batchSize);
    for (let i = 0; i < totalBatches; i++) {
        const batch = reports.slice(i * batchSize, (i + 1) * batchSize);
        await mTopupHistory.insertMany(batch);
        console.log(`Inserted batch ${i + 1}/${totalBatches}`);
    }
}

router.get('/withdrawReportMigration', async (req, res) => {
    const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";
    const batchSize = 500; // Size for processing batches
    const insertBatchSize = 100; // Size for inserting data into MongoDB

    let oldClient;

    try {
        // Connect to the MongoDB client
        oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        console.log("Connected to MongoDB");
        const oldDb = oldClient.db("freecoindb");

        // Clear the `mWithdraw` collection
        await mWithdraw.deleteMany({});
        console.log("Cleared mWithdraw collection");

        // Prepare data mapping for user records
        const userRecordsMap = new Map(
            (await mUser.find({}, { refId: 1, parentRefId: 1 })).map(user => [user.refId, user.parentRefId])
        );

        // Use a cursor for efficient data fetching
        const cursor = oldDb.collection('withdrawRequest').find();
        let newTransactionReport = [];
        let batchCount = 0;

        while (await cursor.hasNext()) {
            const record = await cursor.next();
            if ((record.currencyType === 'coin' || record.currencyType === 'internal transfer') && record.userId !== Infinity) {
                const migrateReport = {
                    withDrawType: record.currencyType === 'coin' ? 'withdraw' : 'internalTransfer',
                    coins: record.amount,
                    refId: record.refId,
                    parentRefId: userRecordsMap.get(record.refId),
                    userId: record.userId,
                    createdAt: record.requestedAt,
                    updatedAt: record.requestedAt,
                    status: record.status === 'A' ? "Approve" : "Decline",
                };
                newTransactionReport.push(migrateReport);
            }

            // Insert in batches to avoid memory overflow
            if (newTransactionReport.length >= batchSize) {
                await insertWithdrawReport(newTransactionReport, insertBatchSize);
                batchCount++;
                console.log(`Processed batch ${batchCount}`);
                newTransactionReport = []; // Clear the batch
            }
        }

        // Insert remaining records
        if (newTransactionReport.length > 0) {
            await insertWithdrawReport(newTransactionReport, insertBatchSize);
            console.log(`Processed final batch`);
        }

        console.log("Migration completed successfully");
        res.status(200).json({ success: true, message: "Migration completed successfully" });

    } catch (err) {
        console.error("Migration failed", err);
        responseServ.sendErrorResponse(res, err);
    } finally {
        // Ensure the database connection is closed
        if (oldClient) {
            await oldClient.close();
            console.log("MongoDB connection closed");
        }
    }
});

// Helper function to insert records in smaller batches
async function insertWithdrawReport(reports, batchSize) {
    const totalBatches = Math.ceil(reports.length / batchSize);
    for (let i = 0; i < totalBatches; i++) {
        const batch = reports.slice(i * batchSize, (i + 1) * batchSize);
        try {
            await mWithdraw.insertMany(batch);
            console.log(`Inserted batch ${i + 1}/${totalBatches}`);
        } catch (err) {
            console.error(`Failed to insert batch ${i + 1}/${totalBatches}`, err);
        }
    }
}

module.exports = router;