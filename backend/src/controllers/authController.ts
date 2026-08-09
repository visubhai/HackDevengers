import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { successResponse } from '../utils/responseHandler';

export const login = catchAsync(async (req: Request, res: Response) => {
    const { username, password, branchId, otp } = req.body;

    // Support login by Email OR Username
    const user = await User.findOne({
        $or: [
            { email: username },
            { username: username },
        ]
    }).select('+password +twoFactorSecret +role +branch +branchId').populate('branch').populate('branchId');

    if (!user) {
        throw new AppError('Invalid credentials or user not found', 401);
    }

    // Check if user account is active
    if (!user.isActive) {
        throw new AppError('Your account has been deactivated. Please contact the administrator.', 403);
    }

    const activeBranch: any = user.branch || user.branchId;

    // For branch users, check if their branch is active
    if (user.role === 'BRANCH' && activeBranch && !activeBranch.isActive) {
        throw new AppError('Your branch is currently inactive. Please contact the administrator.', 403);
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
        throw new AppError('Invalid credentials or password', 401);
    }

    // Branch Validation
    if (branchId) {
        const userBranchIdStr = activeBranch?._id?.toString() || user.branchId?.toString();
        if (userBranchIdStr && userBranchIdStr !== branchId) {
            throw new AppError(`Access denied. You belong to ${activeBranch?.name || 'another branch'}`, 403);
        }
    }

    // 2FA Verification Bridge
    if (user.isTwoFactorEnabled) {
        if (!otp) {
            // Tell frontend this requires an OTP screen
            return res.status(403).json({
                error: '2FA_REQUIRED',
                message: 'Two-factor authentication code required'
            });
        }

        // Validate OTP if provided
        const speakeasy = require('speakeasy');
        const isOtpValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: otp,
            window: 1 // Allow 30 seconds drift 
        });

        if (!isOtpValid) {
            throw new AppError('Invalid 2FA code', 401);
        }
    }

    // Generate Tokens
    const accessToken = jwt.sign(
        { id: user._id, role: user.role, branchId: activeBranch?._id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' } // Extended session to prevent 'Invalid Token' after 15m
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        { expiresIn: '7d' } // Long-lived Refresh Token
    );

    // Save refresh token to user document
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    // Keep only the last 5 sessions to prevent massive arrays
    if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();

    // Secure HTTP-Only Cookie for Refresh Token (crucial for React apps)
    res.cookie('jwt', refreshToken, {
        httpOnly: true, // Inaccessible to JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return standardized user data and access token
    return successResponse(res, {
        accessToken, // Renamed from token to accessToken
        user: {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            branchId: activeBranch?._id?.toString() || null,
            branchName: activeBranch?.name || 'Global',
        }
    }, "Login successful");
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
    // 1. Get refresh token from cookies
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    // 2. Find user by refresh token (Needs explicitly selecting refreshTokens if it's select: false in Model)
    const user = await User.findOne({ refreshTokens: refreshToken }).select('+refreshTokens +role +branch +branchId').populate('branch').populate('branchId');

    // Detected token reuse!
    if (!user) {
        jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || 'refresh-secret',
            async (err: any, decoded: any) => {
                if (err) return res.sendStatus(403); // Forbidden
                // The token was valid but user wasn't found with it. This means the token was compromised and reused.
                // Action: Invalidate ALL refresh tokens for the compromised user.
                const hackedUser = await User.findById(decoded.id);
                if (hackedUser) {
                    hackedUser.refreshTokens = [];
                    await hackedUser.save();
                }
            }
        )
        return res.sendStatus(403); // Forbidden
    }

    // 3. Evaluate the JWT
    const newRefreshArray = user.refreshTokens.filter((rt: string) => rt !== refreshToken);

    jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        async (err: any, decoded: any) => {
            if (err) {
                // Expired or invalid refresh token found
                user.refreshTokens = [...newRefreshArray];
                await user.save();
                return res.sendStatus(403);
            }
            if (user._id.toString() !== decoded.id) return res.sendStatus(403);

            // Generate new tokens (Rotation)
            const activeBranch: any = user.branch || user.branchId;
            const accessToken = jwt.sign(
                { id: user._id, role: user.role, branchId: activeBranch?._id },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '7d' }
            );

            const newRefreshToken = jwt.sign(
                { id: user._id },
                process.env.JWT_REFRESH_SECRET || 'refresh-secret',
                { expiresIn: '7d' }
            );

            // Save new refresh token
            user.refreshTokens = [...newRefreshArray, newRefreshToken];
            await user.save();

            // Set secure cookie with new refresh token
            res.cookie('jwt', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Return new access token via standardized response
            return successResponse(res, { accessToken }, "Token refreshed successfully");
        }
    );
});

export const logout = catchAsync(async (req: Request, res: Response) => {
    // 1. Get refresh token from cookies
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); // No content
    const refreshToken = cookies.jwt;

    // 2. Clear token from DB
    const user = await User.findOne({ refreshTokens: refreshToken }).select('+refreshTokens');
    if (user) {
        user.refreshTokens = user.refreshTokens.filter((rt: string) => rt !== refreshToken);
        await user.save();
    }

    // 3. Clear cookie
    res.clearCookie('jwt', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    });

    return successResponse(res, null, "Logged out successfully");
});
