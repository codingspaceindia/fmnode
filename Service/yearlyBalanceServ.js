const mStakingHistory = require('../Models/mTopupHistory');
const Balance = require('../Models/mBalance');

exports.runBalanceCheck = async () => {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Fetch staking history records where topupDate is one year old and yearlyDeduction is false
        const records = await mStakingHistory.find(
            { topupDate: { $lte: oneYearAgo }, yearlyDeduction: false },
            { _id: 1, userId: 1, balance: 1, totalCoins: 1 } // Fetch only required fields
        );

        if (records.length === 0) {
            console.log('No records found for yearly deduction.');
            return;
        }

        // Process records in batches
        const batchSize = 500; // Adjust batch size based on expected record volume and system resources
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            // Prepare bulk operations for Balance collection
            const balanceUpdates = batch.map(record => ({
                updateOne: {
                    filter: { userId: record.userId },
                    update: {
                        $inc: {
                            balance: -record.balance,
                            totalCoins: -record.totalCoins
                        }
                    }
                }
            }));

            // Prepare bulk operations for StakingHistory collection
            const stakingUpdates = batch.map(record => ({
                updateOne: {
                    filter: { _id: record._id },
                    update: { yearlyDeduction: true }
                }
            }));

            // Execute bulk operations
            await Promise.all([
                Balance.bulkWrite(balanceUpdates),
                mStakingHistory.bulkWrite(stakingUpdates)
            ]);

            console.log(`Processed batch ${Math.floor(i / batchSize) + 1} with ${batch.length} records.`);
        }

        console.log('Yearly deduction process completed.');
    } catch (error) {
        console.error('Error during yearly deduction process:', error.message);
    }
};