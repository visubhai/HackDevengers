import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

async function run() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is missing');

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB.');

        const result = await mongoose.connection.collection('users').updateOne(
            { username: 'savan' },
            { $set: { role: 'SUPER_ADMIN' } }
        );

        if (result.matchedCount === 0) {
            console.log('⚠️ No user found with username: savan');
        } else {
            console.log('✅ Success! Savan promoted to SUPER_ADMIN.');
            console.log(`- Matched: ${result.matchedCount}`);
            console.log(`- Modified: ${result.modifiedCount}`);
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

run();
