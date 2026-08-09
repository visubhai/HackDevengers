import mongoose from 'mongoose';
import Branch from '../models/Branch';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://vishvam:vishvam@cluster0.4vrqe.mongodb.net/parcel-management?retryWrites=true&w=majority";

async function listBranches() {
    try {
        if (!mongoose.connection.readyState) {
            await mongoose.connect(MONGO_URI);
            console.log('Connected to MongoDB');
        }

        const branches = await Branch.find({}, 'name branchCode');
        console.log('Branches found:');
        branches.forEach(b => {
            console.log(`Name: "${b.name}", Code: "${b.branchCode}", ID: ${b._id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listBranches();
