import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import Branch from '../models/Branch';
import User from '../models/User';
import Booking from '../models/Booking';
import Transaction from '../models/Transaction';
import Counter from '../models/Counter';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parcel-management';

const branchesData = [
    { name: 'LOGIOPEN', branchCode: 'LGP', state: 'GUJARAT', address: 'Main Terminal, Surat', phone: '9900112233', isSuperAdmin: true },
    { name: 'KATARAGAM', branchCode: 'KTG', state: 'GUJARAT', address: 'Gajera Circle, Surat', phone: '9011223344' },
    { name: 'VARACHHA', branchCode: 'VRC', state: 'GUJARAT', address: 'Mini Bazar, Surat', phone: '9011223355' },
    { name: 'ADAJAN', branchCode: 'ADJ', state: 'GUJARAT', address: 'Honey Park Road, Surat', phone: '9011223366' },
    { name: 'BAPUNAGAR', branchCode: 'BPN', state: 'GUJARAT', address: 'Shyam Shikhar, Ahmedabad', phone: '9011223377' },
    { name: 'SATELLITE', branchCode: 'STT', state: 'GUJARAT', address: 'Shivranjani, Ahmedabad', phone: '9011223388' },
    { name: 'PALDI', branchCode: 'PLD', state: 'GUJARAT', address: 'Paldi Char Rasta, Ahmedabad', phone: '9011223399' },
    { name: 'ALKAPURI', branchCode: 'ALK', state: 'GUJARAT', address: 'RC Dutt Road, Baroda', phone: '9022334455' },
    { name: 'KALUPUR', branchCode: 'KLP', state: 'GUJARAT', address: 'Railway Station Road, Ahmedabad', phone: '9022334466' },
    { name: 'RAIYA ROAD', branchCode: 'RYR', state: 'GUJARAT', address: 'Hanuman Madhi, Rajkot', phone: '9022334477' },
    { name: 'ISCON', branchCode: 'ISC', state: 'GUJARAT', address: 'Iscon Circle, Ahmedabad', phone: '9022334488' },
];

const statuses = ['PENDING', 'BOOKED', 'DELIVERED', 'CANCELLED'];
const paymentTypes = ['Paid', 'To Pay'];
const items = ['Electronics', 'Textiles', 'Machinery', 'Furniture', 'Documents', 'Plastic Goods', 'Auto Parts'];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('🌱 Connected to MongoDB...');

        console.log('🧹 Cleaning existing data...');
        await Booking.deleteMany({});
        await Transaction.deleteMany({});
        await Counter.deleteMany({});
        await User.deleteMany({});
        await Branch.deleteMany({});

        console.log('🏗️ Seeding 11 Branches (1 Super + 10 Regional)...');
        const createdBranches = [];
        for (const b of branchesData) {
            const branch = await Branch.create(b);
            console.log(`✅ Created Branch: ${b.name} [${b.branchCode}]`);
            createdBranches.push(branch);
        }

        const logiopenBranch = createdBranches.find(b => b.branchCode === 'SVN');
        const otherBranches = createdBranches.filter(b => b.branchCode !== 'SVN');

        console.log('👥 Seeding Users and Admins...');
        const password = await bcrypt.hash('password123', 12);
        
        // 1. Create Super Admin (LogiOpen)
        await User.create({
            name: 'LogiOpen Super Admin',
            email: 'admin@logiopen.com',
            username: 'logiopen',
            password: password,
            role: 'SUPER_ADMIN',
            branchId: logiopenBranch?._id,
            isActive: true,
            allowedBranches: createdBranches.map(b => b._id),
            allowedReports: ["DAILY_REPORT", "DELIVERY_REPORT", "LEDGER_REPORT", "SUMMARY_REPORT", "BOOKING_REPORT"]
        });
        console.log(`👑 Created Super Admin: logiopen`);

        // 2. Create Branch Admins
        for (const branch of otherBranches) {
            const username = branch.name.toLowerCase().replace(' ', '');
            await User.create({
                name: `${branch.name} Manager`,
                email: `${username}@branch.com`,
                username: username,
                password: password,
                role: 'BRANCH',
                branchId: branch._id,
                isActive: true,
                allowedBranches: [branch._id],
                allowedReports: ["DAILY_REPORT", "DELIVERY_REPORT", "LEDGER_REPORT", "SUMMARY_REPORT", "BOOKING_REPORT"]
            });
            console.log(`👤 Created Branch Admin: ${username}`);
        }

        console.log('📦 Seeding 1000 Bookings (Spanning 60 days)...');
        for (let i = 0; i < 1000; i++) {
            const fromBranch = createdBranches[Math.floor(Math.random() * createdBranches.length)];
            let toBranch = createdBranches[Math.floor(Math.random() * createdBranches.length)];
            while (toBranch._id.toString() === fromBranch._id.toString()) {
                toBranch = createdBranches[Math.floor(Math.random() * createdBranches.length)];
            }

            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
            
            // Distributed over last 60 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 60));

            const qty = Math.floor(Math.random() * 20) + 1;
            const rate = Math.floor(Math.random() * 300) + 50;
            const freight = qty * rate;
            const handling = 30;
            const hamali = 20;
            const total = freight + handling + hamali;

            const lrNumber = `${fromBranch.branchCode}/${i + 1}`;

            const booking = await Booking.create({
                lrNumber,
                fromBranch: fromBranch._id,
                toBranch: toBranch._id,
                senderBranchId: fromBranch._id,
                receiverBranchId: toBranch._id,
                sender: {
                    name: `Sender ${i + 1}`,
                    mobile: `${Math.floor(6000000000 + Math.random() * 3999999999)}`, 
                },
                receiver: {
                    name: `Receiver ${i + 1}`,
                    mobile: `${Math.floor(6000000000 + Math.random() * 3999999999)}`,
                },
                parcels: [{
                    quantity: qty,
                    itemType: items[Math.floor(Math.random() * items.length)],
                    rate: rate,
                    remarks: 'Bulk handled cargo'
                }],
                costs: {
                    freight,
                    handling,
                    hamali,
                    total
                },
                paymentType,
                status,
                createdAt: date,
                updatedAt: date
            });

            // Create Transaction for Paid bookings
            if (paymentType === 'Paid' && status !== 'CANCELLED') {
                await Transaction.create({
                    branchId: fromBranch._id,
                    type: 'CREDIT',
                    amount: total,
                    description: `LR ${lrNumber} Revenue`,
                    referenceId: booking._id.toString(),
                    createdAt: date
                });
            }

            if ((i + 1) % 100 === 0) console.log(`   🚀 Progression: ${i + 1}/1000 parcels seeded...`);
        }

        console.log('\n✨ Database transformation complete!');
        console.log('   - 11 Branches created');
        console.log('   - 1 Super Admin (logiopen) created');
        console.log('   - 10 Branch Admins created');
        console.log('   - 1000 Parcels generated');
        process.exit(0);

    } catch (error) {
        console.error('❌ Reset and Seeding failed:', error);
        process.exit(1);
    }
}

seed();
