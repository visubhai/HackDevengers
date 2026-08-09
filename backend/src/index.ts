import dotenv from 'dotenv';
console.log('🏁 NODE_PROCESS_START');
console.log(`⏰ Time: ${new Date().toISOString()}`);
// Load environment variables immediately before any other imports
// Skip loading .env in test mode (Jest sets JEST_WORKER_ID)
import path from 'path';
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// Environment Validation
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'changeme123') {
    if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ CRITICAL: JWT_SECRET is not set or using default value in PRODUCTION. Security is compromised!');
    } else {
        console.warn('⚠️ Notice: Using default JWT_SECRET ("changeme123") for local development.');
    }
} else {
    console.log(`✅ JWT Configuration loaded (Secret prefix: ${process.env.JWT_SECRET.substring(0, 2)}...)`);
}

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import twoFactorRoutes from './routes/twoFactorRoutes';
import branchRoutes from './routes/branchRoutes';
import bookingRoutes from './routes/bookingRoutes';
import ledgerRoutes from './routes/ledgerRoutes';
import userRoutes from './routes/userRoutes';
import customerRoutes from './routes/customerRoutes';
import superAdminRoutes from './super-admin/super-admin.routes';
import healthRoutes from './routes/healthRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import advancedAnalyticsRoutes from './routes/advancedAnalyticsRoutes';

import { requestLogger } from './services/loggerService';
import { errorHandler } from './middleware/errorHandler';
import helmet from 'helmet';
import * as rtracer from 'cls-rtracer';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';

const app = express();
// Priority: 1. Render/Cloud Port ENV, 2. Default standard cloud port 10000, 3. Local fallback 3001
const PORT = Number(process.env.PORT) || 10000;

console.log('--- SYSTEM STARTUP ---');
console.log(`📡 Port: ${PORT}`);
console.log(`🏷️ Mode: ${process.env.NODE_ENV}`);
console.log(`📦 Dir: ${__dirname}`);

// Trust Proxy (Required for Rate Limiting behind Load Balancers like Koyeb/Heroku)
app.set('trust proxy', 1);

// Middleware
app.use(rtracer.expressMiddleware());
// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"], // Allow Vercel feedback
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"], // Allow all HTTPS connections for API calls
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(mongoSanitize());
app.use(cors({
    origin: (origin, callback) => {
        // Enforce STRICT origin whitelisting based on ENV or strict fallbacks
        const allowedOriginsstr = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,https://savanparcel.vercel.app';
        const allowedOrigins = allowedOriginsstr.split(',').map(o => o.trim().replace(/\/$/, ''));

        // Allow mobile apps (no origin) or server-to-server calls
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/$/, '');

        // Match exact whitelisted origins or safe preview branches
        if (allowedOrigins.includes(normalizedOrigin) || normalizedOrigin.includes('parcel-management-system') || normalizedOrigin.includes('savanparcel')) {
            return callback(null, true);
        }

        console.warn(`🛑 STRICT CORS Blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

import { apiRateLimiter } from './middleware/rateLimiter';
import { maintenanceMiddleware } from './middleware/maintenanceMiddleware';

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Logging Middleware
app.use(requestLogger);

// import whatsappRoutes from './routes/whatsappRoutes';

// Routes
app.get('/', (req, res) => {
    res.send('Parcel Management System API');
});

// Auth and Super Admin bypass Maintenance
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/superadmin', superAdminRoutes);

// Maintenance Check (Allows SUPER_ADMIN to bypass)
app.use('/api', maintenanceMiddleware);

app.use('/api/branches', branchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics/v2', advancedAnalyticsRoutes);
// app.use('/api/whatsapp', whatsappRoutes);



// Error Handling Middleware (Must be last)
app.use(errorHandler);

// Initialize Services & Start Server
// Initialize Services & Start Server
// In Vercel, we export the app for serverless function usage.
// We only start the server explicitly if NOT in Vercel.
// Initialize Services & Start Server
// Docker/VPS: VERCEL is undefined -> Full Mode (WhatsApp + Cron)
// Vercel: VERCEL is defined -> Serverless Mode (No background services)
// Initialize Services & Start Server
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
    // START SERVER IMMEDIATELY (Crucial for Render Health Checks)
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('--- SERVER LIVE ---');
        console.log(`🚀 API running on 0.0.0.0:${PORT}`);
        console.log(`🔗 Health Check: http://0.0.0.0:${PORT}/api/health`);
    });

    // Initialize Database & Services in the background
    (async () => {
        try {
            console.log('⏳ Connecting to Database...');
            await connectDB();
            console.log('✅ Database connected');

            // Initialize Background Schedulers
            const { initCronJobs } = await import('./services/cronService');
            initCronJobs();
            console.log('📅 Schedulers active');
        } catch (err) {
            console.error('❌ Initialization failed:', err);
            // We don't exit immediately so the health check can report the error
        }
    })();
} else if (process.env.NODE_ENV !== 'test') {
    // Serverless Mode
    connectDB().catch(err => console.error('❌ DB Connection Error:', err));
}

export default app;
