import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { AppError } from './errorHandler';

export const roleMiddleware = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): any => {
        if (!req.user) {
            return next(new AppError('Unauthorized', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError(`Access denied. Insufficient permissions. (Your role is ${req.user.role})`, 403));
        }

        next();
    };
};
