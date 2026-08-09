import { Response } from 'express';
import ExcelJS from 'exceljs';
import { AuthRequest } from '../middleware/authMiddleware';
import ReportPermission from '../models/ReportPermission';
import Booking from '../models/Booking'; // For hardDeleteBooking
import Transaction from '../models/Transaction'; // For hardDeleteBooking
import AuditLog from '../models/AuditLog';
import Counter from '../models/Counter';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { logAudit } from '../utils/auditLogger';
import Branch from '../models/Branch';
import User from '../models/User';
import SystemSettings from '../models/SystemSettings';
import { successResponse, createdResponse } from '../utils/responseHandler';
import { cache } from '../utils/cache';

export const getDashboardStats = catchAsync(async (req: AuthRequest, res: Response) => {
    const cacheKey = 'global_dashboard_stats';
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
        res.setHeader('Cache-Control', 'private, max-age=60');
        return successResponse(res, cachedData, "Stats fetched from cache");
    }

    // Highly optimized aggregation pipeline
    const [bookingStats, branchCount, userCount, latestBookings] = await Promise.all([
        // 1. Branch Stats - Lean group and project
        Booking.aggregate([
            { $match: { status: { $ne: 'CANCELLED' } } },
            {
                $group: {
                    _id: "$fromBranch",
                    bookingsCount: { $sum: 1 },
                    revenue: { $sum: { $ifNull: ["$costs.total", 0] } }
                }
            },
            {
                $lookup: {
                    from: "branches",
                    localField: "_id",
                    foreignField: "_id",
                    as: "branchData"
                }
            },
            { $unwind: { path: "$branchData", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    name: { $ifNull: ["$branchData.name", "Unknown"] },
                    branchCode: { $ifNull: ["$branchData.branchCode", "??"] },
                    bookings: "$bookingsCount",
                    revenue: "$revenue"
                }
            },
            { $sort: { bookings: -1 } }
        ]),
        Branch.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: true }),
        // 2. Latest LRs - FETCH ONLY WHAT FRONTEND SHOWS (Name & LR)
        Booking.aggregate([
            { $match: { status: { $ne: 'CANCELLED' } } },
            { $sort: { createdAt: -1 } },
            { $limit: 100 }, // Reduced from 2000 to 100 for massive performance boost
            {
                $lookup: {
                    from: "branches",
                    localField: "fromBranch",
                    foreignField: "_id",
                    as: "branchData"
                }
            },
            { $unwind: { path: "$branchData", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    name: { $ifNull: ["$branchData.name", "Unknown"] },
                    lrNumber: 1
                }
            }
        ])
    ]);

    let totalBookings = 0;
    let totalRevenue = 0;

    bookingStats.forEach(stat => {
        totalBookings += stat.bookings;
        totalRevenue += stat.revenue || 0;
    });

    const latestLRs: Record<string, string> = {};
    latestBookings.forEach((b: any) => {
        if (b.name && !latestLRs[b.name]) {
            latestLRs[b.name] = b.lrNumber;
        }
    });

    const finalResponse = {
        stats: {
            totalBookings,
            totalRevenue,
            activeBranches: branchCount,
            totalUsers: userCount
        },
        branchData: bookingStats,
        latestLRs
    };

    // Cache the result server-side for 30 seconds to prevent aggregation flood
    await cache.set(cacheKey, finalResponse, 30);

    // Also tell browser to cache for 1 minute
    res.setHeader('Cache-Control', 'private, max-age=60');

    return successResponse(res, finalResponse);
});

export const getCounters = catchAsync(async (req: AuthRequest, res: Response) => {
    // Guarantee every active branch has an initialized counter at 0, no first booking required.
    // REMOVED redundant bulkWrite — initialization should be handled at branch creation or lazily during booking.
    // Fetch counters with branch details
    const counters = await Counter.find().populate('branchId', 'name branchCode');
    return successResponse(res, counters);
});

export const updateCounter = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { count } = req.body;
    const user = req.user;

    const updated = await Counter.findByIdAndUpdate(
        id,
        { count },
        { new: true }
    ).populate('branchId', 'name branchCode');

    if (!updated) {
        throw new AppError('Counter not found', 404);
    }

    await logAudit({
        userId: user._id,
        action: 'UPDATE_COUNTER',
        entityType: 'Counter',
        entityId: id,
        newValue: { count },
        req
    });

    return successResponse(res, updated, 'Counter updated successfully');
});

export const getBranchPermissions = catchAsync(async (req: AuthRequest, res: Response) => {
    const { branchId } = req.params;
    const permissions = await ReportPermission.findOne({ branchId });

    if (!permissions) {
        return successResponse(res, { branchId, allowedReports: [], allowedFromBranches: [], allowedToBranches: [] });
    }

    return successResponse(res, permissions);
});

export const updateBranchPermissions = catchAsync(async (req: AuthRequest, res: Response) => {
    const { branchId } = req.params;
    const { allowedReports, allowedFromBranches, allowedToBranches } = req.body;
    const user = req.user;

    const updated = await ReportPermission.findOneAndUpdate(
        { branchId },
        {
            allowedReports,
            allowedFromBranches,
            allowedToBranches,
            createdBy: user._id,
            updatedAt: new Date()
        },
        { upsert: true, new: true }
    );

    return successResponse(res, updated, 'Permissions updated successfully');
});

export const deleteBranchPermissions = catchAsync(async (req: AuthRequest, res: Response) => {
    const { branchId } = req.params;
    const user = req.user;

    const deleted = await ReportPermission.findOneAndDelete({ branchId });

    if (!deleted) {
        throw new AppError('Report permissions not found for this branch', 404);
    }

    await logAudit({
        userId: user._id,
        action: 'DELETE_REPORT_PERMISSION',
        entityType: 'ReportPermission',
        entityId: deleted._id,
        oldValue: deleted,
        newValue: null,
        req
    });

    return successResponse(res, null, 'Report permission deleted successfully');
});


export const createBranchPermissions = catchAsync(async (req: AuthRequest, res: Response) => {
    const { branchId, allowedReports } = req.body;
    const user = req.user;

    try {
        const newPermission = await ReportPermission.create({
            branchId,
            allowedReports,
            createdBy: user._id
        });

        return createdResponse(res, newPermission, 'Permissions created successfully');
    } catch (error: any) {
        if (error.code === 11000) {
            throw new AppError('Permissions already exist for this branch. Use PUT to update.', 400);
        }
        throw error;
    }
});

export const getAuditLogs = catchAsync(async (req: AuthRequest, res: Response) => {
    const { limit = 50, page = 1, entityType, action, search } = req.query;

    const query: any = {};
    if (entityType) query.entityType = entityType;
    if (action) query.action = action;
    if (search) {
        query.$or = [
            { briefContext: { $regex: search, $options: 'i' } },
            { entityId: { $regex: search, $options: 'i' } },
            { action: { $regex: search, $options: 'i' } }
        ];
    }

    const logs = await AuditLog.find(query)
        .populate('userId', 'name username role')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await AuditLog.countDocuments(query);

    // Performance: Short term cache for audit logs
    res.setHeader('Cache-Control', 'private, max-age=60');

    return successResponse(res, logs, 'Audit logs fetched successfully', {
        total,
        page: Number(page),
        limit: Number(limit)
    });
});

export const hardDeleteBooking = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user;

    const booking = await Booking.findById(id);
    if (!booking) {
        throw new AppError("Booking not found", 404);
    }

    // Hard delete
    await Booking.findByIdAndDelete(id);

    // Also delete associated transaction if it exists
    await Transaction.deleteMany({ referenceId: id });

    await logAudit({
        userId: user._id,
        action: 'DELETE_BOOKING',
        entityType: 'Booking',
        entityId: id,
        oldValue: booking,
        newValue: null,
        req
    });

    return successResponse(res, null, "Booking permanently deleted");
});

export const downloadDatabaseBackup = catchAsync(async (req: AuthRequest, res: Response) => {
    const { beforeDate, afterDate, status, branchId } = req.query;

    const targetDateBefore = beforeDate ? new Date(beforeDate as string) : new Date();

    // Construct base query
    const dateQuery: any = { $lt: targetDateBefore };
    if (afterDate) {
        dateQuery.$gte = new Date(afterDate as string);
    }

    const baseQuery: any = { createdAt: dateQuery };

    // Construct booking specific query
    const bookingQuery: any = { createdAt: dateQuery };
    if (status) bookingQuery.status = status;
    if (branchId) {
        bookingQuery.$or = [
            { fromBranch: branchId },
            { toBranch: branchId }
        ];
    }

    const bookings = await Booking.find(bookingQuery)
        .populate('fromBranch', 'name')
        .populate('toBranch', 'name')
        .populate('deliveredBy', 'name username')
        .populate('editHistory.editedBy', 'name username')
        .lean();
    const transactions = await Transaction.find(baseQuery).lean();
    const auditLogs = await AuditLog.find(baseQuery)
        .populate('userId', 'name username')
        .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Savan Travels System';

    // Sheet 1: Meta
    const metaSheet = workbook.addWorksheet('Meta Info');
    metaSheet.columns = [
        { header: 'Property', key: 'property', width: 25 },
        { header: 'Value', key: 'value', width: 35 }
    ];
    metaSheet.addRows([
        { property: 'Extracted At', value: new Date().toISOString() },
        { property: 'Before Date', value: targetDateBefore.toISOString() },
        { property: 'Total Bookings', value: bookings.length },
        { property: 'Total Transactions', value: transactions.length },
        { property: 'Total Audit Logs', value: auditLogs.length }
    ]);
    metaSheet.getRow(1).font = { bold: true };

    // Sheet 2: Bookings
    const bookingSheet = workbook.addWorksheet('Bookings');
    if (bookings.length > 0) {
        bookingSheet.columns = [
            { header: 'ID', key: '_id', width: 25 },
            { header: 'LR Number', key: 'lrNumber', width: 15 },
            { header: 'Created At', key: 'createdAt', width: 25 },
            { header: 'Updated At', key: 'updatedAt', width: 25 },
            { header: 'From Branch Name', key: 'fromBranch', width: 25 },
            { header: 'To Branch Name', key: 'toBranch', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment Type', key: 'paymentType', width: 15 },
            { header: 'Sender Name', key: 'senderName', width: 20 },
            { header: 'Sender Mobile', key: 'senderMobile', width: 15 },
            { header: 'Receiver Name', key: 'receiverName', width: 20 },
            { header: 'Receiver Mobile', key: 'receiverMobile', width: 15 },
            { header: 'Parcels (JSON)', key: 'parcels', width: 40 },
            { header: 'Freight Cost', key: 'freight', width: 15 },
            { header: 'Handling Cost', key: 'handling', width: 15 },
            { header: 'Hamali Cost', key: 'hamali', width: 15 },
            { header: 'Total Cost', key: 'totalCost', width: 15 },
            { header: 'Remarks', key: 'remarks', width: 30 },
            { header: 'Delivered Remark', key: 'deliveredRemark', width: 30 },
            { header: 'Cancellation Remark', key: 'cancellationRemark', width: 30 },
            { header: 'Collected By', key: 'collectedBy', width: 20 },
            { header: 'Collected By Mobile', key: 'collectedByMobile', width: 15 },
            { header: 'Delivered At', key: 'deliveredAt', width: 25 },
            { header: 'Delivered By', key: 'deliveredBy', width: 25 },
            { header: 'Edit History (JSON)', key: 'editHistory', width: 40 },
        ];

        const bookingRows = bookings.map(b => ({
            _id: b._id?.toString(),
            lrNumber: b.lrNumber,
            createdAt: b.createdAt?.toISOString(),
            updatedAt: b.updatedAt?.toISOString(),
            fromBranch: (b.fromBranch as any)?.name || b.fromBranch?.toString(),
            toBranch: (b.toBranch as any)?.name || b.toBranch?.toString(),
            status: b.status,
            paymentType: b.paymentType,
            senderName: b.sender?.name,
            senderMobile: b.sender?.mobile,
            receiverName: b.receiver?.name,
            receiverMobile: b.receiver?.mobile,
            parcels: JSON.stringify(b.parcels || []),
            freight: b.costs?.freight,
            handling: b.costs?.handling,
            hamali: b.costs?.hamali,
            totalCost: b.costs?.total,
            remarks: b.remarks,
            deliveredRemark: b.deliveredRemark,
            cancellationRemark: b.cancellationRemark,
            collectedBy: b.collectedBy,
            collectedByMobile: b.collectedByMobile,
            deliveredAt: b.deliveredAt?.toISOString(),
            deliveredBy: (b.deliveredBy as any)?.name || (b.deliveredBy as any)?.username || '',
            editHistory: JSON.stringify(b.editHistory?.map((h: any) => ({
                oldRemark: h.oldRemark,
                newRemark: h.newRemark,
                editedAt: h.editedAt,
                editedBy: h.editedBy?.name || h.editedBy?.username || h.editedBy?.toString()
            })) || [])
        }));
        bookingSheet.addRows(bookingRows);
        bookingSheet.getRow(1).font = { bold: true };
    }

    // Sheet 3: Transactions
    const transactionSheet = workbook.addWorksheet('Transactions');
    if (transactions.length > 0) {
        transactionSheet.columns = [
            { header: 'ID', key: '_id', width: 25 },
            { header: 'Date', key: 'createdAt', width: 25 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Reference ID', key: 'referenceId', width: 25 },
        ];

        const txnRows = transactions.map(t => ({
            _id: t._id?.toString(),
            createdAt: t.createdAt?.toISOString(),
            type: t.type,
            amount: t.amount,
            description: t.description,
            referenceId: t.referenceId
        }));
        transactionSheet.addRows(txnRows);
        transactionSheet.getRow(1).font = { bold: true };
    }

    // Sheet 4: Audit Logs
    const logSheet = workbook.addWorksheet('Audit Logs');
    if (auditLogs.length > 0) {
        logSheet.columns = [
            { header: 'ID', key: '_id', width: 25 },
            { header: 'Date', key: 'createdAt', width: 25 },
            { header: 'User', key: 'user', width: 25 },
            { header: 'Action', key: 'action', width: 20 },
            { header: 'Entity Type', key: 'entityType', width: 20 },
            { header: 'Entity ID', key: 'entityId', width: 25 },
            { header: 'Context', key: 'briefContext', width: 40 },
        ];

        const logRows = auditLogs.map(l => ({
            _id: l._id?.toString(),
            createdAt: l.createdAt?.toISOString(),
            user: (l.userId as any)?.name || (l.userId as any)?.username || l.userId?.toString(),
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            briefContext: l.briefContext
        }));
        logSheet.addRows(logRows);
        logSheet.getRow(1).font = { bold: true };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="savan-backup-${targetDateBefore.toISOString().split('T')[0]}.xlsx"`);

    await workbook.xlsx.write(res);
    return res.end();
});

export const cleanupDatabase = catchAsync(async (req: AuthRequest, res: Response) => {
    const { beforeDate, afterDate, status, branchId, confirmation } = req.body;
    const user = req.user;

    if (!beforeDate) {
        throw new AppError('beforeDate is required for cleanup', 400);
    }

    if (confirmation !== 'CONFIRM_DELETE') {
        throw new AppError('Invalid confirmation phrase. Must be CONFIRM_DELETE', 400);
    }

    const targetDateBefore = new Date(beforeDate);

    // Construct base query
    const dateQuery: any = { $lt: targetDateBefore };
    if (afterDate) {
        dateQuery.$gte = new Date(afterDate as string);
    }
    const baseQuery: any = { createdAt: dateQuery };

    // Construct booking specific query
    const bookingQuery: any = { createdAt: dateQuery };
    if (status) bookingQuery.status = status;
    if (branchId) {
        bookingQuery.$or = [
            { fromBranch: branchId },
            { toBranch: branchId }
        ];
    }

    // Delete AuditLogs
    const deletedLogs = await AuditLog.deleteMany(baseQuery);

    // Delete Transactions
    const deletedTransactions = await Transaction.deleteMany(baseQuery);

    // Delete Bookings
    const deletedBookings = await Booking.deleteMany(bookingQuery);

    await logAudit({
        userId: user._id,
        action: 'DATABASE_CLEANUP',
        entityType: 'System',
        entityId: 'ALL',
        briefContext: `Deleted ${deletedBookings.deletedCount} bookings, ${deletedTransactions.deletedCount} txns, ${deletedLogs.deletedCount} logs older than ${targetDateBefore.toISOString().split('T')[0]}`,
        req
    });

    return successResponse(res, {
        bookings: deletedBookings.deletedCount,
        transactions: deletedTransactions.deletedCount,
        auditLogs: deletedLogs.deletedCount
    }, 'System data successfully cleaned up');
});

export const getSystemSettings = catchAsync(async (req: AuthRequest, res: Response) => {
    const defaults = [
        { key: 'WHATSAPP_NOTIFICATIONS', value: true, description: 'Auto-send WhatsApp message to receiver after saving booking' },
        { key: 'PRINT_HEADER', value: false, description: 'Print company branding on receipts' },
        { key: 'HEADER_MARGIN', value: '1.5cm', description: 'Top margin for pre-printed pads' },
        { key: 'COMPANY_NAME', value: 'SAVAN TRAVELS', description: 'Main business name on reports/bills' },
        { key: 'COMPANY_TAGLINE', value: 'Express Parcel Service', description: 'Tagline shown under name' },
        { key: 'COMPANY_ADDRESS', value: 'Main Market, Opp. Central Bank, Surat', description: 'Full office address for stationery' },
        { key: 'COMPANY_CONTACT', value: '+91 9988776655, +91 8877665544', description: 'Support phone numbers' },
        { key: 'PARCEL_ITEM_TYPES', value: 'BLACK PARCEL, WHITE PARCEL, RED PARCEL, GREEN PARCEL, KHAKHI PARCEL, COLORING PARCEL, YELLOW PARCEL, KHAKHI BOX, WHITE BOX, BLACK BOX, WHITE KANTAN BOX, GREEN KANTAN BOX, COLORING BOX, WHITE KANTAN, BLACK KANTAN, KHAKHI KANTAN, YELLOW KANTAN, RED KANTAN, GREEN KANTAN, COLORING KANTAN, KHAKHI COVER, WHITE COVER, GREEN COVER, COLORING COVER, THELI, COLORING THELI, WHITE THELI, ROLL, DABBA, PETI, ACTIVA, BIKE, PAIPE, OTHER', description: 'Comma-separated list of parcel item descriptions (Dropdown Options)' }
    ];

    const settings = await SystemSettings.find();

    // Ensure all defaults exist
    const existingKeys = settings.map(s => s.key);
    const missingDefaults = defaults.filter(d => !existingKeys.includes(d.key));

    if (missingDefaults.length > 0) {
        const createdOnes = await Promise.all(missingDefaults.map(d =>
            SystemSettings.create({ ...d, updatedBy: req.user._id })
        ));
        return successResponse(res, [...settings, ...createdOnes]);
    }

    return successResponse(res, settings);
});

export const updateSystemSetting = catchAsync(async (req: AuthRequest, res: Response) => {
    const { key, value } = req.body;
    const user = req.user;

    const setting = await SystemSettings.findOneAndUpdate(
        { key },
        { value, updatedBy: user._id },
        { new: true, upsert: true }
    );

    await logAudit({
        userId: user._id,
        action: 'UPDATE_SYSTEM_SETTING',
        entityType: 'SystemSettings',
        entityId: setting._id,
        newValue: { key, value },
        req
    });

    return successResponse(res, setting, `System setting ${key} updated`);
});
