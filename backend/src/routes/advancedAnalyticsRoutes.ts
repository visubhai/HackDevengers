import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validate';
import { analyticsQuerySchema } from '../validations/analytics';
import {
    getOverviewMetrics,
    getBranchPerformance,
    getRouteAnalytics,
    getDeliveryPerformance,
    getFinancialInsights,
    getCancellationAnalysis,
    getCustomerInsights,
    getComparisonGrowth,
    searchParties,
    getPartyHistory,
} from '../controllers/advancedAnalyticsController';

const router = express.Router();
router.use(authMiddleware);

router.get('/overview', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getOverviewMetrics);
router.get('/branches', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getBranchPerformance);
router.get('/routes', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getRouteAnalytics);
router.get('/delivery', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getDeliveryPerformance);
router.get('/financial', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getFinancialInsights);
router.get('/cancellations', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getCancellationAnalysis);
router.get('/customers', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getCustomerInsights);
router.get('/comparison', roleMiddleware(['SUPER_ADMIN']), validate(analyticsQuerySchema), getComparisonGrowth);
router.get('/parties/search', roleMiddleware(['SUPER_ADMIN']), searchParties);
router.get('/parties/history', roleMiddleware(['SUPER_ADMIN']), getPartyHistory);

export default router;
