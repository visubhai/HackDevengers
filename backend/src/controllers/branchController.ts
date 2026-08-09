import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Branch from '../models/Branch';
import User from '../models/User';
import Booking from '../models/Booking';
import AuditLog from '../models/AuditLog';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';
import { logAudit } from '../utils/auditLogger';
import { cache } from '../utils/cache';
import { successResponse, createdResponse } from '../utils/responseHandler';
import { clearBookingBranchCache } from './bookingController';

export const getBranches = catchAsync(async (req: AuthRequest, res: Response) => {
    const { scope, fromBranchId } = req.query;
    const user = req.user;

    // Defensive check: if user is missing, we allow public fetching but skip branch-specific logic
    const userIdStr = user?._id?.toString() || 'public';
    const branchIdStr = user?.branchId?.toString() || 'global';

    // Build unique cache key based on user and scope
    const cacheKey = `branches_${branchIdStr}_${scope || 'all'}_${fromBranchId || 'none'}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
        return successResponse(res, cachedData, "Branches fetched from cache");
    }

    const query: any = { isActive: true };

    if (scope === 'reports' && user && user.role === 'BRANCH' && user.branchId) {
        const allowedIds = [user.branchId.toString()];
        if (user.allowedBranches && Array.isArray(user.allowedBranches)) {
            user.allowedBranches.forEach((b: any) => {
                const idStr = b.toString();
                if (idStr && idStr !== 'null' && !allowedIds.includes(idStr)) {
                    allowedIds.push(idStr);
                }
            });
        }

        const objectIds = allowedIds
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        const names = allowedIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (names.length > 0) {
            const foundBranches = await Branch.find({ name: { $in: names } }).select('_id');
            foundBranches.forEach(b => {
                if (!objectIds.find(oid => oid.equals(b._id))) {
                    objectIds.push(b._id);
                }
            });
        }

        query._id = { $in: objectIds };
    }

    if (fromBranchId && mongoose.Types.ObjectId.isValid(fromBranchId as string)) {
        const originBranch = await Branch.findById(fromBranchId);
        if (originBranch && originBranch.allowedDestinations && originBranch.allowedDestinations.length > 0) {
            const allowedDestIds = originBranch.allowedDestinations;
            if (query._id) {
                const existingIds: any[] = Array.isArray(query._id.$in) ? query._id.$in : [];
                query._id = { 
                    $in: existingIds.filter((id: any) => 
                        allowedDestIds.some((aid: any) => aid.toString() === id.toString())
                    ) 
                };
            } else {
                query._id = { $in: allowedDestIds };
            }
        }
    }

    const branches = await Branch.find(query)
        .select("_id name branchCode address phone isActive whatsappNotificationsEnabled allowedDestinations allowedPaymentTypes")
        .sort({ name: 1 })
        .lean();

    let result: any = branches;

    if (scope !== 'reports') {
        try {
            const branchIds = branches.map(b => (b as any)._id);
            const users = await User.find({ branchId: { $in: branchIds } }).select('branchId username role').lean();

            result = branches.map(b => {
                const u = users.find(u => u.branchId?.toString() === (b as any)._id.toString());
                return {
                    ...b,
                    username: u ? u.username : null,
                    isSuperAdmin: u ? u.role === 'SUPER_ADMIN' : false
                };
            });
        } catch (err) {
            result = branches;
        }
    }

    await cache.set(cacheKey, result, 120);
    return successResponse(res, result);
});


export const createBranch = catchAsync(async (req: AuthRequest, res: Response) => {
    const { name, branchCode, state, address, phone, username, password, isActive, isSuperAdmin, allowedDestinations, allowedPaymentTypes } = req.body;
    const adminUser = req.user;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const [newBranch] = await Branch.create([{
            name,
            branchCode,
            state: state || 'Gujarat',
            address,
            phone,
            isActive: isActive !== undefined ? isActive : true,
            isSuperAdmin: isSuperAdmin !== undefined ? isSuperAdmin : false,
            allowedDestinations: allowedDestinations || [],
            allowedPaymentTypes: allowedPaymentTypes || ['Paid', 'To Pay']
        }], { session });

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password || 'password123', salt);

        const [newUser] = await User.create([{
            name: `${name} Admin`,
            username: username || branchCode.toLowerCase(),
            email: `${branchCode.toLowerCase()}@logiopen.com`,
            password: hashedPassword,
            role: isSuperAdmin ? 'SUPER_ADMIN' : 'BRANCH',
            branchId: newBranch._id,
            branch: newBranch._id,
            isActive: true
        }], { session });

        await AuditLog.create([{
            userId: adminUser._id,
            action: 'CREATE_BRANCH_WITH_ADMIN',
            entityType: 'Branch',
            entityId: newBranch._id.toString(),
            briefContext: `Created branch ${branchCode} and admin user`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        const allKeys = await cache.keys();
        const branchKeys = allKeys.filter((k: string) => k.startsWith('branches_'));
        if (branchKeys.length > 0) await cache.del(branchKeys);
        await cache.del('dashboard_branches');
        clearBookingBranchCache();

        return createdResponse(res, newBranch, 'Branch created successfully');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

export const updateBranch = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { username, password, ...body } = req.body;
    const adminUser = req.user;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const oldBranch = await Branch.findById(id).session(session);
        if (!oldBranch) {
            throw new AppError('Branch not found', 404);
        }
        const oldBranchCodeLower = oldBranch.branchCode.toLowerCase();

        const branch = await Branch.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, session }
        );

        if (!branch) {
            throw new AppError('Branch not found', 404);
        }

        const userUpdates: any = {};
        if (body.isActive !== undefined) {
            userUpdates.isActive = body.isActive;
        }

        if (body.isSuperAdmin !== undefined) {
            userUpdates.role = body.isSuperAdmin ? 'SUPER_ADMIN' : 'BRANCH';
        }

        if (username) {
            userUpdates.username = username;
        }

        if (password) {
            const salt = await bcrypt.genSalt(12);
            userUpdates.password = await bcrypt.hash(password, salt);
            userUpdates.passwordChangedAt = new Date();
        }

        if (body.name) {
            userUpdates.name = `${body.name} Admin`;
        }

        if (body.branchCode) {
            userUpdates.email = `${body.branchCode.toLowerCase()}@logiopen.com`;
            if (!username || username === oldBranchCodeLower) {
                userUpdates.username = body.branchCode.toLowerCase();
            }
        }

        if (Object.keys(userUpdates).length > 0) {
            await User.updateMany({ branchId: id }, { $set: userUpdates }, { session });
        }

        await AuditLog.create([{
            userId: adminUser._id,
            action: 'UPDATE_BRANCH',
            entityType: 'Branch',
            entityId: id,
            briefContext: `Updated branch ${branch.branchCode} with isActive=${body.isActive !== undefined ? body.isActive : 'unchanged'}`.trim()
        }], { session });

        await session.commitTransaction();
        session.endSession();

        const allKeys = await cache.keys();
        const branchKeys = allKeys.filter((k: string) => k.startsWith('branches_'));
        if (branchKeys.length > 0) await cache.del(branchKeys);
        await cache.del('dashboard_branches');
        clearBookingBranchCache();

        // Clear cached user documents for users of this branch
        try {
            const branchUsers = await User.find({ branchId: id }).select('_id').lean();
            for (const u of branchUsers) {
                await cache.del(`user:${u._id}`);
            }
        } catch (cacheErr) {
            console.error("Failed to clear user cache on branch update:", cacheErr);
        }

        return successResponse(res, branch, 'Branch updated successfully');
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        if (error instanceof AppError) throw error;
        console.error("Update Branch Error:", error);
        throw new AppError('Failed to update branch: ' + error.message, 500);
    }
});

export const deleteBranch = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminUser = req.user;

    const branch = await Branch.findById(id);
    if (!branch) {
        throw new AppError('Branch not found', 404);
    }

    const hasBookings = await Booking.exists({
        $or: [
            { fromBranch: id },
            { toBranch: id },
            { senderBranchId: id },
            { receiverBranchId: id }
        ]
    });

    if (hasBookings) {
        throw new AppError('Cannot delete branch which has associated bookings. Please deactivate it instead.', 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await User.deleteMany({ branchId: id }, { session });
        await Branch.findByIdAndDelete(id, { session });

        await logAudit({
            userId: adminUser._id,
            action: 'HARD_DELETE_BRANCH',
            entityType: 'Branch',
            entityId: id,
            oldValue: { name: branch.name, branchCode: branch.branchCode },
            req
        });

        await session.commitTransaction();
        session.endSession();

        const allKeys = await cache.keys();
        const branchKeys = allKeys.filter((k: string) => k.startsWith('branches_'));
        if (branchKeys.length > 0) await cache.del(branchKeys);
        await cache.del('dashboard_branches');
        clearBookingBranchCache();

        return successResponse(res, null, `Branch '${branch.name}' and its associated users have been permanently deleted.`);
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError('Failed to delete branch: ' + error.message, 500);
    }
});
