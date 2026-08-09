import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../apps/backend/src/models/User';
import Branch from '../apps/backend/src/models/Branch';
import Booking from '../apps/backend/src/models/Booking';
import Transaction from '../apps/backend/src/models/Transaction';
import Counter from '../apps/backend/src/models/Counter';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in .env.local');
    process.exit(1);
}

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

const senderNames = ['Rajesh Kumar', 'Suresh Patel', 'Amit Shah', 'Priya Mehta', 'Rahul Varma'];
const receiverNames = ['Jayesh Bhai', 'Kiran Patel', 'Deepak Gupta', 'Sneha Reddy', 'Manish Jha'];
const itemTypes = ['White Sack', 'Box', 'Packet', 'Industrial Part', 'Electronics'];

async function seed() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI!);
        console.log('✅ Connected.');

        // 1. Clear Data
        console.log('🧹 Clearing old data...');
        await User.deleteMany({});
        await Branch.deleteMany({});
        await Booking.deleteMany({});
        await Transaction.deleteMany({});
        await Counter.deleteMany({});

        // 2. Create Branches and Users
        console.log('🌱 Seeding Branches and Users...');

        const createdBranches = [];

        // Admin
        const adminHash = await bcrypt.hash('password123', 10);
        await User.create({
            name: 'Super Admin',
            email: 'admin@system.com',
            username: 'admin',
            password: adminHash,
            role: 'SUPER_ADMIN',
            branch: null
        });

        for (const item of seedData) {
            const branch = await Branch.create({
                name: item.branch,
                branchCode: item.branch.toUpperCase(),
                state: item.state
            });
            createdBranches.push(branch);

            const passHash = await bcrypt.hash(item.pass.toString(), 10);
            await User.create({
                name: item.branch,
                email: `${item.branch}@system.com`,
                username: item.branch,
                password: passHash,
                role: 'BRANCH',
                branchId: branch._id,
                branch: branch._id
            });
            console.log(`Created: ${item.branch} / ${item.pass}`);
        }

        // 3. Create Mock Bookings
        console.log('🌱 Creating Mock Bookings...');
        const statuses = ['Booked', 'In Transit', 'Arrived', 'Delivered', 'Cancelled'];

        for (let i = 0; i < 50; i++) {
            const fromBranch = createdBranches[Math.floor(Math.random() * createdBranches.length)];
            let toBranch = createdBranches[Math.floor(Math.random() * createdBranches.length)];
            while (toBranch._id.equals(fromBranch._id)) {
                toBranch = createdBranches[Math.floor(Math.random() * createdBranches.length)];
            }

            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const paymentType = Math.random() > 0.5 ? 'Paid' : 'To Pay';

            // Random date in last 30 days
            const daysAgo = Math.floor(Math.random() * 30);
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);

            const dateStr = createdAt.toISOString().slice(2, 10).replace(/-/g, '');
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const lrNumber = `LR${fromBranch.branchCode}${dateStr}${randomNum}`;

            const freight = Math.floor(Math.random() * 1000) + 100;
            const handling = 10;
            const hamali = Math.floor(Math.random() * 50);
            const total = freight + handling + hamali;

            const booking = await Booking.create({
                lrNumber,
                fromBranch: fromBranch._id,
                toBranch: toBranch._id,
                senderBranchId: fromBranch._id,
                receiverBranchId: toBranch._id,
                sender: {
                    name: senderNames[Math.floor(Math.random() * senderNames.length)],
                    mobile: '9876543210'
                },
                receiver: {
                    name: receiverNames[Math.floor(Math.random() * receiverNames.length)],
                    mobile: '9876543210'
                },
                parcels: [{
                    quantity: Math.floor(Math.random() * 5) + 1,
                    itemType: itemTypes[Math.floor(Math.random() * itemTypes.length)],
                    weight: Math.floor(Math.random() * 50) + 1,
                    rate: freight
                }],
                costs: { freight, handling, hamali, total },
                paymentType,
                status: status === 'Booked' ? 'INCOMING' : (status === 'Delivered' ? 'DELIVERED' : 'PENDING'),
                createdAt,
                updatedAt: createdAt
            });

            // 4. Create Transactions for Ledger
            // If Paid, it's a CREDIT to fromBranch
            if (paymentType === 'Paid') {
                await Transaction.create({
                    branchId: fromBranch._id,
                    type: 'CREDIT',
                    amount: total,
                    description: `Booking payment for ${lrNumber}`,
                    referenceId: lrNumber,
                    createdAt
                });
            }

            // If Delivered and To Pay, it's a CREDIT to toBranch
            if (status === 'Delivered' && paymentType === 'To Pay') {
                await Transaction.create({
                    branchId: toBranch._id,
                    type: 'CREDIT',
                    amount: total,
                    description: `Collection for ${lrNumber}`,
                    referenceId: lrNumber,
                    createdAt: new Date().setDate(createdAt.getDate() + 2) // Delivered later
                });
            }
        }

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

seed();
