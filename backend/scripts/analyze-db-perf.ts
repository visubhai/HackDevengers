import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from '../src/models/Booking';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function analyze() {
    try {
        await mongoose.connect(MONGODB_URI as string);
        console.log("Connected to DB.");

        const totalBookings = await Booking.countDocuments();
        console.log(`\n--- DB Stats ---`);
        console.log(`Total Bookings: ${totalBookings}`);

        // Analyze a typical slow query: Fetching by date
        console.log(`\n--- Query Analysis: Date Range ---`);
        const startDate = new Date('2026-03-14T00:00:00.000Z');
        const endDate = new Date('2026-03-14T23:59:59.999Z');
        
        const dateQuery = {
            createdAt: { $gte: startDate, $lte: endDate }
        };

        const dateExplain: any = await Booking.find(dateQuery).explain('executionStats');
        console.log(`Execution Time: ${dateExplain[0]?.executionStats?.executionTimeMillis ?? dateExplain.executionStats?.executionTimeMillis}ms`);
        console.log(`Total Docs Examined: ${dateExplain[0]?.executionStats?.totalDocsExamined ?? dateExplain.executionStats?.totalDocsExamined}`);
        console.log(`Index Used: ${JSON.stringify(dateExplain[0]?.queryPlanner?.winningPlan ?? dateExplain.queryPlanner?.winningPlan)}`);

        // Analyze the heavy stats aggregation pipeline
        console.log(`\n--- Aggregation Analysis: Stats ---`);
        const aggStart = Date.now();
        await Booking.aggregate([
            { $match: dateQuery },
            {
                $facet: {
                    count: [{ $count: "total" }],
                    stats: [
                        {
                            $project: {
                                "costs.total": 1,
                                "paymentType": 1,
                                "status": 1,
                                "parcelQty": { $sum: "$parcels.quantity" }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: { $cond: [{ $ne: ["$status", "CANCELLED"] }, "$costs.total", 0] } },
                                totalParcels: { $sum: { $cond: [{ $ne: ["$status", "CANCELLED"] }, "$parcelQty", 0] } }
                            }
                        }
                    ]
                }
            }
        ]);
        console.log(`Aggregation Execution Time: ${Date.now() - aggStart}ms`);

        // Get index info
        console.log(`\n--- Collection Indexes ---`);
        const indexes = await Booking.collection.indexes();
        indexes.forEach(idx => console.log(`Name: ${idx.name}, Keys: ${JSON.stringify(idx.key)}`));

        await mongoose.disconnect();
    } catch (e) {
        console.error("Analysis Error:", e);
        process.exit(1);
    }
}

analyze();
