// Set NODE_ENV immediately before any other imports that might depend on it
// @ts-ignore
process.env.NODE_ENV = 'test';

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.test' });
// Force set JWT_SECRET for tests to avoid loading order issues
process.env.JWT_SECRET = 'test_secret_key_123';

let replset: any;

beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({
        replSet: { name: 'rs0', count: 1 },
        binary: {
            version: '6.0.11',
            downloadDir: path.join(__dirname, '../../.mongodb-binaries'),
        }
    });
    const mongoUri = replset.getUri();
    console.log('Testing connecting to:', mongoUri);
    try {
        // Disconnect first in case any other module (like index.ts) triggered a connection
        await mongoose.disconnect();

        await mongoose.connect(mongoUri, {
            connectTimeoutMS: 10000,
            socketTimeoutMS: 10000
        });
        console.log('Successfully connected to MongoDB Memory Server');
    } catch (err) {
        console.error('CRITICAL: Mongoose connection failed in setup-test.ts');
        console.dir(err, { depth: null });
        throw err;
    }
}, 60000); // 60s timeout for startup

beforeEach(async () => {
    const collections = await mongoose.connection.db?.collections();
    if (collections) {
        for (let collection of collections) {
            await collection.deleteMany({});
        }
    }
});

afterAll(async () => {
    if (replset) {
        await replset.stop();
    }
    await mongoose.connection.close();
}, 30000); // 30s timeout for cleanup
