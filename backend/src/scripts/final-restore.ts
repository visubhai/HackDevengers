import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Branch from '../models/Branch';
import Booking from '../models/Booking';
import Transaction from '../models/Transaction';
import Counter from '../models/Counter';
import ReportPermission from '../models/ReportPermission';
import AuditLog from '../models/AuditLog';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const seedData = [
    { branch: 'mumbai-borivali', pass: 'savan3456', state: 'Maharashtra' },
    { branch: 'amdavad-ctm', pass: 'savan6734', state: 'Gujarat' },
    { branch: 'mumbai-andheri', pass: 'savan4598', state: 'Maharashtra' },
    { branch: 'setelite', pass: '444245', state: 'Gujarat' },
    { branch: 'mumbai-vasai', pass: 'savan2356', state: 'Maharashtra' },
    { branch: 'udhana', pass: '1234', state: 'Gujarat' },
    { branch: 'bapunagar', pass: '888942', state: 'Gujarat' },
    { branch: 'hirabagh', pass: 'savan8980', state: 'Gujarat' },
    { branch: 'rajkot-punitnagar', pass: '1234', state: 'Gujarat' },
    { branch: 'sahara', pass: '1234', state: 'Gujarat' },
    { branch: 'paldi', pass: '994142', state: 'Gujarat' },
    { branch: 'rajkot-limdachok', pass: '1234', state: 'Gujarat' },
    { branch: 'katargam', pass: 'savan4567', state: 'Gujarat' },
    { branch: 'sachin', pass: '1234', state: 'Gujarat' },
    { branch: 'savan', pass: '95008', state: 'Gujarat' }
];

async function finalRestore() {
    try {
        console.log('🔄 FINAL RESTORE: Cleaning and Seting up 15 Stations...');
        if (!MONGODB_URI) throw new Error('MONGODB_URI is missing');

        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
        console.log('✅ Connected to MongoDB.');

        // 1. Wipe Everything
        const collections = ['users', 'branches', 'bookings', 'transactions', 'counters', 'reportpermissions', 'auditlogs'];
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection failed');

        for (const col of collections) {
            console.log(`🧹 Clearing ${col}...`);
            await db.collection(col).deleteMany({});
        }

        // 2. Create Super Admin
        console.log('🌱 Creating Super Admin...');
        const adminHash = await bcrypt.hash('admin123', 10);
        await User.create({
            name: 'Super Admin',
            email: 'admin@system.com',
            username: 'admin',
            password: adminHash,
            role: 'SUPER_ADMIN',
            isActive: true
        });

        // 3. Create Branches and Users
        for (const [index, item] of seedData.entries()) {
            const branch = await Branch.create({
                name: item.branch,
                branchCode: (item.branch.split('-').map(s => s[0]).join('') + (index + 1)).toUpperCase(),
                state: item.state,
                isActive: true
            });

            const passHash = await bcrypt.hash(item.pass.toString(), 10);
            await User.create({
                name: item.branch,
                email: `${item.branch}@savan.com`,
                username: item.branch,
                password: passHash,
                role: 'BRANCH',
                branch: branch._id,
                branchId: branch._id,
                isActive: true
            });
            console.log(` ✅ Setup Station: ${item.branch} (Code: ${branch.branchCode})`);
        }

        console.log('\n✨ ALL 15 STATIONS RESTORED AND CONFIGURED.');
        console.log('-------------------------------------------');
        console.log('Super Admin: admin / admin123');
        console.log('Example Branch: mumbai-borivali / savan3456');
        console.log('-------------------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Restore Failed:', error);
        process.exit(1);
    }
}

finalRestore();
