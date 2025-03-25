const { MongoClient } = require("mongodb");
const express = require("express");
const mNodes = require("../Models/mNodes");
const mUser = require("../Models/mUser");
const mAuth = require("../Models/mAuth");
const router = express.Router();
const mongoose = require("mongoose");
const { ObjectId } = require('mongodb');
const mActiveUser = require("../Models/mActiveUser");

router.get('/migrateUser', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();

        // Specify the database name
        const oldDb = oldClient.db("freecoindb");

        // Clear existing data in mUser and mAuth collections
        await mUser.deleteMany({});
        await mAuth.deleteMany({});

        // Access the 'users' collection and apply a limit of 5 documents
        const oldCollection = await oldDb.collection("user").find().toArray();
        const oldAuthCollection = await oldDb.collection("auth").find().toArray();

        let newAuth = [];
        let newUsers = [];

        await Promise.all(
            oldCollection.map(async (user) => {
                let migrateUser = {
                    _id: user._id,  // Preserve original _id
                    userName: user.name + user.refId,
                    name: user.name,
                    refId: user.refId,
                    role: 'endUser',
                    parentRefId: user.parentRefId,
                    mailId: user.mailId ? user.mailId : null,
                    parent: user.parentId === 'Infinity' ? null : user.parentId,
                    mobileNumber: user.mobileNumber,
                    leftBonus: true,
                    rightBonus: true,
                    freeCoinAddress: null,
                    joiningDate: user.joiningDate
                };

                newUsers.push(migrateUser);

                let authValues = {
                    refId: user.refId,
                    userId: user._id,
                    // password: user.refId + (user.mobileNumber && user.mobileNumber !== undefined ? user.mobileNumber.toString().slice(-4) : '1234')
                    password: oldAuthCollection.filter((oldAuth) => oldAuth?.refId === user?.refId)[0]?.password !== undefined ? oldAuthCollection.filter((oldAuth) => oldAuth?.refId === user?.refId)[0]?.password : 'Admin@123'
                };
                newAuth.push(authValues);

                // if (oldNodeCollection.filter((node) => node.left?.userId === user._id.toString()).length === 1) {
                //     await insertLeftNodes(migrateUser);
                // } else if (oldNodeCollection.filter((node) => node.right?.userId === user._id.toString()).length === 1) {
                //     await insertRightNodes(migrateUser);
                // }
            })
        );

        // Bulk insert into mUser and mAuth collections using Mongoose models
        await mUser.insertMany(newUsers);
        await mAuth.insertMany(newAuth);

        res.json({ message: "Migration completed successfully" });
        await oldClient.close();
    } catch (err) {
        console.log(err);
        res.status(500).send("Error during migration");
    }
});



// router.get('/insertNodes', async (req, res) => {
//     try {
//         const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

//         // Connect to the MongoDB client
//         const oldClient = new MongoClient(oldDbUrl);
//         await oldClient.connect();

//         const oldDb = oldClient.db("freecoindb");

//         // Clear existing nodes
//         await mNodes.deleteMany({});

//         const oldNodeCollection = await oldDb.collection("node").find().toArray();
//         const userCollection = await mUser.find();
//         let insertNodes = [];

//         await Promise.all(
//             oldNodeCollection.map(async (node, i) => {
//                 let nodeValues;
//                 if (node.left && node.right) {
//                     // Case 1: Both left and right exist
//                     nodeValues = {
//                         userId: ObjectId.isValid(node.userId) ? node.userId : null,
//                         leftChild: ObjectId.isValid(node.left.userId) ? node.left.userId : null,
//                         rightChild: ObjectId.isValid(node.right.userId) ? node.right.userId : null
//                     };
//                 } else if (node.left === undefined && node.right !== undefined) {
//                     // Case 2: Only right child exists
//                     nodeValues = {
//                         userId: ObjectId.isValid(node.userId) ? node.userId : null,
//                         rightChild: ObjectId.isValid(node.right.userId) ? node.right.userId : null,
//                     };
//                 } else if (node.right === undefined && node.left !== undefined) {
//                     // Case 3: Only left child exists
//                     nodeValues = {
//                         userId: ObjectId.isValid(node.userId) ? node.userId : null,
//                         leftChild: ObjectId.isValid(node.left.userId) ? node.left.userId : null,
//                     };
//                 }

//                 // Only push if `userId` is valid; optional: skip nodes with null values for both children
//                 if (nodeValues?.userId) {
//                     insertNodes.push(nodeValues);
//                 } else {
//                     console.log(nodeValues)
//                     console.warn("Skipping node due to invalid userId:", node);
//                 }
//             })
//         );

//         if (insertNodes.length > 0) {
//             console.log("last", insertNodes.length);
//             const result = await mNodes.insertMany(insertNodes);
//             res.json({ message: "Node Migration completed successfully", result });
//         } else {
//             res.json({ message: "No valid nodes to migrate" });
//         }

//         await oldClient.close();
//     } catch (err) {
//         console.log(err);
//         res.status(500).send("Error during migration" + err);
//     }
// });

router.get('/insertNodes', async (req, res) => {
    try {
        const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

        // Connect to the MongoDB client
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();

        const oldDb = oldClient.db("freecoindb");

        // Clear existing nodes
        await mNodes.deleteMany({});

        const oldNodeCollection = await oldDb.collection("node").find().toArray();
        let insertNodes = [];

        oldNodeCollection.forEach((node) => {
            let nodeValues = {};

            if (ObjectId.isValid(node.userId)) {
                nodeValues.userId = node.userId;

                if (node.left && ObjectId.isValid(node.left.userId)) {
                    nodeValues.leftChild = node.left.userId;
                }

                if (node.right && ObjectId.isValid(node.right.userId)) {
                    nodeValues.rightChild = node.right.userId;
                }

                insertNodes.push(nodeValues);
            } else {
                console.warn("Skipping node due to invalid userId:", node);
            }
        });

        // Insert nodes in batches
        const batchSize = 1000;
        for (let i = 0; i < insertNodes.length; i += batchSize) {
            const batch = insertNodes.slice(i, i + batchSize);
            await mNodes.insertMany(batch);
        }

        console.log(`Successfully migrated ${insertNodes.length} nodes.`);
        res.json({ message: "Node Migration completed successfully", totalMigrated: insertNodes.length });

        await oldClient.close();
    } catch (err) {
        console.error("Error during migration:", err);
        res.status(500).send("Error during migration: " + err.message);
    }
});
router.get('/migrateActiveUsers', async (req, res) => {
    const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";
    const BATCH_SIZE = 500;

    let skippedWallets = 0; // This variable isn't used yet; consider removing if unnecessary.

    try {
        // Connect to the old MongoDB
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");

        // Clear the destination collection
        await mActiveUser.deleteMany({});

        // Use a cursor to stream and process the `businessRecord` collection
        const topupCursor = oldDb.collection('businessRecord').find();

        let newActivityBatch = [];
        let count = 0;

        while (await topupCursor.hasNext()) {
            const top = await topupCursor.next();

            // Map required fields
            const values = {
                leftUsers: top.leftUsers,
                leftActiveUsers: top.leftActiveUsers,
                rightUsers: top.rightUsers,
                rightActiveUsers: top.rightActiveUsers,
                leftBalanceTotal: top.leftBusinessAmount,
                rightBalanceTotal: top.rightBusinessAmount,
                userId: top._id
            };

            newActivityBatch.push(values);
            count++;

            // Insert batch when batch size is reached
            if (count >= BATCH_SIZE) {
                await mActiveUser.insertMany(newActivityBatch);
                newActivityBatch = []; // Reset the batch
                count = 0;
            }
        }

        // Insert any remaining records in the batch
        if (newActivityBatch.length > 0) {
            await mActiveUser.insertMany(newActivityBatch);
        }

        res.status(200).send("Active users migration completed successfully.");
    } catch (err) {
        console.error("Error migrating active users:", err);
        res.status(500).send("An error occurred during migration.");
    }
});

router.get('/migrateFreeCoin', async (req, res) => {
    const oldDbUrl = "mongodb+srv://admin:p%40ssw0rd%279%27%21@cluster0.0js41.mongodb.net/freecoindb";

    try {
        // Connect to the old database
        const oldClient = new MongoClient(oldDbUrl);
        await oldClient.connect();
        const oldDb = oldClient.db("freecoindb");
        const oldCollection = await oldDb.collection("freeCoinAddress").find().toArray();

        const batchSize = 500; // Define a batch size
        for (let i = 0; i < oldCollection.length; i += batchSize) {
            const batch = oldCollection.slice(i, i + batchSize);
            console.log(batch, oldCollection.length)
            const bulkOperations = batch.map(user => ({
                updateOne: {
                    filter: { _id: user.userId }, // Use the original ObjectId
                    update: {
                        $set: { freeCoinAddress: user.freeCoinAddress },
                    },
                },
            }));

            // Perform bulk write operation for the current batch
            await mUser.bulkWrite(bulkOperations);
        }

        // Close the old client connection
        await oldClient.close();

        // Send a success response
        res.status(200).json({ message: "Migration completed successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;