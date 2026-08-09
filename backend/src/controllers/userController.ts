import { Request, Response } from 'express';
import User from '../models/User';
import { catchAsync, AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { logAudit } from '../utils/auditLogger';
import { AuthRequest } from '../middleware/authMiddleware';
import { successResponse, createdResponse } from '../utils/responseHandler';

const formatUser = (user: any) => ({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    branch: user.branch?.name || (user.branch && typeof user.branch === 'string' ? user.branch : 'Global'),
    branchId: user.branchId || user.branch?._id || null,
    branchDetails: user.branch,
    allowedBranches: user.allowedBranches ? (user.allowedBranches as any[]).map(b => (b._id || b.id || b).toString()) : [],
    allowedBranchNames: user.allowedBranches ? (user.allowedBranches as any[]).map(b => b.name || 'Unknown') : [],
    allowedReports: user.allowedReports,
    isActive: user.isActive,
    createdAt: user.createdAt
});

export const getUsers = catchAsync(async (req: Request, res: Response) => {
    const users = await User.find({})
        .select('-password') 
        .populate('branch', 'name code') 
        .populate('allowedBranches', 'name')
        .sort({ createdAt: -1 });

    const formattedUsers = users.map(user => formatUser(user));

    return successResponse(res, formattedUsers, "Users fetched successfully");
});

export const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
    ).select('-password');

    if (!user) {
        throw new AppError('User not found', 404);
    }

    return successResponse(res, formatUser(user), "User status updated successfully");
});

export const resetPassword = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { password } = req.body;
    const adminUser = req.user;

    // Password hashing
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.findByIdAndUpdate(
        id,
        {
            password: hashedPassword,
            passwordChangedAt: new Date()
        },
        { new: true }
    ).select('-password');

    if (!user) {
        throw new AppError('User not found', 404);
    }

    await logAudit({
        userId: adminUser._id,
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: id,
        req
    });

    return successResponse(res, user, 'Password reset successful');
});

export const createUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const { name, email, username, password, role, branchId, allowedBranches, allowedReports, isActive } = req.body;
    const adminUser = req.user;

    // Support both username and email, but one must be unique
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new AppError('User with this email or username already exists', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
        name,
        email,
        username,
        password: hashedPassword,
        role,
        branchId: branchId || undefined,
        branch: branchId || undefined, // Keep synced
        allowedBranches: allowedBranches || [],
        allowedReports: allowedReports || [],
        isActive: isActive !== undefined ? isActive : true
    });

    await logAudit({
        userId: adminUser._id,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: newUser._id.toString(),
        newValue: { name, email, username, role, branchId },
        req
    });

    const userResponse = formatUser(newUser);

    return createdResponse(res, userResponse, 'User created successfully');
});

export const updateUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, email, username, password, role, branchId, allowedBranches, allowedReports, isActive } = req.body;
    const adminUser = req.user;

    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const updates: any = {
        name,
        email,
        role,
        branchId: branchId || undefined,
        branch: branchId || undefined,
        allowedBranches,
        allowedReports,
        isActive
    };

    if (username) {
        updates.username = username.toLowerCase().trim();
    }

    if (password) {
        const salt = await bcrypt.genSalt(12);
        updates.password = await bcrypt.hash(password, salt);
        updates.passwordChangedAt = new Date();
    }

    const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
    ).populate('branch').populate('allowedBranches').select('-password');

    await logAudit({
        userId: adminUser._id,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: id,
        newValue: updates,
        req
    });

    return successResponse(res, formatUser(updatedUser), "User updated successfully");
});

export const deleteUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminUser = req.user;

    if (id === adminUser._id.toString()) {
        throw new AppError('You cannot delete your own account.', 400);
    }

    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    await User.findByIdAndDelete(id);

    await logAudit({
        userId: adminUser._id,
        action: 'HARD_DELETE_USER',
        entityType: 'User',
        entityId: id,
        oldValue: { name: user.name, username: user.username, role: user.role },
        req
    });

    return successResponse(res, null, `User account for '${user.name}' has been permanently deleted.`);
});
