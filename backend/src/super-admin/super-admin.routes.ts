import express from 'express';
import {
    getCounters,
    updateCounter,
    getBranchPermissions,
    updateBranchPermissions,
    createBranchPermissions,
    getAuditLogs,
    hardDeleteBooking,
    downloadDatabaseBackup,
    cleanupDatabase,
    getDashboardStats,
    getSystemSettings,
    updateSystemSetting
} from './super-admin.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validate';
import {
    createBranchPermissionsSchema,
    updateBranchPermissionsSchema,
    getBranchPermissionsSchema,
    getAuditLogsSchema
} from './super-admin.validation';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Require SUPER_ADMIN for most routes
router.use(authMiddleware);

// EXCEPTION: Allow any authenticated user to check specific branch ReportPermissions
router.get('/permissions/:branchId', validate(getBranchPermissionsSchema), getBranchPermissions);

router.get('/settings', getSystemSettings);

// Enforce SUPER_ADMIN for the rest
router.use(roleMiddleware(['SUPER_ADMIN']));
router.use(apiRateLimiter);

router.get('/dashboard-data', getDashboardStats);

router.get('/counters', getCounters);
router.put('/counters/:id', updateCounter);
router.post('/permissions', validate(createBranchPermissionsSchema), createBranchPermissions);
router.put('/permissions/:branchId', validate(updateBranchPermissionsSchema), updateBranchPermissions);
router.get('/audit-logs', validate(getAuditLogsSchema), getAuditLogs);
router.delete('/bookings/:id', hardDeleteBooking);

// Advanced Database Management
router.get('/database/backup', downloadDatabaseBackup);
router.post('/database/cleanup', cleanupDatabase);

// System Settings Update (Protected by SUPER_ADMIN)
router.put('/settings', updateSystemSetting);

export default router;
