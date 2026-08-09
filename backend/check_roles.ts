import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/parcel_db';

mongoose.connect(uri)
    .then(async () => {
        const db = mongoose.connection.db;
        if (!db) throw new Error("no db");
        const users = await db.collection('users').find({}).toArray();
        console.log("USERS IN DB:");
        users.forEach(u => {
            console.log(`- Username: ${u.username} | Role: ${u.role}`);
        });
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
