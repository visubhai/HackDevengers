import express from 'express';
import { generate2FASecret, verifyAndEnable2FA, get2FAStatus, disable2FA } from '../controllers/twoFactorController';
import { validate } from '../middleware/validate';
import { verify2FASchema } from '../validations/auth';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/status', authMiddleware, get2FAStatus);
router.post('/generate', authMiddleware, generate2FASecret);
router.post('/verify', authMiddleware, validate(verify2FASchema), verifyAndEnable2FA);
router.post('/disable', authMiddleware, disable2FA);

export default router;
