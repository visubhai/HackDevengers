import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in .env');
    process.exit(1);
}

async function updateAdmin() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI!, { serverSelectionTimeoutMS: 30000 });
        console.log('✅ Connected.');

        // Remove old admin
        console.log('🗑️ Removing old admin (admin/admin123)...');
        await User.deleteOne({ username: 'admin' });
        console.log('✅ Removed.');

        // Create new logiopen admin
        console.log('🌱 Creating LogiOpen Master Administrator (logiopen_admin)...');
        const adminHash = await bcrypt.hash('Admin@2024!', 12);
        await User.create({
            name: 'LogiOpen Master Admin',
            email: 'master@logiopen.com',
            username: 'logiopen_admin',
            password: adminHash,
            role: 'SUPER_ADMIN',
            isActive: true
        });
        console.log('✅ LogiOpen Master Admin created.');

        console.log('\n✨ Admin Access Update Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Update Failed:', error);
        process.exit(1);
    }
}

updateAdmin();
