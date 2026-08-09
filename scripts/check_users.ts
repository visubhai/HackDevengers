import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../apps/backend/src/models/User';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

async function checkUsers() {
    try {
        console.log('Using URI:', process.env.MONGODB_URI);
        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing');

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected.');

        const users = await User.find({}, 'name username email role').lean();
        console.log('Total users:', users.length);
        if (users.length > 0) {
            console.log('User list (username / email / role):');
            users.forEach((u: any) => {
                console.log(`- ${u.username || 'N/A'} / ${u.email} / ${u.role}`);
            });
        } else {
            console.log('⚠️ No users found in database.');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUsers();
