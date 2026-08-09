import winston from 'winston';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import * as rtracer from 'cls-rtracer';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format((info) => {
        const requestId = rtracer.id();
        if (requestId) {
            info.requestId = requestId;
        }
        return info;
    })()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const idStr = requestId ? ` [ID:${requestId}]` : '';
        return `${timestamp}${idStr} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'parcel-management-backend' },
    transports: [
        new winston.transports.Console({
            format: consoleFormat
        }),
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// Stream for morgan if we were using it, but we'll use a custom middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for noisey system endpoints (Health, Auth Session) to save bandwidth and reduce noise
    const skipUrls = ['/api/health', '/api/health/', '/api/auth/session'];
    if (skipUrls.includes(req.originalUrl)) {
        return next();
    }

    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            referer: req.get('referer') || req.get('referrer') || 'direct',
            status: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        };

        if (duration > 500) {
            logger.warn(`🐌 SLOW QUERY: ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, logData);
        } else {
            logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, logData);
        }
    });
    next();
};

export default logger;
