// const mongoose = require("mongoose");
// const mNodes = require("../Models/mNodes");
// const mTopup = require("../Models/mTopupHistory");
// const DailyLeftRight = require("../Models/mDailyLeftRight");

// const balanceCache = {}; // Cache to store already calculated balances

// // Utility: Get today's date details
// const getTodayDetails = () => {
//     const now = new Date();
//     return {
//         date: now.toISOString().split("T")[0],
//         year: now.getFullYear(),
//         month: now.getMonth() + 1,
//         day: now.getDate(),
//     };
// };

// // Utility: Get start and end of the day (12 AM - 9 PM UTC)
// const getStartAndEndOfDay = () => {
//     const now = new Date();
//     const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
//     const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 0, 0));
//     return { startOfDay, endOfDay };
// };
// exports.dailyBusinessTotals = async (details) => {
//     try {
//         const userId = details._id;
//         const { date } = getTodayDetails();

//         // Check if a daily business record already exists
//         const existingRecord = await DailyLeftRight.findOne({ userId, date });
//         if (existingRecord) {
//             console.log(`Daily business totals already recorded for User ID: ${userId}`);
//             return "Daily business totals already recorded for this user.";
//         }

//         // Find root node for the user
//         const rootNode = await mNodes
//             .findOne({ userId, activeStat: "A" })
//             .populate("userId", "_id userName name refId activeStat");

//         if (!rootNode) {
//             console.log(`Root node not found for User ID: ${userId}`);
//             return "Root node not found.";
//         }

//         // Fetch all active nodes
//         const nodes = await mNodes.find({ activeStat: "A" }).populate("userId", "_id userName name refId activeStat");

//         console.log(`Building Flat Org Chart for Root ID: ${rootNode._id}`);
//         const result = await buildFlatOrgChart(nodes, rootNode._id.toString());

//         if (result && result.length > 0) {
//             console.log(`Flat Org Chart built and saved successfully for User ID: ${userId}`);
//         } else {
//             console.error(`Flat Org Chart failed to process for User ID: ${userId}`);
//         }

//         return "Daily business totals calculated and saved successfully.";
//     } catch (err) {
//         console.error("Error calculating daily business totals:", err);
//         throw err;
//     }
// };

// const buildFlatOrgChart = async (nodes, rootId) => {
//     const nodeMap = new Map();
//     nodes.forEach((node) => node.userId && nodeMap.set(node.userId._id.toString(), node));

//     const result = [];
//     const visited = new Set();

//     const traverse = async (userId, parentId = "") => {
//         const currentNode = nodeMap.get(userId);
//         if (!currentNode || visited.has(currentNode._id.toString())) return;

//         visited.add(currentNode._id.toString());

//         const { leftChild, rightChild } = currentNode;

//         console.log(`Traversing User ID: ${userId}`);

//         // Calculate totals for left and right children
//         const leftBusiness = leftChild
//             ? await processChild(leftChild, currentNode._id.toString())
//             : 0;

//         const rightBusiness = rightChild
//             ? await processChild(rightChild, currentNode._id.toString())
//             : 0;

//         console.log(`Processed User ID: ${userId} - Left: ${leftBusiness}, Right: ${rightBusiness}`);

//         const { date, year, month, day } = getTodayDetails();

//         try {
//             // Save daily record for the current node
//             const newDailyRecord = new DailyLeftRight({
//                 userId: currentNode.userId._id,
//                 leftBusinessTotal: leftBusiness,
//                 rightBusinessTotal: rightBusiness,
//                 date,
//                 day,
//                 month,
//                 year,
//                 activeStat: "A",
//             });
//             await newDailyRecord.save();
//             console.log(`Saved DailyLeftRight Record for User ID: ${userId}`);
//         } catch (error) {
//             console.error(`Error saving DailyLeftRight for User ID: ${userId}`, error.message);
//         }

//         result.push({
//             id: currentNode._id.toString(),
//             name: currentNode.userId.name || `User ${currentNode.userId._id}`,
//             refId: currentNode.userId.refId || `Ref-${currentNode.userId._id}`,
//             parentId,
//             leftBusiness,
//             rightBusiness,
//             activeStat: currentNode.userId.activeStat || "A",
//         });
//     };

//     const processChild = async (childId, parentId) => {
//         const child = nodeMap.get(childId.toString());
//         if (child) {
//             await traverse(childId.toString(), parentId);
//             return await calculateTotalBusiness(child);
//         }
//         return 0;
//     };

//     await traverse(rootId);
//     return result;
// };

// const calculateTotalBusiness = async (node) => {
//     const { startOfDay, endOfDay } = getStartAndEndOfDay();
//     if (!node) return 0;

//     const userId = node.userId._id.toString();
//     if (balanceCache[userId]) return balanceCache[userId];

//     try {
//         const balance = await mTopup.aggregate([
//             {
//                 $match: {
//                     userId: mongoose.Types.ObjectId(userId),
//                     activeStat: "A",
//                     topupDate: { $gte: startOfDay, $lte: endOfDay },
//                 },
//             },
//             { $group: { _id: null, total: { $sum: "$balance" } } },
//         ]);

//         let totalBusiness = balance.length ? balance[0].total : 0;

//         balanceCache[userId] = totalBusiness;
//         return totalBusiness;
//     } catch (error) {
//         console.error(`Error calculating total business for UserId: ${userId}`, error.message);
//         return 0;
//     }
// };