import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/loggerService';
import { sendResponse } from '../utils/responseHandler';

export class AppError extends Error {
    statusCode: number;
    status: 'fail' | 'error';
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';
    const message = err.isOperational ? err.message : 'Something went wrong on our end.';

    // Always log to console in development for easier debugging
    if (process.env.NODE_ENV === 'development') {
        console.error('💥 ERROR:', err);
    }

    // The logger already includes requestId from cls-rtracer
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
        stack: err.stack,
        path: req.originalUrl,
        method: req.method
    });

    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            status,
            message: err.message,
            stack: err.stack,
            error: err
        });
    }

    return sendResponse(res, {
        statusCode,
        status,
        message
    });
};

export const catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};
