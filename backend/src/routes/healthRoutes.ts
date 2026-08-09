import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

// Endpoint: GET /api/health
router.get('/', catchAsync(getHealthStatus));

export default router;
