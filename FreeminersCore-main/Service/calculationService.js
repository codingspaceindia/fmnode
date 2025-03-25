const mNodes = require("../Models/mNodes");
const Balance = require("../Models/mBalance");
const BusinessTotal = require("../Models/mBusinessTotal");

// Build flat organizational chart
const buildFlatOrgChart = (nodes, rootId) => {
    const nodeMap = new Map();

    // Map nodes by userId
    nodes.forEach((node) => {
        if (node.userId) {
            nodeMap.set(node.userId._id.toString(), node);
        }
    });

    const result = [];
    const visited = new Set();

    const traverse = (userId, parentId = "") => {
        const currentNode = nodeMap.get(userId.toString());
        if (!currentNode || !currentNode.userId) return;

        if (visited.has(currentNode._id.toString())) return;
        visited.add(currentNode._id.toString());

        result.push({
            id: currentNode._id.toString(),
            name: currentNode.userId.name || `User ${currentNode.userId._id}`,
            refId: currentNode.userId.refId || `Ref-${currentNode.userId._id}`,
            position: currentNode.userId.position || "Position Not Specified",
            activeStat: currentNode.userId.activeStat || "A",
            image: currentNode.userId.image || "https://via.placeholder.com/150",
            parentId: parentId,
            leftChild: currentNode.leftChild,
            rightChild: currentNode.rightChild,
        });

        if (currentNode.leftChild) {
            traverse(currentNode.leftChild.toString(), currentNode._id.toString());
        }
        if (currentNode.rightChild) {
            traverse(currentNode.rightChild.toString(), currentNode._id.toString());
        }
    };

    traverse(rootId);
    return result;
};

// Calculate business totals
const calculateBusinessTotals = async (flatChart) => {
    const userIdToBusiness = new Map();

    for (const node of flatChart) {
        const balance = await Balance.findOne({ userId: node.id, activeStat: "A" });
        const userBusiness = balance ? balance.balance : 0;
        userIdToBusiness.set(node.id, userBusiness);
    }

    for (const node of flatChart) {
        const leftBusiness = userIdToBusiness.get(node.leftChild?.toString()) || 0;
        const rightBusiness = userIdToBusiness.get(node.rightChild?.toString()) || 0;

        await updateBusinessTotals(node.id, leftBusiness, rightBusiness);
    }
};

// Update business totals
const updateBusinessTotals = async (userId, leftBusinessTotal, rightBusinessTotal) => {
    const existingRecord = await BusinessTotal.findOne({ userId });

    if (existingRecord) {
        const hasChanges =
            existingRecord.leftBusinessTotal !== leftBusinessTotal ||
            existingRecord.rightBusinessTotal !== rightBusinessTotal;

        if (hasChanges) {
            existingRecord.leftBusinessTotal = leftBusinessTotal;
            existingRecord.rightBusinessTotal = rightBusinessTotal;
            await existingRecord.save();
        }
    } else {
        const newRecord = new BusinessTotal({
            userId,
            leftBusinessTotal,
            rightBusinessTotal,
        });
        await newRecord.save();
    }
};

// Main function to handle the request
exports.rightLeftBusiness = async (details, res) => {
    try {
        const userId = details?.token?.subject?._id;
        if (!userId) {
            return res.status(400).send("Invalid user ID in request");
        }

        const nodes = await mNodes.find({ activeStat: "A" }).populate(
            "userId",
            "userName name refId activeStat"
        );
        const rootNode = nodes.find((node) => node.userId && node.userId._id.toString() === userId);

        if (!rootNode) {
            return res.status(404).send("Root node not found");
        }

        const flatChart = buildFlatOrgChart(nodes, rootNode.userId._id);
        await calculateBusinessTotals(flatChart);

        return res.status(200).json(flatChart);
    } catch (err) {
        console.error("Error in rightLeftBusiness:", err);
        return res.status(500).send("Server Error");
    }
};