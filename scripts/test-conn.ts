import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function test() {
    try {
        console.log('🔄 Testing MongoDB connection...');
        await mongoose.connect(MONGODB_URI!, { serverSelectionTimeoutMS: 20000 });
        console.log('✅ Connected.');
        const collections = await mongoose.connection.db?.listCollections().toArray();
        console.log('Collections:', collections?.map(c => c.name));
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed:', error);
        process.exit(1);
    }
}

test();
