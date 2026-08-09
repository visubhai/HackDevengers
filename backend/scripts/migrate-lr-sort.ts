import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import Booking from '../src/models/Booking';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to true for safety

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function migrate() {
    try {
        console.log(`📡 Connecting to MongoDB...`);
        await mongoose.connect(MONGODB_URI!);
        console.log('✅ Connected to MongoDB');

        console.log(DRY_RUN ? '🔍 MODE: DRY RUN (No changes will be saved)' : '🚀 MODE: LIVE (Data will be updated)');

        // Find all bookings missing the sort helper fields
        const query = {
            $or: [
                { lrPrefix: { $exists: false } },
                { lrIndex: { $exists: false } }
            ]
        };

        const totalToUpdate = await Booking.countDocuments(query);
        console.log(`📊 Found ${totalToUpdate} bookings requiring backfill.`);

        if (totalToUpdate === 0) {
            console.log('✅ All bookings are already up to date.');
            process.exit(0);
        }

        const cursor = Booking.find(query).cursor();
        let processed = 0;
        let updated = 0;
        let errors = 0;

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            processed++;
            try {
                const lrNumber = doc.lrNumber || '';
                const parts = lrNumber.split('/');
                const prefix = parts[0] || 'UNK';
                const index = parseInt(parts[1], 10) || 0;

                if (!DRY_RUN) {
                    await Booking.updateOne(
                        { _id: doc._id },
                        { $set: { lrPrefix: prefix, lrIndex: index } }
                    );
                    updated++;
                }

                if (processed % 100 === 0 || processed === totalToUpdate) {
                    console.log(`   -> Processed ${processed}/${totalToUpdate}...`);
                }
            } catch (err) {
                console.error(`❌ Error processing booking ${doc._id}:`, err);
                errors++;
            }
        }

        console.log('\n--- MIGRATION SUMMARY ---');
        console.log(`✅ Total Processed: ${processed}`);
        console.log(`✨ Total Updated: ${updated}`);
        console.log(`⚠️ Total Errors: ${errors}`);
        console.log('-------------------------\n');

        if (DRY_RUN) {
            console.log('💡 This was a DRY RUN. To apply changes, run with DRY_RUN=false');
        } else {
            console.log('🎉 Migration completed successfully!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
