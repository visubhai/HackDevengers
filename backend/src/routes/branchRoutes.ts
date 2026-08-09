import express from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branchController';
import { validate } from '../middleware/validate';
import { getBranchesSchema, createBranchSchema, updateBranchSchema } from '../validations/branch';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();

// GET /api/branches is public (used for login)
router.get('/', validate(getBranchesSchema), getBranches);

// Admin only CRUD — all require SUPER_ADMIN role
router.post('/', authMiddleware, roleMiddleware(['SUPER_ADMIN']), validate(createBranchSchema), createBranch);
router.put('/:id', authMiddleware, roleMiddleware(['SUPER_ADMIN']), validate(updateBranchSchema), updateBranch);
router.delete('/:id', authMiddleware, roleMiddleware(['SUPER_ADMIN']), deleteBranch);

export default router;

