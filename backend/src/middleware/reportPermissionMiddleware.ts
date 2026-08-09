import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import ReportPermission from '../models/ReportPermission';

export const reportPermissionMiddleware = (reportType: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Super Admin has full access
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Branch role check
        if (!req.user.branchId) {
            return res.status(403).json({ error: 'Branch user must have a branch assigned.' });
        }

        const permission = await ReportPermission.findOne({ branchId: req.user.branchId });

        if (!permission || !permission.allowedReports.includes(reportType)) {
            return res.status(403).json({
                error: `Access denied. Your branch does not have permission for the ${reportType}.`
            });
        }

        next();
    };
};
