import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkAdmin() {
    try {
        await mongoose.connect(MONGODB_URI!);
        const admin = await User.findOne({ username: 'admin' });
        if (admin) {
            console.log('✅ Admin user found:', admin.username, 'Role:', admin.role);
        } else {
            console.log('❌ Admin user NOT found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAdmin();
