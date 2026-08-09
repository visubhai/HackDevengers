import express from 'express';
import { login, refresh, logout } from '../controllers/authController';
import { generate2FASecret, verifyAndEnable2FA, get2FAStatus, disable2FA } from '../controllers/twoFactorController';
import { validate } from '../middleware/validate';
import { loginSchema, refreshSchema, verify2FASchema } from '../validations/auth';

import { authRateLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', authRateLimiter, validate(loginSchema), login);
router.get('/refresh', validate(refreshSchema), refresh); // Switched to GET usually for tokens or keep POST
router.post('/logout', logout);

// Protected 2FA setups
router.get('/2fa/status', authMiddleware, get2FAStatus);
router.post('/2fa/generate', authMiddleware, generate2FASecret);
router.post('/2fa/verify', authMiddleware, validate(verify2FASchema), verifyAndEnable2FA);
router.post('/2fa/disable', authMiddleware, disable2FA);

export default router;
