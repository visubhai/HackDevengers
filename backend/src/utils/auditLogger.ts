import AuditLog from '../models/AuditLog';
import { Request } from 'express';

interface AuditParams {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    req?: Request;
    briefContext?: string;
}

export const logAudit = async ({
    userId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    req,
    briefContext: providedContext
}: AuditParams) => {
    try {
        let briefContext = providedContext || '';
        if (!briefContext) {
            if (action === 'DELETE_BOOKING' && oldValue) {
                briefContext = `Deleted booking trackingId: ${oldValue.trackingId || oldValue._id}`;
            } else if (newValue && newValue.count !== undefined) {
                briefContext = `Count updated to ${newValue.count}`;
            } else if (action === 'UPDATE' && newValue) {
                briefContext = `Updated fields manually`;
            }
        }

        await AuditLog.create({
            userId,
            action,
            entityType,
            entityId,
            briefContext: briefContext.substring(0, 190),
            oldValue,
            newValue,
            ipAddress: req?.ip,
            userAgent: req?.headers['user-agent']
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // We don't throw here to avoid failing the main request if logging fails
    }
};
