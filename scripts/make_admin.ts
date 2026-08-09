import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define the User schema directly to avoid import issues
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    username: { type: String, unique: true },
    password: { type: String },
    role: { type: String, enum: ['SUPER_ADMIN', 'BRANCH'] },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

async function run() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is missing in .env');

        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 20000, // 20 seconds
            connectTimeoutMS: 20000,
        });
        console.log('✅ Connected to MongoDB.');

        const username = 'tmpadmin';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(`Setting up user: ${username}...`);

        const result = await User.findOneAndUpdate(
            { username },
            {
                name: 'Temp Admin',
                email: 'temp@example.com',
                username,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                isActive: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('✅ Result:', {
            id: result._id,
            username: result.username,
            role: result.role
        });

        console.log('\n-----------------------------------');
        console.log('CREDENTIALS CREATED SUCCESSFULLY:');
        console.log(`User: ${username}`);
        console.log(`Pass: ${password}`);
        console.log('-----------------------------------\n');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error occurred:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

run();
