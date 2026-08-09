import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import SystemSettings from '../models/SystemSettings';
import { AppError } from './errorHandler';

export const maintenanceMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const maintenanceSetting = await SystemSettings.findOne({ key: 'MAINTENANCE_MODE' });
        const isMaintenance = maintenanceSetting ? maintenanceSetting.value === true : false;

        if (!isMaintenance) {
            return next();
        }

        // Check if user is Super Admin to allow bypass
        let userRole = req.user?.role;

        // If req.user is not yet populated, try to peek at the token
        if (!userRole) {
            const token = req.headers.authorization?.split(' ')[1];
            if (token && token !== 'null' && token !== 'undefined') {
                try {
                    const jwt = require('jsonwebtoken');
                    const secret = process.env.JEST_WORKER_ID ? 'test_secret_key_123' : (process.env.JWT_SECRET || 'secret');
                    const decoded: any = jwt.verify(token, secret);

                    // Just fetch the role for bypass check
                    const User = require('../models/User').default || require('../models/User');
                    const user = await User.findById(decoded.id).select('role');
                    if (user) userRole = user.role;
                } catch (e) {
                    // Invalid token or other error, ignore and fall through
                }
            }
        }

        if (userRole !== 'SUPER_ADMIN') {
            throw new AppError('System is currently under maintenance for essential upgrades. Please try again later.', 503);
        }

        next();
    } catch (error) {
        // If maintenance check fails, we prefer to allow the request rather than 500ing
        if (error instanceof AppError) return next(error);
        console.error('⚠️ Maintenance Check Failure (Defaulting to ALLOW):', error);
        next();
    }
};
