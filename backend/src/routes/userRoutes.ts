import express from 'express';
import { toggleUserStatusSchema, getUsersSchema, resetPasswordSchema, createUserSchema, updateUserSchema } from '../validations/user';
import { getUsers, toggleUserStatus, resetPassword, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validate';

import { passwordResetRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['SUPER_ADMIN'])); // Only Super Admin can manage users

router.get('/', validate(getUsersSchema), getUsers);
router.post('/', validate(createUserSchema), createUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.patch('/:id/status', validate(toggleUserStatusSchema), toggleUserStatus);
router.post('/:id/reset-password', passwordResetRateLimiter, validate(resetPasswordSchema), resetPassword);
router.delete('/:id', deleteUser);

export default router;
