import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../apps/backend/src/models/User';
import Branch from '../apps/backend/src/models/Branch';
import Booking from '../apps/backend/src/models/Booking';
import Transaction from '../apps/backend/src/models/Transaction';
import Counter from '../apps/backend/src/models/Counter';
import ReportPermission from '../apps/backend/src/models/ReportPermission';
import AuditLog from '../apps/backend/src/models/AuditLog';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in .env');
    process.exit(1);
}

async function cleanup() {
    try {
        console.log('🔄 Connecting to MongoDB for Production Cleanup...');
        await mongoose.connect(MONGODB_URI!, { serverSelectionTimeoutMS: 30000 });
        console.log('✅ Connected.');

        // 1. Clear Collections Sequentially to avoid Atlas bottlenecks
        console.log('🧹 Clearing collections...');
        const models = [User, Branch, Booking, Transaction, Counter, ReportPermission, AuditLog];
        for (const model of models) {
            console.log(`   - Clearing ${model.modelName}...`);
            await (model as any).deleteMany({});
        }
        console.log('✅ All data cleared.');

        // 2. Create Initial Super Admin
        console.log('🌱 Creating Initial Super Admin...');
        const adminHash = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
            name: 'System Administrator',
            email: 'admin@savanlogistics.com',
            username: 'admin',
            password: adminHash,
            role: 'SUPER_ADMIN',
            isActive: true
        });

        console.log('\n✨ Database Reset Complete!');
        console.log('---------------------------');
        console.log('Credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('Role: SUPER_ADMIN');
        console.log('---------------------------');
        console.log('Please change the password immediately after first login.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup Failed:', error);
        process.exit(1);
    }
}

cleanup();
