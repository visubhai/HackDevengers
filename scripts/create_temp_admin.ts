import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../apps/backend/src/models/User';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

async function createTempAdmin() {
    try {
        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const username = 'tmpadmin';
        const password = 'password123';
        const hash = await bcrypt.hash(password, 10);

        await User.findOneAndUpdate(
            { username },
            {
                name: 'Temp Admin',
                email: 'temp@example.com',
                username,
                password: hash,
                role: 'SUPER_ADMIN',
                isActive: true
            },
            { upsert: true, new: true }
        );

        console.log(`✅ Temporary admin created:`);
        console.log(`   User: ${username}`);
        console.log(`   Pass: ${password}`);

        process.exit(0);
    } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createTempAdmin();
