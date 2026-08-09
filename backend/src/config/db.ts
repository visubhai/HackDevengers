import mongoose from 'mongoose';
import User from '../models/User';
import Branch from '../models/Branch';
import bcrypt from 'bcryptjs';

const connectDB = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!MONGODB_URI) {
            throw new Error('Please define the MONGODB_URI or MONGO_URI environment variable inside .env');
        }

        const conn = await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 15, // Keep max connection pool capped
            minPoolSize: 5,  // Maintain 5 warm connections to prevent cold-start latency
            socketTimeoutMS: 60000,
            serverSelectionTimeoutMS: 30000, // Wait longer for connection instead of crashing (5s -> 30s)
            heartbeatFrequencyMS: 10000, 
            connectTimeoutMS: 30000,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Auto-fix legacy roles and sync branch -> branchId
        try {
            await User.updateMany({ role: 'ADMIN' }, { $set: { role: 'BRANCH' } });
            await User.updateMany(
                { branchId: { $exists: false }, branch: { $exists: true } },
                [{ $set: { branchId: "$branch" } }]
            );
        } catch (mErr) {
            // Ignore
        }
        
        // Auto-seed initial super admin if database is empty
        try {
            const userCount = await User.countDocuments();
            if (userCount === 0) {
                console.log('🌱 Empty database detected! Auto-seeding default Super Admin accounts...');
                let mainBranch = await Branch.findOne({ branchCode: 'LGP' });
                if (!mainBranch) {
                    mainBranch = await Branch.create({
                        name: 'Main Branch',
                        branchCode: 'LGP',
                        state: 'Gujarat',
                        isActive: true
                    });
                }

                const passHash1 = await bcrypt.hash('95008', 10);
                await User.create({
                    name: 'LogiOpen Super Admin',
                    email: 'logiopen@logiopen.com',
                    username: 'logiopen',
                    password: passHash1,
                    role: 'SUPER_ADMIN',
                    branch: mainBranch._id,
                    isActive: true
                });

                const passHash2 = await bcrypt.hash('admin123', 10);
                await User.create({
                    name: 'System Administrator',
                    email: 'admin@logiopen.com',
                    username: 'admin',
                    password: passHash2,
                    role: 'SUPER_ADMIN',
                    branch: mainBranch._id,
                    isActive: true
                });

                console.log('✨ Auto-seed complete! Created default accounts:');
                console.log('   Username: logiopen | Password: 95008');
                console.log('   Username: admin    | Password: admin123');
            }
        } catch (seedErr) {
            console.error('❌ Auto-seed error:', seedErr);
        }

        return conn;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

export default connectDB;
