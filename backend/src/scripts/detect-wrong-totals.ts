import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Booking from '../models/Booking';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || '';

async function detectWrongTotals() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Use aggregation to compute expected values in-database and find mismatches
    const results = await Booking.aggregate([
        {
            $addFields: {
                // Expected freight = sum of (quantity * rate) for each parcel
                expectedFreight: {
                    $reduce: {
                        input: '$parcels',
                        initialValue: 0,
                        in: {
                            $add: [
                                '$$value',
                                { $multiply: ['$$this.quantity', '$$this.rate'] }
                            ]
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                // Expected total = expectedFreight + handling + hamali
                expectedTotal: {
                    $add: ['$expectedFreight', '$costs.handling', '$costs.hamali']
                },
                // Freight mismatch = stored freight ≠ computed freight
                freightMismatch: {
                    $gt: [
                        { $abs: { $subtract: ['$costs.freight', '$expectedFreight'] } },
                        0.01
                    ]
                },
                // Total mismatch = stored total ≠ expected total
                totalMismatch: {
                    $gt: [
                        { $abs: { $subtract: ['$costs.total', '$expectedTotal'] } },
                        0.01
                    ]
                }
            }
        },
        {
            $match: {
                $or: [{ freightMismatch: true }, { totalMismatch: true }]
            }
        },
        {
            $project: {
                lrNumber: 1,
                status: 1,
                createdAt: 1,
                'costs.freight': 1,
                'costs.handling': 1,
                'costs.hamali': 1,
                'costs.total': 1,
                expectedFreight: 1,
                expectedTotal: 1,
                freightMismatch: 1,
                totalMismatch: 1,
                parcelCount: { $size: '$parcels' },
                parcels: { $slice: ['$parcels', 5] } // Show up to 5 parcels for context
            }
        },
        { $sort: { createdAt: -1 } }
    ]);

    if (results.length === 0) {
        console.log('✅ No mismatched bookings found. All records are consistent.');
        await mongoose.disconnect();
        return;
    }

    console.log(`⚠️  Found ${results.length} booking(s) with mismatched costs:\n`);
    console.log('─'.repeat(90));

    let fixableCount = 0;

    for (const b of results) {
        const diff = b.expectedTotal - b.costs.total;
        console.log(`LR: ${b.lrNumber}  |  Status: ${b.status}  |  Date: ${new Date(b.createdAt).toLocaleDateString('en-IN')}`);
        console.log(`  Stored   → freight: ${b.costs.freight}, handling: ${b.costs.handling}, hamali: ${b.costs.hamali}, total: ${b.costs.total}`);
        console.log(`  Expected → freight: ${b.expectedFreight}, total: ${b.expectedTotal}  (diff: ${diff > 0 ? '+' : ''}${diff.toFixed(2)})`);

        if (b.parcels.length > 0) {
            const parcelSummary = b.parcels
                .map((p: any) => `qty=${p.quantity} × rate=${p.rate}`)
                .join(', ');
            console.log(`  Parcels  → ${parcelSummary}${b.parcelCount > 5 ? ` ... (+${b.parcelCount - 5} more)` : ''}`);
        }
        console.log('─'.repeat(90));
        fixableCount++;
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`  Total mismatched: ${results.length}`);
    console.log(`  Fixable (can be recomputed from parcel data): ${fixableCount}`);
    console.log(`\nRun fix-wrong-totals.ts to correct these records.`);

    await mongoose.disconnect();
}

detectWrongTotals().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
