import { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import { successResponse, sendResponse } from '../utils/responseHandler';

export const getHealthStatus = async (req: Request, res: Response) => {
    // 1. Database Connection Status
    let dbStatus = 'disconnected';
    if (mongoose.connection.readyState === 1) {
        dbStatus = 'connected';
    } else if (mongoose.connection.readyState === 2) {
        dbStatus = 'connecting';
    }

    // 2. Memory Usage (in MB)
    const memoryUsage = process.memoryUsage();
    const memory = {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100} MB`,
    };

    // 3. System Load (Disk/CPU simplified check)
    const system = {
        uptime: `${Math.floor(os.uptime() / 60 / 60)} hours`,
        loadAvg: os.loadavg(), // Array of 1, 5, and 15 minute load averages
        freeMemory: `${Math.round(os.freemem() / 1024 / 1024 * 100) / 100} MB`,
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 * 100) / 100} MB`
    };

    // Overall App Uptime
    const uptime = process.uptime();
    const appUptime = `${Math.floor(uptime / 60 / 60)}h ${Math.floor((uptime / 60) % 60)}m ${Math.floor(uptime % 60)}s`;

    const isHealthy = dbStatus === 'connected';

    const statusData = {
        service: 'Parcel Management API',
        timestamp: new Date().toISOString(),
        status: isHealthy ? 'healthy' : 'degraded',
        appUptime,
        database: {
            status: dbStatus
        },
        memory,
        system
    };

    if (isHealthy) {
        return successResponse(res, statusData, "System is running optimally");
    } else {
        return sendResponse(res, {
            statusCode: 503,
            status: 'error',
            message: "System is experiencing connectivity issues",
            data: statusData
        });
    }
};
