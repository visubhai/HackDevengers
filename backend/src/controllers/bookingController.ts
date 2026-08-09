import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Booking from '../models/Booking';
import Branch from '../models/Branch';
import Customer from '../models/Customer';
import Counter from '../models/Counter';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';
import { whatsappService } from '../services/whatsapp';
import { exportService } from '../services/exportService';
import ReportPermission from '../models/ReportPermission';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { logAudit } from '../utils/auditLogger';
import { cache } from '../utils/cache';
import SystemSettings from '../models/SystemSettings';
import { successResponse, createdResponse } from '../utils/responseHandler';
import { getISTStartOfDay, getISTEndOfDay, isSameDayIST } from '../utils/dateUtils';
import { encryptForExactMatch } from '../utils/fieldEncryptionSearch';

// In-memory cache for ultra-fast lookups
const localBranchCache = new Map<string, { name: string, branchCode: string, isActive: boolean, whatsappNotificationsEnabled: boolean }>();

export const clearBookingBranchCache = () => {
    localBranchCache.clear();
    console.log("🧹 [CACHE] In-memory localBranchCache cleared.");
};
 
// Pre-warm the cache on startup
(async () => {
    try {
        const branches = await Branch.find({ isActive: true }).lean();
        branches.forEach(b => localBranchCache.set(b._id.toString(), b as any));
        console.log(`✅ [CACHE] Pre-warmed ${localBranchCache.size} branches in memory.`);
    } catch (e) {
        console.error("❌ Failed to pre-warm branch cache:", e);
    }
})();

const getSetting = async (key: string): Promise<any> => {
    const cacheKey = `setting:${key}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;
    const s = await SystemSettings.findOne({ key }).lean();
    const val = s ? (s as any).value : null;
    await cache.set(cacheKey, val, 3600); // 1 hour — settings rarely change
    return val;
};

export const getBookings = catchAsync(async (req: AuthRequest, res: Response) => {
    const { fromBranch, toBranch, status, paymentType, startDate, endDate, lrNumber, limit, page, sortField, sortOrder, export: exportType, reportType = 'BOOKING_REPORT', itemType, minAmount, maxAmount } = req.query;
    const user = req.user;

    const query: any = {};
    const andQueries: any[] = [];


    // Requirement Update: Dynamic branch visibility in Reports
    if (user.role === 'BRANCH') {
        const visibleBranchIds = [user.branchId.toString()];
        if (user.allowedBranches && Array.isArray(user.allowedBranches)) {
            user.allowedBranches.forEach((b: any) => {
                const idStr = b.toString();
                if (idStr && idStr !== 'null' && !visibleBranchIds.includes(idStr)) {
                    visibleBranchIds.push(idStr);
                }
            });
        }

        const objectIds = visibleBranchIds
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        const names = visibleBranchIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (names.length > 0) {
            const foundBranches = await Branch.find({ name: { $in: names } }).select('_id');
            foundBranches.forEach(b => {
                if (!objectIds.find(oid => oid.equals(b._id))) objectIds.push(b._id);
            });
        }

        andQueries.push({
            $or: [
                { senderBranchId: { $in: objectIds } },
                { receiverBranchId: { $in: objectIds } },
                { fromBranch: { $in: objectIds } },
                { toBranch: { $in: objectIds } }
            ]
        });
    }

    if (fromBranch) {
        const items = (fromBranch as string).split(',');
        const ids = items.filter(item => mongoose.Types.ObjectId.isValid(item));
        const names = items.filter(item => !mongoose.Types.ObjectId.isValid(item));

        const branchIds = [...ids];
        if (names.length > 0) {
            const branches = await Branch.find({ name: { $in: names } }).select('_id');
            branchIds.push(...branches.map(b => b._id.toString()));
        }

        if (branchIds.length > 0) {
            const objectIds = branchIds.map(id => new mongoose.Types.ObjectId(id));
            query.fromBranch = objectIds.length > 1 ? { $in: objectIds } : objectIds[0];
        } else {
            query.fromBranch = new mongoose.Types.ObjectId();
        }
    }
    if (toBranch) {
        const items = (toBranch as string).split(',');
        const ids = items.filter(item => mongoose.Types.ObjectId.isValid(item));
        const names = items.filter(item => !mongoose.Types.ObjectId.isValid(item));

        const branchIds = [...ids];
        if (names.length > 0) {
            const branches = await Branch.find({ name: { $in: names } }).select('_id');
            branchIds.push(...branches.map(b => b._id.toString()));
        }

        if (branchIds.length > 0) {
            const objectIds = branchIds.map(id => new mongoose.Types.ObjectId(id));
            query.toBranch = objectIds.length > 1 ? { $in: objectIds } : objectIds[0];
        } else {
            query.toBranch = new mongoose.Types.ObjectId();
        }
    }
    if (status) {
        const statusArray = (status as string).split(',');
        if (statusArray.length > 1) {
            query.status = { $in: statusArray };
        } else {
            query.status = status;
        }
    }
    if (paymentType && paymentType !== 'All') query.paymentType = paymentType;
    if (lrNumber) {
        const term = (lrNumber as string).trim();
        const safeRegex = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // sender/receiver fields are plaintext today, so a case-insensitive regex covers partial
        // name/mobile matches. We also OR-in an exact match against the deterministically-encrypted
        // form of the term, so search keeps working unchanged if field encryption is ever enabled.
        const exactEnc = encryptForExactMatch(term);
        andQueries.push({
            $or: [
                { lrNumber: { $regex: safeRegex, $options: 'i' } },
                { 'sender.name': { $regex: safeRegex, $options: 'i' } },
                { 'receiver.name': { $regex: safeRegex, $options: 'i' } },
                { 'sender.mobile': { $regex: safeRegex, $options: 'i' } },
                { 'receiver.mobile': { $regex: safeRegex, $options: 'i' } },
                { 'sender.name': exactEnc },
                { 'receiver.name': exactEnc },
                { 'sender.mobile': exactEnc },
                { 'receiver.mobile': exactEnc }
            ]
        });
    }

    if (startDate || endDate) {
        // Requirement: Delivery Report (status=DELIVERED) filters by deliveredAt, others by createdAt
        const dateField = status === 'DELIVERED' ? 'deliveredAt' : 'createdAt';
        query[dateField] = {};
        if (startDate) {
            query[dateField].$gte = getISTStartOfDay(startDate as string);
        }
        if (endDate) {
            query[dateField].$lte = getISTEndOfDay(endDate as string);
        }
    }

    if (itemType && itemType !== 'All') {
        query['parcels.itemType'] = itemType;
    }

    if (minAmount || maxAmount) {
        query['costs.total'] = {};
        if (minAmount) query['costs.total'].$gte = parseFloat(minAmount as string);
        if (maxAmount) query['costs.total'].$lte = parseFloat(maxAmount as string);
    }



    if (andQueries.length > 0) {
        query.$and = andQueries;
    }

    const sort: any = {};
    let isNumericalSort = false;
    
    if (sortField === 'lrNumber') {
        isNumericalSort = true;
    } else if (sortField) {
        sort[sortField as string] = sortOrder === 'asc' ? 1 : -1;
    } else {
        // Default sort: deliveredAt for delivery reports, createdAt for others
        const defaultSortField = status === 'DELIVERED' ? 'deliveredAt' : 'createdAt';
        sort[defaultSortField] = -1;
    }

    const pageCount = parseInt(req.query.page as string, 10) || 1;
    const limitCount = parseInt(req.query.limit as string, 10) || 50;

    let dbQuery: any;

    // 2. FETCH DATA: Only select fields needed for the UI table to reduce data size massively
    // We exclude heavy fields like editHistory unless specifically requested
    let bookingFieldsArr = ["lrNumber", "status", "paymentType", "sender", "receiver", "costs", "parcels", "createdAt", "deliveredAt", "fromBranch", "toBranch", "lrPrefix", "lrIndex", "collectedBy", "collectedByMobile", "remarks", "deliveredRemark", "cancellationRemark"];

    // If summary flag is set (for high-volume prints), exclude even more fields
    if (req.query.summary === 'true') {
        bookingFieldsArr = ["lrNumber", "status", "paymentType", "sender.name", "receiver.name", "receiver.mobile", "costs.total", "parcels.itemType", "parcels.quantity", "createdAt", "toBranch"];
    }

    const bookingFields = bookingFieldsArr.join(" ");

    if (isNumericalSort) {
        dbQuery = Booking.find(query)
            .select(bookingFields)
            .sort({ lrPrefix: sortOrder === 'asc' ? 1 : -1, lrIndex: sortOrder === 'asc' ? 1 : -1 });
    } else {
        dbQuery = Booking.find(query)
            .select(bookingFields)
            .sort(sort);
    }

    // Apply pagination if not exporting
    if (!exportType) {
        if (!isNaN(limitCount) && limitCount > 0) {
            dbQuery = dbQuery.limit(limitCount);
        }
        if (!isNaN(pageCount) && pageCount > 1) {
            dbQuery = dbQuery.skip((pageCount - 1) * limitCount);
        }
    } else if (limit) {
        const parsedLimit = parseInt(limit as string, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
            dbQuery = dbQuery.limit(parsedLimit);
        }
    }
    
    const { refresh } = req.query;
    const isRefresh = refresh === 'true' || refresh === '1';

    // Performance: Combining count and stats into a single aggregation to avoid searching the DB twice
    const queryHash = require('crypto').createHash('md5').update(JSON.stringify(query)).digest('hex');
    const statsCacheKey = `stats:${user.branchId}:${queryHash}`;

    const [rawBookings, statsAndCount] = await Promise.all([
        dbQuery.lean(),
        exportType ? Promise.resolve({ total: 0, stats: null }) : (async () => {
            if (!isRefresh) {
                const cached = await cache.get<any>(statsCacheKey);
                if (cached) return cached;
            }

            const aggregationResult = await Booking.aggregate([
                { $match: query },
                {
                    $facet: {
                        count: [{ $count: "total" }],
                        stats: [
                            {
                                $project: {
                                    "costs.total": 1,
                                    "paymentType": 1,
                                    "status": 1,
                                    "parcelQty": { $sum: "$parcels.quantity" }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalRevenue: {
                                        $sum: { $cond: [{ $ne: ["$status", "CANCELLED"] }, "$costs.total", 0] }
                                    },
                                    paidAmount: {
                                        $sum: { $cond: [{ $and: [{ $eq: ["$paymentType", "Paid"] }, { $ne: ["$status", "CANCELLED"] }] }, "$costs.total", 0] }
                                    },
                                    toPayAmount: {
                                        $sum: { $cond: [{ $and: [{ $eq: ["$paymentType", "To Pay"] }, { $ne: ["$status", "CANCELLED"] }] }, "$costs.total", 0] }
                                    },
                                    totalParcels: {
                                        $sum: {
                                            $cond: [{ $ne: ["$status", "CANCELLED"] }, "$parcelQty", 0]
                                        }
                                    },
                                    cancelledCount: {
                                        $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]);

            const final = {
                total: aggregationResult[0]?.count[0]?.total || 0,
                stats: aggregationResult[0]?.stats[0] || {}
            };
            
            if (final.total > 0) await cache.set(statsCacheKey, final, 300); // Increased from 60s to 300s to relieve DB load during peak hours
            return final;
        })()
    ]);

    // ULTRA-FAST IN-MEMORY BRANCH LOOKUP (Replaces slow populate)
    const bookings = rawBookings.map((b: any) => ({
        ...b,
        fromBranch: localBranchCache.get(b.fromBranch?.toString()) || { name: 'Unknown', branchCode: '??' },
        toBranch: localBranchCache.get(b.toBranch?.toString()) || { name: 'Unknown', branchCode: '??' }
    }));

    const totalCount = statsAndCount.total;
    const statsResult = statsAndCount.stats || {};

    const stats = {
        totalRevenue: 0,
        paidAmount: 0,
        toPayAmount: 0,
        totalParcels: 0,
        cancelledCount: 0,
        totalBookings: totalCount,
        ...statsResult
    };
    // Requirement Update: Total bookings count must exclude cancelled bookings
    stats.totalBookings = totalCount - (stats.cancelledCount || 0);

    // Fetch Branding Settings (Cached at top of controller)
    const companyName = await getSetting('COMPANY_NAME');
    const companyTagline = await getSetting('COMPANY_TAGLINE');
    const branding = {
        name: companyName || 'SAVAN TRAVELS',
        tagline: companyTagline || ''
    };

    // Requirement 4: Report Export Support
    const formatReportDate = (d: any) => {
        if (!d) return '';
        const parts = d.toString().split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return d;
    };
    const formattedRange = `${formatReportDate(startDate) || 'Start'} - ${formatReportDate(endDate) || 'End'}`;

    if (exportType === 'pdf') {
        return exportService.generatePDF(res, bookings, {
            branchName: user.branchName || 'All Branches',
            reportType: reportType as string,
            dateRange: formattedRange,
            generatedBy: user.name,
            branding
        });
    }
    if (exportType === 'excel') {
        return exportService.generateExcel(res, bookings, {
            branchName: user.branchName || 'All Branches',
            reportType: reportType as string,
            dateRange: formattedRange,
            generatedBy: user.name,
            branding
        });
    }

    if (exportType === 'csv') {
        return exportService.generateCSV(res, bookings, {
            reportType: reportType as string
        });
    }

    // Performance: Add short-term cache for report data
    // Performance: Add short-term cache for report data
    res.setHeader('Cache-Control', 'private, max-age=60'); // 60 seconds cache for user-specific report data

    return successResponse(res, bookings, "Bookings retrieved successfully", {
        total: totalCount,
        page: pageCount,
        limit: limitCount,
        stats
    });
});

export const createBooking = catchAsync(async (req: AuthRequest, res: Response) => {
    const body = req.body;
    const user = req.user;

    // Requirement 3: Sender Branch Lock
    if (user.role === 'BRANCH' && body.fromBranch !== user.branchId.toString()) {
        throw new AppError("Sender branch must be your logged-in branch.", 403);
    }

    // ULTRA Optimization: Use in-memory branch cache to avoid 2 DB lookups
    let fromBranch = localBranchCache.get(body.fromBranch);
    let toBranch = localBranchCache.get(body.toBranch);
 
    // Fallback if cache missed (rare)
    if (!fromBranch || !toBranch) {
        const [fb, tb] = await Promise.all([
            Branch.findById(body.fromBranch).lean(),
            Branch.findById(body.toBranch).lean()
        ]);
        if (fb) { localBranchCache.set(fb._id.toString(), fb as any); fromBranch = fb as any; }
        if (tb) { localBranchCache.set(tb._id.toString(), tb as any); toBranch = tb as any; }
    }
 
    if (!fromBranch || !fromBranch.isActive) throw new AppError("Invalid or Inactive Source Branch", 400);
    if (!toBranch || !toBranch.isActive) throw new AppError("Invalid or Inactive Destination Branch", 400);

    const allowedTypes = (fromBranch as any).allowedPaymentTypes as string[] | undefined;
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(body.paymentType)) {
        throw new AppError(`This branch is not allowed to create "${body.paymentType}" bookings.`, 403);
    }
    let newBooking: any;
    let lrNumber = "";
    let retries = 3;

    while (retries > 0) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { branchId: body.fromBranch, entity: 'Booking', field: 'lrNumber' },
                { $inc: { count: 1 } },
                { upsert: true, new: true, lean: true }
            );
            if (!counter) throw new AppError("Failed to generate LR number", 500);

            lrNumber = `${fromBranch.branchCode}/${(counter as any).count}`;

            // Populate sort helpers
            const lrParts = lrNumber.split('/');
            const lrPrefix = lrParts[0];
            const lrIndex = parseInt(lrParts[1], 10) || 0;

            // Write Booking to DB
            newBooking = await Booking.create({
                ...body,
                lrNumber,
                lrPrefix,
                lrIndex,
                senderBranchId: body.fromBranch,
                receiverBranchId: body.toBranch,
                status: 'PENDING'
            });
            break; // Success
        } catch (error: any) {
            if (error.code === 11000) { // MongoDB Duplicate Key Error
                retries--;
                if (retries === 0) throw new AppError("System busy, please try again", 409);
                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            } else {
                throw error;
            }
        }
    }
 
 
    // Background Operations: Anything that isn't strictly needed for the NEXT step (Printing)
    // is moved to the background to free up the response immediately.
    (async () => {
        try {
            // 1. Transaction Creation
            if (body.paymentType === 'Paid') {
                await Transaction.create({
                    branchId: body.fromBranch,
                    type: 'CREDIT',
                    amount: body.costs.total,
                    description: `Booking Revenue: ${lrNumber}`,
                    referenceId: newBooking._id.toString()
                });
            }
 
            // 2. Save Contacts (Sender and Receiver) for Auto-fill Memory
            if (body.sender?.name && body.sender?.mobile) {
                await Customer.updateOne(
                    { mobile: body.sender.mobile, name: body.sender.name },
                    { $set: { mobile: body.sender.mobile, name: body.sender.name } },
                    { upsert: true }
                ).catch(() => {}); // Ignore duplicate errors
            }
            if (body.receiver?.name && body.receiver?.mobile) {
                await Customer.updateOne(
                    { mobile: body.receiver.mobile, name: body.receiver.name },
                    { $set: { mobile: body.receiver.mobile, name: body.receiver.name } },
                    { upsert: true }
                ).catch(() => {});
            }

            // 3. Notifications Logic
            const [companyName, whatsappEnabledSetting] = await Promise.all([
                getSetting('COMPANY_NAME'),
                getSetting('WHATSAPP_NOTIFICATIONS')
            ]);
            
            const companyNameLabel = companyName || 'SAVAN TRAVELS';
            const globalEnabled = whatsappEnabledSetting !== null ? whatsappEnabledSetting === true : true;
            const branchEnabled = fromBranch?.whatsappNotificationsEnabled !== false;
            
            if (globalEnabled && branchEnabled && body.receiver?.mobile) {
                const message = `${companyNameLabel}\n\nDear ${body.receiver.name},\nParcel booked.\nLR: ${lrNumber}\nFrom ${fromBranch.name} to ${toBranch.name}\nPay: ${body.paymentType}\nAmount: Rs ${body.costs.total}\n\nThank you.`;
                await whatsappService.sendMessage(body.receiver.mobile, message);
            }
        } catch (bgError) {
            console.error("🔥 Post-Booking background process failed (Non-critical):", bgError);
        }
    })();
 
    return createdResponse(res, newBooking, "Booking created successfully");
});

export const updateStatus = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, deliveredRemark, collectedBy, collectedByMobile, cancellationRemark, discount } = req.body;
    const user = req.user;

    const oldBooking = await Booking.findById(id);
    if (!oldBooking) {
        throw new AppError("Booking not found", 404);
    }

    const updateData: any = { status };



    // Requirement 2: Manual Delivery Logic
    if (status === 'DELIVERED') {
        if (!deliveredRemark) {
            throw new AppError("Remarks are required for delivery collection.", 400);
        }
        updateData.deliveredRemark = deliveredRemark;
        if (collectedBy) updateData.collectedBy = collectedBy;
        if (collectedByMobile) updateData.collectedByMobile = collectedByMobile;
        updateData.deliveredAt = new Date();
        updateData.deliveredBy = user._id;
    }

    if (status === 'CANCELLED') {
        if (!cancellationRemark) {
            throw new AppError("A cancellation remark is required to cancel a parcel.", 400);
        }
        if (user.role !== 'SUPER_ADMIN') {
            const bookedDate = new Date(oldBooking.createdAt);
            const today = new Date();
            if (!isSameDayIST(bookedDate, today)) {
                throw new AppError("Branch admins can only cancel parcels booked today. Contact a Super Admin to cancel older bookings.", 403);
            }
        }
        updateData.cancellationRemark = cancellationRemark;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );

    if (!updatedBooking) {
        throw new AppError("Booking not found", 404);
    }

    await logAudit({
        userId: user._id,
        action: 'STATUS_CHANGE',
        entityType: 'Booking',
        entityId: id,
        oldValue: { status: oldBooking.status },
        newValue: { status, deliveredRemark, collectedBy, collectedByMobile },
        req
    });

    return successResponse(res, updatedBooking, "Status updated successfully");
});

export const updateBooking = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const body = req.body;
    const user = req.user;

    const oldBooking = await Booking.findById(id);
    if (!oldBooking) throw new AppError("Booking not found", 404);

    // Requirement: Allow SUPER_ADMIN to override everything.
    // For others:
    // 1. Restrict vital fields but allow paymentType and costs updates
    // 2. ENFORCE TIME LIMIT: Branches can only edit until 23:59:59 of the day created
    if (user.role !== 'SUPER_ADMIN') {
        const createdDate = new Date(oldBooking.createdAt);
        const today = new Date();
        
        const isSameDay = isSameDayIST(createdDate, today);


        // Fields that are NEVER changeable by branch users via this endpoint
        delete body.lrNumber;
        delete body.fromBranch;
        delete body.toBranch;

        // If NOT the same day, restrict sensitive financial and parcel details
        if (!isSameDay) {
            delete body.parcels;
            delete body.costs;
            delete body.paymentType;
        }
        // Note: On the same day, branches can still correct names, costs, payment types, and parcel details.
    }

    // track history if remarks or deliveredRemark changed
    const editHistory = [...(oldBooking.editHistory || [])];
    if (body.remarks !== undefined && body.remarks !== oldBooking.remarks) {
        editHistory.push({
            oldRemark: oldBooking.remarks,
            newRemark: body.remarks,
            editedBy: user._id,
            editedAt: new Date()
        });
    }

    if (body.deliveredRemark !== undefined && body.deliveredRemark !== oldBooking.deliveredRemark) {
        editHistory.push({
            oldRemark: oldBooking.deliveredRemark,
            newRemark: body.deliveredRemark,
            editedBy: user._id,
            editedAt: new Date()
        });
    }

    // Robustness: If status changes to DELIVERED via Edit Modal, ensure timestamps are set
    if (body.status === 'DELIVERED' && oldBooking.status !== 'DELIVERED') {
        if (!body.deliveredAt) body.deliveredAt = new Date();
        if (!body.deliveredBy) body.deliveredBy = user._id;
    }

    // Sync with Ledger if costs changed and it's a Paid booking
    if (oldBooking.paymentType === 'Paid' && body.costs?.total !== undefined && body.costs.total !== oldBooking.costs.total) {
        await Transaction.findOneAndUpdate(
            { referenceId: oldBooking._id.toString(), type: 'CREDIT' },
            { amount: body.costs.total, description: `Booking Revenue (Updated): ${oldBooking.lrNumber}` }
        );
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        { ...body, editHistory },
        { new: true }
    );


    await logAudit({
        userId: user._id,
        action: 'UPDATE_BOOKING',
        entityType: 'Booking',
        entityId: id,
        oldValue: {
            remarks: oldBooking.remarks,
            deliveredRemark: oldBooking.deliveredRemark,
            collectedBy: oldBooking.collectedBy,
            collectedByMobile: oldBooking.collectedByMobile
        },
        newValue: {
            remarks: body.remarks,
            deliveredRemark: body.deliveredRemark,
            collectedBy: body.collectedBy,
            collectedByMobile: body.collectedByMobile
        },
        req
    });

    return successResponse(res, updatedBooking, "Booking updated successfully");
});

export const getNextLR = catchAsync(async (req: AuthRequest, res: Response) => {
    const { branchId } = req.query;

    if (!branchId) {
        throw new AppError("Branch ID is required", 400);
    }

    const branch = await Branch.findById(branchId).select('branchCode').lean();
    if (!branch) {
        throw new AppError("Branch not found", 404);
    }

    const counter = await Counter.findOne({
        branchId: branch._id,
        entity: 'Booking',
        field: 'lrNumber'
    }).lean();

    const currentCount = counter ? (counter as any).count : 0;
    const nextCount = currentCount + 1;
    const nextLR = `${branch.branchCode}/${nextCount}`;

    return successResponse(res, { nextLR });
});
export const getDashboardData = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const branchId = user.branchId;

    if (!branchId && user.role !== 'SUPER_ADMIN') {
        throw new AppError("Branch context missing for dashboard initialization", 400);
    }

    // Optimization: Heavy aggressive caching for branches loaded on every page
    let branches = await cache.get<any[]>('dashboard_branches');
    if (!branches) {
        branches = await Branch.find({ isActive: true })
            .select('name branchCode isActive whatsappNotificationsEnabled')
            .sort({ name: 1 })
            .lean();
        
        // Populate local cache for fast save-time lookups
        if (branches && Array.isArray(branches)) {
            branches.forEach((b: any) => localBranchCache.set(b._id.toString(), b));
        }
        await cache.set('dashboard_branches', branches, 1800); // 30 min TTL - these rarely change
    }

    // Parallelized DB Fetching for fast Page Load (Dashboard Init)
    const [counter, rawRecent, settings] = await Promise.all([
        // 1. Fetch Next LR metadata
        branchId ? Counter.findOne({
            branchId: branchId,
            entity: 'Booking',
            field: 'lrNumber'
        }).lean() : Promise.resolve(null),

        // 2. Fetch Recent Outgoing Bookings - NO POPULATE (Use in-memory enrichment)
        branchId ? Booking.find({ fromBranch: branchId })
            .select('lrNumber toBranch sender receiver costs status createdAt')
            .sort({ createdAt: -1 })
            .limit(3) // Reduced from 5 to 3 for slightly faster dashboard render
            .lean() : Promise.resolve([]),

        // 3. Fetch System Settings 
        SystemSettings.find({}).lean()
    ]) as [any, any[], any[]];

    // Enrichment: Attach branch names from current branch list to recentBookings
    const recentBookings = (Array.isArray(rawRecent) ? rawRecent : []).map((b: any) => {
        const toBranchObj = Array.isArray(branches) ? branches.find((br: any) => br._id.toString() === b.toBranch?.toString()) : null;
        return {
            ...b,
            toBranch: toBranchObj ? { name: toBranchObj.name, branchCode: toBranchObj.branchCode } : { name: "Unknown", branchCode: "???" }
        };
    });

    let nextLR = "N/A";
    if (branchId && branches && Array.isArray(branches)) {
        const currentBranch = branches.find((b: any) => b._id.toString() === branchId.toString());
        if (currentBranch) {
            const nextCount = (counter?.count || 0) + 1;
            nextLR = `${currentBranch.branchCode}/${nextCount}`;
        }
    }

    return successResponse(res, {
        branches,
        nextLR,
        recentBookings,
        settings,
        serverTime: new Date()
    }, "Dashboard data retrieved successfully");
});
