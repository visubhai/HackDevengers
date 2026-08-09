import express from 'express';
import { searchCustomers } from '../controllers/customerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware); // Ensure user is authenticated

router.get('/search', searchCustomers);

export default router;
