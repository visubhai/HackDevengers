import express from 'express';
import { getDashboardMetrics } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(authMiddleware);

// BI Dashboard Endpoint
router.get('/', roleMiddleware(['SUPER_ADMIN', 'ADMIN', 'BRANCH']), getDashboardMetrics);

export default router;
