import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Booking from '../models/Booking';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { successResponse } from '../utils/responseHandler';
import { getISTStartOfDay, getISTEndOfDay } from '../utils/dateUtils';


import mongoose from 'mongoose';

export const getDashboardMetrics = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (user.role !== 'SUPER_ADMIN') {
        throw new AppError('Access denied. Business analytics are restricted to Super Admins.', 403);
    }

    // We want last 7 days metrics (IST boundaries)
    const endDate = getISTEndOfDay(new Date());
    
    const startDate = getISTStartOfDay(new Date());
    startDate.setDate(startDate.getDate() - 6);


    const query: any = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    const [dailyRevenue, branchPerformance, statusDistribution] = await Promise.all([
        // Daily Revenue
        Booking.aggregate([
            { $match: { ...query, status: { $ne: 'CANCELLED' } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                    revenue: { $sum: "$costs.total" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]),

        // Top Origin Branches (Count)
        Booking.aggregate([
            { $match: { ...query, status: { $ne: 'CANCELLED' } } },
            {
                $group: {
                    _id: "$fromBranch",
                    bookings: { $sum: 1 },
                    revenue: { $sum: "$costs.total" }
                }
            },
            {
                $lookup: {
                    from: "branches",
                    localField: "_id",
                    foreignField: "_id",
                    as: "branchDetails"
                }
            },
            { $unwind: "$branchDetails" },
            {
                $project: {
                    name: "$branchDetails.name",
                    bookings: 1,
                    revenue: 1
                }
            },
            { $sort: { bookings: -1 } },
            { $limit: 5 }
        ]),

        // Status Distribution
        Booking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const totalWeeklyRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    const totalWeeklyParcels = dailyRevenue.reduce((sum, day) => sum + day.count, 0);

    const formattedDaily = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        // Map to IST date string for match
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dayStr = `${year}-${month}-${day}`;
        
        const match = dailyRevenue.find((r: any) => r._id === dayStr);
        formattedDaily.push({
            date: dayStr,
            displayDate: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }),
            revenue: match ? match.revenue : 0,
            count: match ? match.count : 0
        });
    }


    const avgRevenue = totalWeeklyRevenue / 7;
    const avgParcels = totalWeeklyParcels / 7;

    successResponse(res, {
        dailyTrends: formattedDaily,
        topBranches: branchPerformance,
        statusDistribution: statusDistribution.map((s: any) => ({ name: s._id, value: s.count })),
        forecast: {
            estimatedRevenue: Math.round(avgRevenue * 1.1), // Simple 10% growth assumption
            estimatedParcels: Math.round(avgParcels),
            trend: avgRevenue > dailyRevenue[0]?.revenue ? 'UP' : 'DOWN'
        }
    }, "Metrics fetched successfully");
});
