import express from 'express';
import { addTransaction, getTransactions } from '../controllers/ledgerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addTransactionSchema, getTransactionsSchema } from '../validations/ledger';

const router = express.Router();

router.use(authMiddleware);

router.post('/', validate(addTransactionSchema), addTransaction);
router.get('/', validate(getTransactionsSchema), getTransactions);

export default router;
