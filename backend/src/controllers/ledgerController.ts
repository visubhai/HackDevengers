import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Transaction from '../models/Transaction';
import Branch from '../models/Branch';
import mongoose from 'mongoose';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { successResponse, createdResponse } from '../utils/responseHandler';

export const addTransaction = catchAsync(async (req: AuthRequest, res: Response) => {
    const body = req.body;
    const user = req.user;

    // Restriction: Branch users can only add transactions for their own branch
    if (user.role === 'BRANCH' && body.branchId !== user.branchId.toString()) {
        throw new AppError("You can only record transactions for your own branch.", 403);
    }

    const newTransaction = await Transaction.create(body);

    return createdResponse(res, newTransaction, "Transaction added successfully");
});

export const getTransactions = catchAsync(async (req: AuthRequest, res: Response) => {
    const { branchId, date } = req.query;
    const user = req.user;

    // Determine Allowed Branch IDs for filter validation
    let allowedBranchIds: string[] = [];
    if (user.role === 'BRANCH') {
        allowedBranchIds = [user.branchId.toString()];
        if (user.allowedBranches && Array.isArray(user.allowedBranches)) {
            user.allowedBranches.forEach((b: any) => {
                const idStr = b.toString();
                if (idStr && idStr !== 'null' && !allowedBranchIds.includes(idStr)) {
                    allowedBranchIds.push(idStr);
                }
            });
        }
        
        // Handle name-based permissions if any (fallback)
        const names = allowedBranchIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (names.length > 0) {
            const found = await Branch.find({ name: { $in: names } }).select('_id');
            found.forEach(b => {
                const idStr = b._id.toString();
                if (!allowedBranchIds.includes(idStr)) allowedBranchIds.push(idStr);
            });
        }
    }

    let targetBranchId = branchId as string;

    // Enforce Restriction: If user is BRANCH, they can only view branches in their allowed list
    if (user.role === 'BRANCH') {
        if (!targetBranchId || !allowedBranchIds.includes(targetBranchId)) {
            // If they tried to access an unauthorized branch or didn't specify one, default to their primary
            targetBranchId = user.branchId.toString();
        }
    }

    const query: any = {};
    if (targetBranchId) {
        query.branchId = new mongoose.Types.ObjectId(targetBranchId);
    }

    if (date) {
        const startOfDay = new Date(date as string);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date as string);
        endOfDay.setHours(23, 59, 59, 999);

        query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const pageCount = parseInt(req.query.page as string, 10) || 1;
    const limitCount = parseInt(req.query.limit as string, 10) || 50;

    let dbQuery = Transaction.find(query)
        .sort({ createdAt: -1 })
        .select('branchId type amount description referenceId createdAt');

    if (pageCount >= 1 && limitCount > 0) {
        dbQuery = dbQuery.skip((pageCount - 1) * limitCount).limit(limitCount);
    }

    const [transactions, totalCount, statsResult] = await Promise.all([
        dbQuery.lean(),
        Transaction.countDocuments(query),
        Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total_revenue: {
                        $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] }
                    }
                }
            }
        ])
    ]);

    const totalRevenue = statsResult[0]?.total_revenue || 0;

    res.setHeader('Cache-Control', 'private, max-age=15'); // 15s cache

    return successResponse(res, transactions, "Transactions fetched successfully", {
        total: totalCount,
        page: pageCount,
        limit: limitCount,
        stats: {
            total_revenue: totalRevenue,
            count: totalCount
        }
    });
});
