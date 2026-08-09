import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';
import { successResponse } from '../utils/responseHandler';

export const generate2FASecret = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user || user.role !== 'SUPER_ADMIN') {
        throw new AppError('Only Super Admins can configure 2FA', 403);
    }

    const secret = speakeasy.generateSecret({
        name: `ParcelSystem (${user.email || user.username})`
    });

    // Temporarily save to user, but don't enable yet
    await User.findByIdAndUpdate(user._id, {
        twoFactorSecret: secret.base32
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return successResponse(res, {
        secret: secret.base32,
        qrCodeUrl
    }, "2FA secret generated successfully");
});

export const verifyAndEnable2FA = catchAsync(async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    const userId = req.user?._id;

    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) {
        throw new AppError('2FA tracking not initiated', 400);
    }

    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token
    });

    if (verified) {
        user.isTwoFactorEnabled = true;
        await user.save();
        return successResponse(res, null, '2FA successfully enabled');
    } else {
        throw new AppError('Invalid token, 2FA not enabled', 400);
    }
});

export const get2FAStatus = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.user?._id).select('isTwoFactorEnabled');
    return successResponse(res, { isTwoFactorEnabled: user?.isTwoFactorEnabled || false });
});

export const disable2FA = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
        throw new AppError('Only Super Admins can modify 2FA', 403);
    }
    await User.findByIdAndUpdate(req.user._id, {
        isTwoFactorEnabled: false,
        twoFactorSecret: null
    });
    return successResponse(res, null, '2FA disabled successfully');
});
