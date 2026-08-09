import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import Booking from '../src/models/Booking';
import Customer from '../src/models/Customer';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DRY_RUN = process.env.DRY_RUN === 'true'; // Default to false for this manual run

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

        const totalBookings = await Booking.countDocuments();
        console.log(`📊 Found ${totalBookings} total bookings to scan for customers.`);

        const cursor = Booking.find({}).cursor();
        let processed = 0;
        let customersFound = 0;
        let errors = 0;

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            processed++;
            try {
                const operations = [];

                if (doc.sender?.name && doc.sender?.mobile) {
                    customersFound++;
                    if (!DRY_RUN) {
                        operations.push({
                            updateOne: {
                                filter: { mobile: doc.sender.mobile, name: doc.sender.name },
                                update: { $set: { mobile: doc.sender.mobile, name: doc.sender.name } },
                                upsert: true
                            }
                        });
                    }
                }

                if (doc.receiver?.name && doc.receiver?.mobile) {
                    customersFound++;
                    if (!DRY_RUN) {
                        operations.push({
                            updateOne: {
                                filter: { mobile: doc.receiver.mobile, name: doc.receiver.name },
                                update: { $set: { mobile: doc.receiver.mobile, name: doc.receiver.name } },
                                upsert: true
                            }
                        });
                    }
                }

                if (operations.length > 0 && !DRY_RUN) {
                    await Customer.bulkWrite(operations, { ordered: false }).catch(() => {}); // Ignore duplicate warnings
                }

                if (processed % 100 === 0 || processed === totalBookings) {
                    console.log(`   -> Scanned ${processed}/${totalBookings} bookings...`);
                }
            } catch (err) {
                console.error(`❌ Error processing booking ${doc._id}:`, err);
                errors++;
            }
        }

        console.log('\n--- CUSTOMER MIGRATION SUMMARY ---');
        console.log(`✅ Total Bookings Scanned: ${processed}`);
        console.log(`✨ Total Customers Found & Saved: ${customersFound}`);
        console.log(`⚠️ Total Errors: ${errors}`);
        console.log('-------------------------\n');

        if (DRY_RUN) {
            console.log('💡 This was a DRY RUN. To apply changes, run with DRY_RUN=false');
        } else {
            console.log('🎉 Memory Bank Backfill completed successfully!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
