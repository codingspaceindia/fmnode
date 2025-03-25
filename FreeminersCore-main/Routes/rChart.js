const express = require('express');
const router = express.Router();
const mNodes = require('../Models/mNodes');
const responseServ = require('../Service/responseService');
const mBalance = require('../Models/mBalance');

router.get('/getChart', async (req, res) => {
    try {
        const { _id } = req.body.token.subject; // Root user ID from the token

        // Fetch all nodes from the database with userId populated
        const allNodes = await mNodes.find({})
            .lean()
            .populate('userId', 'userName name refId activeStat position image _id');

        if (!allNodes || allNodes.length === 0) {
            return responseServ.sendErrorResponse(res, { message: 'No nodes found in the database.' });
        }

        const balances = await mBalance.find();

        // Build the org chart in a flat structure
        const orgChart = buildFlatOrgChart(allNodes, _id, balances);

        if (!orgChart || orgChart.length === 0) {
            return responseServ.sendErrorResponse(res, { message: 'Root user not found in the database.' });
        }

        return responseServ.sendSuccessResponse(res, orgChart);
    } catch (error) {
        console.error('Error constructing org chart:', error);
        return responseServ.sendErrorResponse(res, { error: 'Internal server error' });
    }
});
const buildFlatOrgChart = (nodes, rootId, balances) => {
    const nodeMap = new Map();
    const balanceMap = new Map();

    // Create a map of balances by userId
    balances.forEach((balance) => {
        if (balance.userId) {
            balanceMap.set(balance.userId.toString(), balance);
        }
    });

    // Populate the nodeMap with userId, leftChild, and rightChild
    nodes.forEach((node) => {
        if (node.userId) {
            nodeMap.set(node.userId._id.toString(), node);
        }
    });

    const result = [];
    const visited = new Set(); // To track visited nodes

    const traverse = (userId, parentId = "") => {
        const currentNode = nodeMap.get(userId.toString());

        if (!currentNode || !currentNode.userId) return;
        // Check if the current node is already processed
        if (visited.has(currentNode._id.toString())) return;

        // Mark the node as visited
        visited.add(currentNode._id.toString());

        // Add the current node to the result array
        result.push({
            id: currentNode._id.toString(), // Unique identifier for d3-org-chart
            name: currentNode.userId.name || `User ${currentNode.userId._id}`, // Display name
            refId: currentNode.userId.refId || `Ref-${currentNode.userId._id}`, // Reference ID
            position: currentNode.userId.position || "Position Not Specified", // Position (optional for display)
            activeStat: balanceMap.has(currentNode.userId._id.toString())
                ? (balanceMap.get(currentNode.userId._id.toString()).totalCoins > 0 ? 'A' : 'D')
                : 'D',
            image: currentNode.userId.image || "https://via.placeholder.com/150", // Profile image URL
            parentId: parentId, // Parent ID for this node
        });

        // Traverse left and right children
        if (currentNode.leftChild) {
            traverse(currentNode.leftChild._id.toString(), currentNode._id.toString());
        }

        if (currentNode.rightChild) {
            traverse(currentNode.rightChild._id.toString(), currentNode._id.toString());
        }
    };

    // Start traversal from the root node
    traverse(rootId);

    return result;
};
module.exports = router;