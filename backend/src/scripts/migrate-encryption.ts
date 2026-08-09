/**
 * Encryption Key Migration Script
 *
 * Migrates all existing booking PII (sender/receiver fields) from the
 * old default encryption key to a new secure key.
 *
 * Usage:
 *   NEW_ENCRYPTION_KEY=your_new_32char_key npx ts-node src/scripts/migrate-encryption.ts
 *
 * IMPORTANT: Run this ONCE. Do not run again after setting ENCRYPTION_KEY in .env.
 */

import mongoose, { Schema } from 'mongoose';
import mongooseFieldEncryption from 'mongoose-field-encryption';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { fieldEncryption } = mongooseFieldEncryption;

const OLD_KEY = 'default_insecure_development_key_32_bytes!';
const NEW_KEY = process.env.NEW_ENCRYPTION_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const SALT = '1234567890123456';
const ENCRYPTED_FIELDS = [
    'sender.name', 'sender.mobile', 'sender.email',
    'receiver.name', 'receiver.mobile', 'receiver.email'
];

if (!NEW_KEY) {
    console.error('❌ NEW_ENCRYPTION_KEY is not set.');
    console.error('   Run: NEW_ENCRYPTION_KEY=your32charkey npx ts-node src/scripts/migrate-encryption.ts');
    process.exit(1);
}

if (NEW_KEY === OLD_KEY) {
    console.error('❌ NEW_ENCRYPTION_KEY is the same as the old default key. Nothing to migrate.');
    process.exit(1);
}

if (NEW_KEY.length < 32) {
    console.error('❌ NEW_ENCRYPTION_KEY must be at least 32 characters long.');
    process.exit(1);
}

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
}

// Minimal schema for reading — strict:false keeps all other fields intact
const makeSchema = (key: string) => {
    const s = new Schema({
        sender: { name: String, mobile: String, email: String },
        receiver: { name: String, mobile: String, email: String },
    }, { strict: false, timestamps: false });

    s.plugin(fieldEncryption, {
        fields: ENCRYPTED_FIELDS,
        secret: key,
        saltGenerator: () => SALT,
    });

    return s;
};

async function migrate() {
    console.log('\n🔐 Encryption Key Migration');
    console.log('============================');
    console.log(`Old key: ${OLD_KEY.substring(0, 8)}...`);
    console.log(`New key: ${NEW_KEY!.substring(0, 8)}...`);
    console.log('');

    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db!;

    // Register OLD model for reading
    const OldBooking = mongoose.model('OldBooking', makeSchema(OLD_KEY), 'bookings');

    const total = await db.collection('bookings').countDocuments();
    console.log(`📦 Found ${total} bookings to migrate\n`);

    if (total === 0) {
        console.log('Nothing to migrate.');
        await mongoose.disconnect();
        return;
    }

    // Read ALL documents with old key — mongoose auto-decrypts
    const docs = await OldBooking.find({}).lean(false);

    // Store decrypted values in memory
    const decrypted: Array<{
        _id: any;
        sender: { name?: string; mobile?: string; email?: string };
        receiver: { name?: string; mobile?: string; email?: string };
    }> = docs.map((doc: any) => ({
        _id: doc._id,
        sender: {
            name: doc.sender?.name,
            mobile: doc.sender?.mobile,
            email: doc.sender?.email,
        },
        receiver: {
            name: doc.receiver?.name,
            mobile: doc.receiver?.mobile,
            email: doc.receiver?.email,
        },
    }));

    console.log('✅ Decrypted all bookings with old key');

    // Register NEW model for writing
    // Must delete old model registration first to avoid mongoose conflict
    delete (mongoose.models as any)['OldBooking'];
    const NewBooking = mongoose.model('NewBooking', makeSchema(NEW_KEY!), 'bookings');

    let migrated = 0;
    let failed = 0;

    for (const item of decrypted) {
        try {
            // Step 1: Write plaintext directly to MongoDB (bypasses all mongoose hooks)
            await db.collection('bookings').updateOne(
                { _id: item._id },
                {
                    $set: {
                        'sender.name': item.sender.name ?? '',
                        'sender.mobile': item.sender.mobile ?? '',
                        'sender.email': item.sender.email ?? '',
                        'receiver.name': item.receiver.name ?? '',
                        'receiver.mobile': item.receiver.mobile ?? '',
                        'receiver.email': item.receiver.email ?? '',
                    }
                }
            );

            // Step 2: Read with new model (plaintext passes through, no enc: prefix so hook skips)
            //         Save triggers pre-save hook which re-encrypts with new key
            const newDoc = await NewBooking.findById(item._id);
            if (newDoc) {
                await newDoc.save();
            }

            migrated++;
            if (migrated % 50 === 0 || migrated === total) {
                console.log(`   Progress: ${migrated}/${total}`);
            }
        } catch (err: any) {
            console.error(`   ❌ Failed for booking ${item._id}: ${err.message}`);
            failed++;
        }
    }

    console.log('\n============================');
    if (failed === 0) {
        console.log(`✅ Migration complete! ${migrated}/${total} bookings re-encrypted.`);
        console.log('\nNext step: Add this to your backend .env file:');
        console.log(`ENCRYPTION_KEY=${NEW_KEY}`);
        console.log('\nThen restart your backend server.');
    } else {
        console.log(`⚠️  Migration finished with errors: ${migrated} succeeded, ${failed} failed.`);
        console.log('   Do NOT update ENCRYPTION_KEY until all records are migrated successfully.');
    }

    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
