import express from 'express';
import { getBookings, createBooking, updateStatus, updateBooking, getNextLR, getDashboardData } from '../controllers/bookingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createBookingSchema, updateBookingStatusSchema, updateBookingSchema, getBookingsSchema, getDashboardDataSchema, getNextLRSchema } from '../validations/booking';

const router = express.Router();

router.use(authMiddleware);

router.get('/init-dashboard', validate(getDashboardDataSchema), getDashboardData);
router.get('/next-lr', validate(getNextLRSchema), getNextLR);
router.get('/', validate(getBookingsSchema), getBookings);
router.post('/', validate(createBookingSchema), createBooking);
router.put('/:id', validate(updateBookingSchema), updateBooking);
router.patch('/:id/status', validate(updateBookingStatusSchema), updateStatus);

export default router;
