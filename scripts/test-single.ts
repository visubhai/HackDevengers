import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';

async function test() {
    // Single node test
    const singleNodeUri = "mongodb://paghadarvishvam1212_db_user:CTzem30rECjOcvpj@ac-xynn6i5-shard-00-00.pivdok3.mongodb.net:27017/parcel_system?ssl=true&authSource=admin";
    console.log('Testing single node connection...');
    try {
        await mongoose.connect(singleNodeUri, {
            serverSelectionTimeoutMS: 5000,
            directConnection: true
        });
        console.log('SUCCESS: Connected to single shard');
        process.exit(0);
    } catch (err) {
        console.error('FAILURE:', err);
        process.exit(1);
    }
}

test();
