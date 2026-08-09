import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

async function verify() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is missing');

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB.');

        // 1. Find the Udhna branch
        const udhna = await mongoose.connection.collection('branches').findOne({ name: 'udhana' });
        if (!udhna) {
            console.log('⚠️ Branch "udhana" not found.');
        } else {
            console.log(`Branch "udhana" isActive: ${udhna.isActive}`);

            // If it's active, inactivate it for testing
            if (udhna.isActive) {
                console.log('🔄 Inactivating "udhana" for testing...');
                await mongoose.connection.collection('branches').updateOne({ _id: udhna._id }, { $set: { isActive: false } });
                console.log('✅ "udhana" is now inactive.');
            }
        }

        // 2. Find a user belonging to Udhna
        const udhnaUser = await mongoose.connection.collection('users').findOne({ branchId: udhna?._id });
        if (udhnaUser) {
            console.log(`Found user for Udhna: ${udhnaUser.username}`);
            console.log(`User isActive: ${udhnaUser.isActive}`);
        }

        console.log('\n--- Logic Verification ---');

        // Mocking the logic I added to authController.ts
        const checkLogin = (user: any, branch: any) => {
            if (!user.isActive) return 'FAIL: User inactive';
            if (user.role === 'BRANCH' && branch && !branch.isActive) return 'FAIL: Branch inactive';
            return 'PASS';
        };

        if (udhna && udhnaUser) {
            const status = await mongoose.connection.collection('branches').findOne({ _id: udhna._id });
            const result = checkLogin(udhnaUser, status);
            console.log(`Login check for ${udhnaUser.username}: ${result}`);
        }

        // 3. Clean up (Optional: leave it inactive as requested by user)
        // For this task, the user WANTS it inactive, so I won't re-activate it.

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verify();
