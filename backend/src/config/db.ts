import mongoose from 'mongoose';

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
        return conn;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

export default connectDB;
