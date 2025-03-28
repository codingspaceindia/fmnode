// db.js

const mongoose = require('mongoose');

// Function to establish the database connection
async function connectToDatabase() {
    try {
        const dbUrl = 'mongodb+srv://fm:*****@cluster0.nilq1.mongodb.net/test'
        await mongoose.connect(dbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: true,
            serverSelectionTimeoutMS: 30000, // Set to a lower value
            connectTimeoutMS: 10000, // Set to a lower value,
            socketTimeoutMS: 300000, // 5 minutes
            maxPoolSize: 10
        });
        console.log(`Connected to the database! ${dbUrl}`);
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

module.exports = { connectToDatabase };
