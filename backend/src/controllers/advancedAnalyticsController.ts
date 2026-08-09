import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Booking from '../models/Booking';
import Branch from '../models/Branch';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { successResponse } from '../utils/responseHandler';
import { getISTStartOfDay, getISTEndOfDay } from '../utils/dateUtils';
import { cache } from '../utils/cache';
import mongoose from 'mongoose';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDateFormat = (granularity: string) => {
    switch (granularity) {
        case 'weekly': return '%Y-W%U';
        case 'monthly': return '%Y-%m';
        default: return '%Y-%m-%d';
    }
};

const fillDateGaps = (data: any[], startDate: Date, endDate: Date, granularity: string) => {
    if (granularity !== 'daily') return data;
    const filled: any[] = [];
    const dataMap = new Map(data.map(d => [d._id, d]));
    const current = new Date(startDate);
    while (current <= endDate) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        const match = dataMap.get(key);
        filled.push({
            date: key,
            displayDate: current.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }),
            revenue: match?.revenue || 0,
            count: match?.count || 0,
            quantity: match?.quantity || 0,
        });
        current.setDate(current.getDate() + 1);
    }
    return filled;
};

// ─── Handler 1: Overview Dashboard ───
export const getOverviewMetrics = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed, granularity = 'daily' } = req.query as any;

    const cacheKey = `analytics:v2:overview:${sd}:${ed}:${granularity}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Overview metrics (cached)");

    const startDate = getISTStartOfDay(new Date(sd));
    const endDate = getISTEndOfDay(new Date(ed));

    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodMs);

    const dateFormat = getDateFormat(granularity as string);
    const baseMatch = { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } };

    const [facetResult] = await Booking.aggregate([
        {
            $facet: {
                revenueTrend: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },
                            revenue: { $sum: "$costs.total" },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                volumeTrend: [
                    { $match: baseMatch },
                    { $unwind: "$parcels" },
                    {
                        $group: {
                            _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },
                            quantity: { $sum: "$parcels.quantity" }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                previousPeriod: [
                    { $match: { createdAt: { $gte: prevStart, $lte: prevEnd }, status: { $ne: 'CANCELLED' } } },
                    {
                        $group: {
                            _id: null,
                            revenue: { $sum: "$costs.total" },
                            count: { $sum: 1 }
                        }
                    }
                ],
                statusDistribution: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    { $group: { _id: "$status", count: { $sum: 1 } } }
                ],
                paymentTypeSplit: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: "$paymentType",
                            amount: { $sum: "$costs.total" },
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ]);

    const { revenueTrend, volumeTrend, previousPeriod, statusDistribution, paymentTypeSplit } = facetResult;

    const totalRevenue = revenueTrend.reduce((s: number, d: any) => s + d.revenue, 0);
    const totalParcels = revenueTrend.reduce((s: number, d: any) => s + d.count, 0);
    const prevRev = previousPeriod[0]?.revenue || 0;
    const prevParcels = previousPeriod[0]?.count || 0;

    const filledRevenue = fillDateGaps(revenueTrend, startDate, endDate, granularity as string);
    const volumeMap = new Map(volumeTrend.map((v: any) => [v._id, v.quantity]));
    const filledData = filledRevenue.map(d => ({
        ...d,
        quantity: volumeMap.get(d.date) || d.quantity || 0,
    }));

    const peakDay = filledData.length > 0 ? filledData.reduce((max: any, d: any) => d.revenue > max.revenue ? d : max, filledData[0]) : null;
    const totalQuantity = filledData.reduce((s: number, d: any) => s + d.quantity, 0);

    const result = {
        kpis: {
            totalRevenue,
            totalParcels,
            totalQuantity,
            avgParcelValue: totalParcels > 0 ? Math.round(totalRevenue / totalParcels) : 0,
            previousPeriodRevenue: prevRev,
            previousPeriodParcels: prevParcels,
            revenueChangePercent: prevRev > 0 ? Math.round(((totalRevenue - prevRev) / prevRev) * 1000) / 10 : 0,
            parcelsChangePercent: prevParcels > 0 ? Math.round(((totalParcels - prevParcels) / prevParcels) * 1000) / 10 : 0,
            peakDay: peakDay?.displayDate || '',
            peakDayRevenue: peakDay?.revenue || 0,
            dailyAvgRevenue: filledData.length > 0 ? Math.round(totalRevenue / filledData.length) : 0,
        },
        revenueTrend: filledData,
        statusDistribution: statusDistribution.map((s: any) => ({ name: s._id, value: s.count })),
        paymentTypeSplit: paymentTypeSplit.map((p: any) => ({ type: p._id, amount: p.amount, count: p.count })),
    };

    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Overview metrics fetched");
});

// ─── Handler 2: Branch Performance ───
export const getBranchPerformance = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed, branchIds } = req.query as any;

    const cacheKey = `analytics:v2:branches:${sd}:${ed}:${branchIds || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Branch metrics (cached)");

    const startDate = getISTStartOfDay(new Date(sd));
    const endDate = getISTEndOfDay(new Date(ed));
    const baseMatch: any = { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } };

    const [branches, deliveryStats] = await Promise.all([
        Booking.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: "$fromBranch",
                    revenue: { $sum: "$costs.total" },
                    volume: { $sum: 1 },
                    avgValue: { $avg: "$costs.total" }
                }
            },
            {
                $lookup: {
                    from: "branches", localField: "_id", foreignField: "_id", as: "branch"
                }
            },
            { $unwind: "$branch" },
            {
                $project: {
                    branchId: "$_id",
                    name: "$branch.name",
                    revenue: 1, volume: 1,
                    avgValue: { $round: ["$avgValue", 0] }
                }
            },
            { $sort: { revenue: -1 } }
        ]),
        Booking.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: "$fromBranch",
                    total: { $sum: 1 },
                    delivered: { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } }
                }
            }
        ])
    ]);

    const deliveryMap = new Map(deliveryStats.map((d: any) => [d._id.toString(), d]));
    const branchesWithDelivery = branches.map((b: any) => {
        const ds = deliveryMap.get(b.branchId.toString());
        const eligible = (ds?.total || 0) - (ds?.cancelled || 0);
        return {
            ...b,
            deliveryRate: eligible > 0 ? Math.round(((ds?.delivered || 0) / eligible) * 1000) / 10 : 0,
            deliveredCount: ds?.delivered || 0,
            totalCount: ds?.total || 0,
        };
    });

    let branchTrends: any[] = [];
    if (branchIds) {
        const ids = branchIds.split(',');
        branchTrends = await Booking.aggregate([
            { $match: { ...baseMatch, fromBranch: { $in: ids.map((id: string) => new mongoose.Types.ObjectId(id)) } } },
            {
                $group: {
                    _id: {
                        branch: "$fromBranch",
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }
                    },
                    revenue: { $sum: "$costs.total" },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "branches", localField: "_id.branch", foreignField: "_id", as: "branch"
                }
            },
            { $unwind: "$branch" },
            {
                $group: {
                    _id: { branchId: "$_id.branch", name: "$branch.name" },
                    data: { $push: { date: "$_id.date", revenue: "$revenue", count: "$count" } }
                }
            },
            {
                $project: {
                    branchId: "$_id.branchId",
                    name: "$_id.name",
                    data: { $sortArray: { input: "$data", sortBy: { date: 1 } } }
                }
            }
        ]);
    }

    const totalBranchRevenue = branchesWithDelivery.reduce((s: number, b: any) => s + b.revenue, 0);
    const branchesWithMarketShare = branchesWithDelivery.map((b: any) => ({
        ...b,
        marketShare: totalBranchRevenue > 0 ? Math.round((b.revenue / totalBranchRevenue) * 1000) / 10 : 0,
    }));

    const result = { branches: branchesWithMarketShare, branchTrends };
    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Branch performance fetched");
});

// ─── Handler 3: Route Analytics ───
export const getRouteAnalytics = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed } = req.query as any;

    const cacheKey = `analytics:v2:routes:${sd}:${ed}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Route analytics (cached)");

    const startDate = getISTStartOfDay(new Date(sd));
    const endDate = getISTEndOfDay(new Date(ed));
    const baseMatch = { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } };

    const [facetResult] = await Booking.aggregate([
        {
            $facet: {
                topRoutes: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: { from: "$fromBranch", to: "$toBranch" },
                            revenue: { $sum: "$costs.total" },
                            volume: { $sum: 1 },
                            avgValue: { $avg: "$costs.total" }
                        }
                    },
                    {
                        $lookup: { from: "branches", localField: "_id.from", foreignField: "_id", as: "fromBranch" }
                    },
                    { $unwind: "$fromBranch" },
                    {
                        $lookup: { from: "branches", localField: "_id.to", foreignField: "_id", as: "toBranch" }
                    },
                    { $unwind: "$toBranch" },
                    {
                        $project: {
                            fromName: "$fromBranch.name",
                            toName: "$toBranch.name",
                            fromId: "$_id.from",
                            toId: "$_id.to",
                            revenue: 1, volume: 1,
                            avgValue: { $round: ["$avgValue", 0] }
                        }
                    },
                    { $sort: { revenue: -1 } },
                    { $limit: 20 }
                ],
                routeMatrix: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: { from: "$fromBranch", to: "$toBranch" },
                            volume: { $sum: 1 }
                        }
                    },
                    {
                        $lookup: { from: "branches", localField: "_id.from", foreignField: "_id", as: "fromBranch" }
                    },
                    { $unwind: "$fromBranch" },
                    {
                        $lookup: { from: "branches", localField: "_id.to", foreignField: "_id", as: "toBranch" }
                    },
                    { $unwind: "$toBranch" },
                    {
                        $project: {
                            fromName: "$fromBranch.name",
                            toName: "$toBranch.name",
                            volume: 1
                        }
                    }
                ]
            }
        }
    ]);

    const result = { topRoutes: facetResult.topRoutes, routeMatrix: facetResult.routeMatrix };
    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Route analytics fetched");
});

// ─── Handler 4: Delivery Performance ───
export const getDeliveryPerformance = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed } = req.query as any;

    const cacheKey = `analytics:v2:delivery:${sd}:${ed}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Delivery metrics (cached)");

    const startDate = getISTStartOfDay(new Date(sd));
    const endDate = getISTEndOfDay(new Date(ed));

    const [facetResult] = await Booking.aggregate([
        {
            $facet: {
                deliveryTimeStats: [
                    { $match: { deliveredAt: { $gte: startDate, $lte: endDate }, status: 'DELIVERED' } },
                    {
                        $addFields: {
                            deliveryTimeHours: { $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 3600000] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgHours: { $avg: "$deliveryTimeHours" },
                            minHours: { $min: "$deliveryTimeHours" },
                            maxHours: { $max: "$deliveryTimeHours" },
                            totalDelivered: { $sum: 1 }
                        }
                    }
                ],
                overallCounts: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            delivered: { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] } },
                            cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
                            pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
                            booked: { $sum: { $cond: [{ $eq: ["$status", "BOOKED"] }, 1, 0] } }
                        }
                    }
                ],
                pendingAging: [
                    { $match: { status: { $in: ['PENDING', 'BOOKED'] } } },
                    {
                        $addFields: {
                            ageDays: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 86400000] }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $switch: {
                                    branches: [
                                        { case: { $lte: ["$ageDays", 1] }, then: "0-1 days" },
                                        { case: { $lte: ["$ageDays", 3] }, then: "1-3 days" },
                                        { case: { $lte: ["$ageDays", 7] }, then: "3-7 days" },
                                        { case: { $lte: ["$ageDays", 15] }, then: "7-15 days" },
                                    ],
                                    default: "15+ days"
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                deliveryTrend: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                            total: { $sum: 1 },
                            delivered: { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] } },
                            cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                branchDeliverySpeed: [
                    { $match: { deliveredAt: { $gte: startDate, $lte: endDate }, status: 'DELIVERED' } },
                    {
                        $addFields: {
                            deliveryTimeHours: { $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 3600000] }
                        }
                    },
                    {
                        $group: {
                            _id: "$toBranch",
                            avgHours: { $avg: "$deliveryTimeHours" },
                            deliveredCount: { $sum: 1 }
                        }
                    },
                    {
                        $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" }
                    },
                    { $unwind: "$branch" },
                    {
                        $project: {
                            branchId: "$_id",
                            name: "$branch.name",
                            avgHours: { $round: ["$avgHours", 1] },
                            deliveredCount: 1
                        }
                    },
                    { $sort: { avgHours: 1 } }
                ],
                slaCompliance: [
                    { $match: { deliveredAt: { $gte: startDate, $lte: endDate }, status: 'DELIVERED' } },
                    {
                        $addFields: {
                            deliveryTimeHours: { $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 3600000] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            within24h: { $sum: { $cond: [{ $lte: ["$deliveryTimeHours", 24] }, 1, 0] } },
                            within48h: { $sum: { $cond: [{ $lte: ["$deliveryTimeHours", 48] }, 1, 0] } },
                            within72h: { $sum: { $cond: [{ $lte: ["$deliveryTimeHours", 72] }, 1, 0] } },
                        }
                    }
                ]
            }
        }
    ]);

    const stats = facetResult.deliveryTimeStats[0];
    const counts = facetResult.overallCounts[0];
    const eligible = (counts?.total || 0) - (counts?.cancelled || 0);

    const deliveryTrend = facetResult.deliveryTrend.map((d: any) => {
        const elig = d.total - d.cancelled;
        return {
            date: d._id,
            displayDate: new Date(d._id).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }),
            total: d.total,
            delivered: d.delivered,
            rate: elig > 0 ? Math.round((d.delivered / elig) * 1000) / 10 : 0,
        };
    });

    const agingOrder = ['0-1 days', '1-3 days', '3-7 days', '7-15 days', '15+ days'];
    const agingMap = new Map(facetResult.pendingAging.map((a: any) => [a._id, a.count]));
    const pendingAging = agingOrder.map(bucket => ({
        bucket,
        count: agingMap.get(bucket) || 0
    }));

    const sla = facetResult.slaCompliance[0];
    const slaTotal = sla?.total || 1;

    const result = {
        avgDeliveryHours: stats ? Math.round(stats.avgHours * 10) / 10 : 0,
        minDeliveryHours: stats ? Math.round(stats.minHours * 10) / 10 : 0,
        maxDeliveryHours: stats ? Math.round(stats.maxHours * 10) / 10 : 0,
        deliveryRate: eligible > 0 ? Math.round(((counts?.delivered || 0) / eligible) * 1000) / 10 : 0,
        totalPending: (counts?.pending || 0) + (counts?.booked || 0),
        totalDelivered: counts?.delivered || 0,
        slaCompliance: {
            within24h: sla ? Math.round((sla.within24h / slaTotal) * 1000) / 10 : 0,
            within48h: sla ? Math.round((sla.within48h / slaTotal) * 1000) / 10 : 0,
            within72h: sla ? Math.round((sla.within72h / slaTotal) * 1000) / 10 : 0,
        },
        pendingAging,
        deliveryTrend,
        branchDeliverySpeed: facetResult.branchDeliverySpeed,
    };

    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Delivery performance fetched");
});

// ─── Handler 5: Financial Insights ───
export const getFinancialInsights = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed } = req.query as any;

    const cacheKey = `analytics:v2:financial:${sd}:${ed}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Financial insights (cached)");

    const startDate = getISTStartOfDay(new Date(sd));
    const endDate = getISTEndOfDay(new Date(ed));
    const baseMatch = { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } };

    const [facetResult] = await Booking.aggregate([
        {
            $facet: {
                revenueByPaymentType: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                            paid: { $sum: { $cond: [{ $eq: ["$paymentType", "Paid"] }, "$costs.total", 0] } },
                            toPay: { $sum: { $cond: [{ $eq: ["$paymentType", "To Pay"] }, "$costs.total", 0] } },
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                avgParcelValueTrend: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                            avgValue: { $avg: "$costs.total" }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                revenueByItemType: [
                    { $match: baseMatch },
                    { $unwind: "$parcels" },
                    {
                        $group: {
                            _id: "$parcels.itemType",
                            revenue: { $sum: { $multiply: ["$parcels.quantity", "$parcels.rate"] } },
                            count: { $sum: "$parcels.quantity" }
                        }
                    },
                    { $sort: { revenue: -1 } }
                ],
                costBreakdown: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: null,
                            freight: { $sum: "$costs.freight" },
                            handling: { $sum: "$costs.handling" },
                            hamali: { $sum: "$costs.hamali" },
                            total: { $sum: "$costs.total" }
                        }
                    }
                ],
                outstandingToPay: [
                    { $match: { paymentType: 'To Pay', status: { $in: ['PENDING', 'BOOKED'] } } },
                    {
                        $group: {
                            _id: null,
                            amount: { $sum: "$costs.total" },
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ]);

    const paymentTrend = facetResult.revenueByPaymentType.map((d: any) => ({
        date: d._id,
        displayDate: new Date(d._id).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }),
        paid: d.paid,
        toPay: d.toPay,
    }));

    const avgTrend = facetResult.avgParcelValueTrend.map((d: any) => ({
        date: d._id,
        displayDate: new Date(d._id).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }),
        avgValue: Math.round(d.avgValue),
    }));

    const costs = facetResult.costBreakdown[0] || { freight: 0, handling: 0, hamali: 0, total: 0 };
    const outstanding = facetResult.outstandingToPay[0] || { amount: 0, count: 0 };

    const totalRevenue = paymentTrend.reduce((s: number, d: any) => s + d.paid + d.toPay, 0);
    const numDays = paymentTrend.length || 1;

    const result = {
        totalRevenue,
        dailyAvgRevenue: Math.round(totalRevenue / numDays),
        revenueByPaymentType: paymentTrend,
        avgParcelValueTrend: avgTrend,
        revenueByItemType: facetResult.revenueByItemType.map((d: any) => ({
            itemType: d._id, revenue: d.revenue, count: d.count
        })),
        costBreakdown: { freight: costs.freight, handling: costs.handling, hamali: costs.hamali, total: costs.total },
        outstandingToPay: { amount: outstanding.amount, count: outstanding.count },
    };

    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Financial insights fetched");
});

// ─── Handler 6: Cancellation Analysis ───
export const getCancellationAnalysis = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed } = req.query as any;

    const cacheKey = `analytics:v2:cancellations:${sd}:${ed}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Cancellation analytics (cached)");

    const startDate = getISTStartOfDay(new Date(sd));
    const endDate = getISTEndOfDay(new Date(ed));

    const [facetResult] = await Booking.aggregate([
        {
            $facet: {
                cancellationTrend: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                            total: { $sum: 1 },
                            cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                revenueLost: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'CANCELLED' } },
                    {
                        $group: {
                            _id: null,
                            lostRevenue: { $sum: "$costs.total" },
                            count: { $sum: 1 }
                        }
                    }
                ],
                byBranch: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'CANCELLED' } },
                    {
                        $group: {
                            _id: "$fromBranch",
                            count: { $sum: 1 },
                            lostRevenue: { $sum: "$costs.total" }
                        }
                    },
                    { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" } },
                    { $unwind: "$branch" },
                    { $project: { branchId: "$_id", name: "$branch.name", count: 1, lostRevenue: 1 } },
                    { $sort: { count: -1 } }
                ],
                byRoute: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'CANCELLED' } },
                    {
                        $group: {
                            _id: { from: "$fromBranch", to: "$toBranch" },
                            count: { $sum: 1 },
                            lostRevenue: { $sum: "$costs.total" }
                        }
                    },
                    { $lookup: { from: "branches", localField: "_id.from", foreignField: "_id", as: "fromBranch" } },
                    { $unwind: "$fromBranch" },
                    { $lookup: { from: "branches", localField: "_id.to", foreignField: "_id", as: "toBranch" } },
                    { $unwind: "$toBranch" },
                    { $project: { fromName: "$fromBranch.name", toName: "$toBranch.name", count: 1, lostRevenue: 1 } },
                    { $sort: { count: -1 } },
                    { $limit: 15 }
                ],
                totalByBranch: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    { $group: { _id: "$fromBranch", total: { $sum: 1 } } }
                ]
            }
        }
    ]);

    const totalByBranchMap = new Map(facetResult.totalByBranch.map((b: any) => [b._id.toString(), b.total]));
    const lost = facetResult.revenueLost[0] || { lostRevenue: 0, count: 0 };
    const trend = facetResult.cancellationTrend.map((d: any) => ({
        date: d._id,
        displayDate: new Date(d._id).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }),
        total: d.total,
        cancelled: d.cancelled,
        rate: d.total > 0 ? Math.round((d.cancelled / d.total) * 1000) / 10 : 0,
    }));

    const result = {
        cancellationTrend: trend,
        totalLostRevenue: lost.lostRevenue,
        totalCancelled: lost.count,
        cancellationByBranch: facetResult.byBranch.map((b: any) => {
            const branchTotal = (totalByBranchMap.get(b.branchId.toString()) || 0) as number;
            return {
                ...b,
                totalBookings: branchTotal,
                rate: branchTotal > 0 ? Math.round((b.count / branchTotal) * 1000) / 10 : 0,
            };
        }),
        cancellationByRoute: facetResult.byRoute,
    };

    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Cancellation analysis fetched");
});

// ─── Handler 7: Customer Insights (Repeat Rate) ───
export const getCustomerInsights = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed } = req.query as any;

    const cacheKey = `analytics:v2:customers:${sd}:${ed}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Customer insights (cached)");

    const startDate = getISTStartOfDay(new Date(sd));
    const endDate = getISTEndOfDay(new Date(ed));
    const baseMatch = { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } };

    // sender.mobile is encrypted with a fixed salt, so identical numbers = identical ciphertext
    // grouping by encrypted value correctly identifies unique customers
    const [facetResult] = await Booking.aggregate([
        {
            $facet: {
                customerFrequency: [
                    { $match: baseMatch },
                    {
                        $group: {
                            _id: "$sender.name",
                            bookingCount: { $sum: 1 },
                            totalRevenue: { $sum: "$costs.total" },
                            firstBooking: { $min: "$createdAt" },
                            lastBooking: { $max: "$createdAt" },
                            sampleBookingId: { $first: "$_id" },
                            mobiles: { $addToSet: "$sender.mobile" },
                            paidCount: { $sum: { $cond: [{ $eq: ["$paymentType", "Paid"] }, 1, 0] } },
                            toPayCount: { $sum: { $cond: [{ $eq: ["$paymentType", "To Pay"] }, 1, 0] } },
                        }
                    },
                    { $sort: { bookingCount: -1 } }
                ],
                dailyNewVsReturning: [
                    { $match: baseMatch },
                    { $sort: { createdAt: 1 } },
                    {
                        $group: {
                            _id: "$sender.name",
                            firstBookingDate: { $min: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } },
                            allDates: {
                                $push: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }
                            }
                        }
                    }
                ]
            }
        }
    ]);

    const allCustomers = facetResult.customerFrequency;
    const totalUniqueCustomers = allCustomers.length;
    const repeatCustomers = allCustomers.filter((c: any) => c.bookingCount >= 2);
    const repeatCount = repeatCustomers.length;
    const repeatRate = totalUniqueCustomers > 0 ? Math.round((repeatCount / totalUniqueCustomers) * 1000) / 10 : 0;
    const totalBookings = allCustomers.reduce((s: number, c: any) => s + c.bookingCount, 0);
    const avgBookingsPerCustomer = totalUniqueCustomers > 0 ? Math.round((totalBookings / totalUniqueCustomers) * 10) / 10 : 0;
    const totalRevenueFromRepeat = repeatCustomers.reduce((s: number, c: any) => s + c.totalRevenue, 0);
    const totalRevenueAll = allCustomers.reduce((s: number, c: any) => s + c.totalRevenue, 0);
    const repeatRevenueShare = totalRevenueAll > 0 ? Math.round((totalRevenueFromRepeat / totalRevenueAll) * 1000) / 10 : 0;

    // Segment customers by frequency
    const segments = [
        { segment: '1 booking', count: allCustomers.filter((c: any) => c.bookingCount === 1).length },
        { segment: '2-5 bookings', count: allCustomers.filter((c: any) => c.bookingCount >= 2 && c.bookingCount <= 5).length },
        { segment: '6-10 bookings', count: allCustomers.filter((c: any) => c.bookingCount >= 6 && c.bookingCount <= 10).length },
        { segment: '11-25 bookings', count: allCustomers.filter((c: any) => c.bookingCount >= 11 && c.bookingCount <= 25).length },
        { segment: '25+ bookings', count: allCustomers.filter((c: any) => c.bookingCount > 25).length },
    ].filter(s => s.count > 0);

    // Compute new vs returning per day
    const customerFirstDates = facetResult.dailyNewVsReturning;
    const firstDateMap = new Map<string, string>();
    for (const c of customerFirstDates) {
        firstDateMap.set(c._id, c.firstBookingDate);
    }

    const dailyMap = new Map<string, { newCustomers: number; returningCustomers: number }>();
    for (const c of customerFirstDates) {
        const firstDate = c.firstBookingDate;
        const uniqueDates = [...new Set(c.allDates as string[])];
        for (const date of uniqueDates) {
            if (!dailyMap.has(date)) dailyMap.set(date, { newCustomers: 0, returningCustomers: 0 });
            const entry = dailyMap.get(date)!;
            if (date === firstDate) entry.newCustomers++;
            else entry.returningCustomers++;
        }
    }

    const newVsReturningTrend = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, val]) => ({
            date,
            displayDate: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }),
            newCustomers: val.newCustomers,
            returningCustomers: val.returningCustomers,
            repeatRate: (val.newCustomers + val.returningCustomers) > 0
                ? Math.round((val.returningCustomers / (val.newCustomers + val.returningCustomers)) * 1000) / 10
                : 0,
        }));

    // Top customer concentration (top 10%)
    const top10Pct = Math.max(1, Math.ceil(totalUniqueCustomers * 0.1));
    const top10PctRevenue = allCustomers.slice(0, top10Pct).reduce((s: number, c: any) => s + c.totalRevenue, 0);
    const top10PctRevenueShare = totalRevenueAll > 0 ? Math.round((top10PctRevenue / totalRevenueAll) * 1000) / 10 : 0;

    // Top 20 repeat customers - decrypt names via Mongoose findById
    const topRepeatRaw = repeatCustomers.slice(0, 20);
    const now = new Date();

    const customerEncNames = topRepeatRaw.map((c: any) => c._id);
    const [topRoutesByCustomer, recentBookingsByCustomer] = await Promise.all([
        Booking.aggregate([
            { $match: { 'sender.name': { $in: customerEncNames }, createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } } },
            { $group: { _id: { customer: "$sender.name", from: "$fromBranch", to: "$toBranch" }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $group: { _id: "$_id.customer", topRoute: { $first: { from: "$_id.from", to: "$_id.to", count: "$count" } } } },
            { $lookup: { from: "branches", localField: "topRoute.from", foreignField: "_id", as: "fromB" } },
            { $unwind: "$fromB" },
            { $lookup: { from: "branches", localField: "topRoute.to", foreignField: "_id", as: "toB" } },
            { $unwind: "$toB" },
            { $project: { topRoute: { fromName: "$fromB.name", toName: "$toB.name", count: "$topRoute.count" } } }
        ]),
        Booking.aggregate([
            { $match: { 'sender.name': { $in: customerEncNames }, createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$sender.name", recentBookings: { $push: { date: "$createdAt", amount: "$costs.total", lr: "$lrNumber" } } } },
            { $project: { recentBookings: { $slice: ["$recentBookings", 5] } } }
        ])
    ]);
    const routeMap = new Map(topRoutesByCustomer.map((r: any) => [r._id, r.topRoute]));
    const recentMap = new Map(recentBookingsByCustomer.map((r: any) => [r._id, r.recentBookings]));

    const topRepeat = await Promise.all(
        topRepeatRaw.map(async (c: any) => {
            const booking = await Booking.findById(c.sampleBookingId).select('sender.name sender.mobile').lean();
            const daysSinceLastBooking = Math.round((now.getTime() - new Date(c.lastBooking).getTime()) / 86400000);
            const avgBookingValue = Math.round(c.totalRevenue / c.bookingCount);
            const tier = (c.totalRevenue >= 50000 || c.bookingCount >= 20) ? 'VIP'
                : (c.totalRevenue >= 20000 || c.bookingCount >= 10) ? 'Premium'
                : c.bookingCount >= 3 ? 'Regular' : 'New';
            return {
                name: (booking as any)?.sender?.name || 'Unknown',
                mobile: (booking as any)?.sender?.mobile || '',
                bookingCount: c.bookingCount,
                totalRevenue: c.totalRevenue,
                avgBookingValue,
                firstBooking: c.firstBooking,
                lastBooking: c.lastBooking,
                daysSinceLastBooking,
                tier,
                paidCount: c.paidCount || 0,
                toPayCount: c.toPayCount || 0,
                topRoute: routeMap.get(c._id) || null,
                recentBookings: (recentMap.get(c._id) || []).map((rb: any) => ({
                    date: rb.date,
                    amount: rb.amount,
                    lr: rb.lr,
                })),
            };
        })
    );

    // Mask mobile numbers for display (show last 4 digits)
    const topRepeatMasked = topRepeat.map(c => ({
        ...c,
        mobile: c.mobile.length >= 4 ? '******' + c.mobile.slice(-4) : c.mobile,
    }));

    const avgRevenuePerCustomer = totalUniqueCustomers > 0 ? Math.round(totalRevenueAll / totalUniqueCustomers) : 0;

    const result = {
        kpis: {
            totalUniqueCustomers,
            repeatCount,
            repeatRate,
            avgBookingsPerCustomer,
            totalRevenueFromRepeat,
            repeatRevenueShare,
            avgRevenuePerCustomer,
            top10PctRevenueShare,
        },
        segments,
        newVsReturningTrend,
        topRepeatCustomers: topRepeatMasked,
    };

    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Customer insights fetched");
});

// ─── Comparison & Growth ─────────────────────────────────────────────
export const getComparisonGrowth = catchAsync(async (req: AuthRequest, res: Response) => {
    const { startDate: sd, endDate: ed } = req.query as { startDate: string; endDate: string };

    const cacheKey = `analytics:v2:comparison:${sd}:${ed}`;
    const cached = await cache.get(cacheKey);
    if (cached) return successResponse(res, cached, "Comparison analytics (cached)");

    const startDate = new Date(`${sd}T00:00:00+05:30`);
    const endDate = new Date(`${ed}T23:59:59.999+05:30`);
    const baseMatch = { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' } };

    const [facetResult] = await Booking.aggregate([
        { $match: baseMatch },
        {
            $facet: {
                daily: [
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                            revenue: { $sum: "$costs.total" },
                            count: { $sum: 1 },
                            quantity: { $sum: { $sum: "$parcels.quantity" } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],
                weekly: [
                    {
                        $group: {
                            _id: {
                                week: { $isoWeek: { date: "$createdAt", timezone: "Asia/Kolkata" } },
                                year: { $isoWeekYear: { date: "$createdAt", timezone: "Asia/Kolkata" } },
                            },
                            minDate: { $min: "$createdAt" },
                            maxDate: { $max: "$createdAt" },
                            revenue: { $sum: "$costs.total" },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { "_id.year": 1, "_id.week": 1 } },
                ],
                bookingBranch: [
                    { $group: { _id: "$fromBranch", revenue: { $sum: "$costs.total" }, count: { $sum: 1 } } },
                    { $sort: { revenue: -1 } },
                    { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "b" } },
                    { $unwind: "$b" },
                    { $project: { branchId: "$_id", name: "$b.name", revenue: 1, count: 1 } },
                ],
                destinationBranch: [
                    { $group: { _id: "$toBranch", revenue: { $sum: "$costs.total" }, count: { $sum: 1 } } },
                    { $sort: { revenue: -1 } },
                    { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "b" } },
                    { $unwind: "$b" },
                    { $project: { branchId: "$_id", name: "$b.name", revenue: 1, count: 1 } },
                ],
                bookingBranchDaily: [
                    {
                        $group: {
                            _id: { branch: "$fromBranch", date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } },
                            revenue: { $sum: "$costs.total" },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { "_id.date": 1 } },
                    {
                        $group: {
                            _id: "$_id.branch",
                            totalRevenue: { $sum: "$revenue" },
                            trend: { $push: { date: "$_id.date", revenue: "$revenue", count: "$count" } },
                        },
                    },
                    { $sort: { totalRevenue: -1 } },
                    { $limit: 10 },
                    { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "b" } },
                    { $unwind: "$b" },
                    { $project: { branchId: "$_id", name: "$b.name", trend: 1 } },
                ],
                destinationBranchDaily: [
                    {
                        $group: {
                            _id: { branch: "$toBranch", date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } },
                            revenue: { $sum: "$costs.total" },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { "_id.date": 1 } },
                    {
                        $group: {
                            _id: "$_id.branch",
                            totalRevenue: { $sum: "$revenue" },
                            trend: { $push: { date: "$_id.date", revenue: "$revenue", count: "$count" } },
                        },
                    },
                    { $sort: { totalRevenue: -1 } },
                    { $limit: 10 },
                    { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "b" } },
                    { $unwind: "$b" },
                    { $project: { branchId: "$_id", name: "$b.name", trend: 1 } },
                ],
                routeRevenue: [
                    { $group: { _id: { from: "$fromBranch", to: "$toBranch" }, revenue: { $sum: "$costs.total" }, count: { $sum: 1 } } },
                    { $sort: { revenue: -1 } },
                    { $limit: 15 },
                    { $lookup: { from: "branches", localField: "_id.from", foreignField: "_id", as: "fromB" } },
                    { $unwind: "$fromB" },
                    { $lookup: { from: "branches", localField: "_id.to", foreignField: "_id", as: "toB" } },
                    { $unwind: "$toB" },
                    { $project: { fromName: "$fromB.name", toName: "$toB.name", revenue: 1, count: 1, avgValue: { $round: [{ $divide: ["$revenue", "$count"] }, 0] } } },
                ],
                routeDaily: [
                    {
                        $group: {
                            _id: { from: "$fromBranch", to: "$toBranch", date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } } },
                            revenue: { $sum: "$costs.total" },
                        },
                    },
                    { $sort: { "_id.date": 1 } },
                    {
                        $group: {
                            _id: { from: "$_id.from", to: "$_id.to" },
                            totalRevenue: { $sum: "$revenue" },
                            trend: { $push: { date: "$_id.date", revenue: "$revenue" } },
                        },
                    },
                    { $sort: { totalRevenue: -1 } },
                    { $limit: 10 },
                    { $lookup: { from: "branches", localField: "_id.from", foreignField: "_id", as: "fromB" } },
                    { $unwind: "$fromB" },
                    { $lookup: { from: "branches", localField: "_id.to", foreignField: "_id", as: "toB" } },
                    { $unwind: "$toB" },
                    { $project: { routeLabel: { $concat: ["$fromB.name", " → ", "$toB.name"] }, totalRevenue: 1, trend: 1 } },
                ],
            },
        },
    ]);

    const { daily, weekly, bookingBranch, destinationBranch, bookingBranchDaily, destinationBranchDaily, routeRevenue, routeDaily } = facetResult;

    const fmtShort = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    const dailyRevenue = daily.map((d: any, i: number) => {
        const prev = i > 0 ? daily[i - 1].revenue : 0;
        const growth = prev > 0 ? Math.round(((d.revenue - prev) / prev) * 1000) / 10 : 0;
        const dateObj = new Date(d._id + 'T00:00:00+05:30');
        return { date: d._id, displayDate: fmtShort(dateObj), revenue: d.revenue, count: d.count, growth: i === 0 ? 0 : growth };
    });

    const weeklyRevenue = weekly.map((w: any, i: number) => {
        const prev = i > 0 ? weekly[i - 1].revenue : 0;
        const growth = prev > 0 ? Math.round(((w.revenue - prev) / prev) * 1000) / 10 : 0;
        const mn = new Date(w.minDate);
        const mx = new Date(w.maxDate);
        return {
            week: w._id.week, year: w._id.year,
            weekLabel: `W${w._id.week} (${fmtShort(mn)} – ${fmtShort(mx)})`,
            revenue: w.revenue, count: w.count, growth: i === 0 ? 0 : growth,
        };
    });

    const totalBookingRev = bookingBranch.reduce((s: number, b: any) => s + b.revenue, 0);
    const totalDestRev = destinationBranch.reduce((s: number, b: any) => s + b.revenue, 0);

    const mapBranch = (b: any, total: number) => ({
        branchId: b.branchId.toString(), name: b.name, revenue: b.revenue, count: b.count,
        avgValue: Math.round(b.revenue / b.count),
        share: total > 0 ? Math.round((b.revenue / total) * 1000) / 10 : 0,
    });

    const mapTrend = (b: any) => ({ branchId: b.branchId.toString(), name: b.name, data: b.trend });

    const result = {
        dailyRevenue,
        weeklyRevenue,
        bookingBranchRevenue: bookingBranch.map((b: any) => mapBranch(b, totalBookingRev)),
        destinationBranchRevenue: destinationBranch.map((b: any) => mapBranch(b, totalDestRev)),
        bookingBranchTrend: bookingBranchDaily.map(mapTrend),
        destinationBranchTrend: destinationBranchDaily.map(mapTrend),
        routeRevenue: routeRevenue.map((r: any) => ({ fromName: r.fromName, toName: r.toName, revenue: r.revenue, count: r.count, avgValue: r.avgValue })),
        routeTrend: routeDaily.map((r: any) => ({ routeLabel: r.routeLabel, data: r.trend })),
        kpis: {
            totalRevenue: dailyRevenue.reduce((s: number, d: any) => s + d.revenue, 0),
            avgDailyRevenue: dailyRevenue.length > 0 ? Math.round(dailyRevenue.reduce((s: number, d: any) => s + d.revenue, 0) / dailyRevenue.length) : 0,
            dodGrowth: dailyRevenue.length >= 2 ? dailyRevenue[dailyRevenue.length - 1].growth : 0,
            wowGrowth: weeklyRevenue.length >= 2 ? weeklyRevenue[weeklyRevenue.length - 1].growth : 0,
            bestDay: dailyRevenue.length > 0
                ? (() => { const b = dailyRevenue.reduce((best: any, d: any) => d.revenue > best.revenue ? d : best); return { date: b.displayDate, revenue: b.revenue }; })()
                : { date: '', revenue: 0 },
            worstDay: dailyRevenue.length > 0
                ? (() => { const w = dailyRevenue.reduce((worst: any, d: any) => d.revenue < worst.revenue ? d : worst); return { date: w.displayDate, revenue: w.revenue }; })()
                : { date: '', revenue: 0 },
        },
    };

    await cache.set(cacheKey, result, 300);
    successResponse(res, result, "Comparison analytics");
});

// ─── Party Lookup: search by sender OR receiver name (full history, not date-bound) ───
export const searchParties = catchAsync(async (req: AuthRequest, res: Response) => {
    const query = ((req.query.query as string) || '').trim();
    if (query.length < 2) {
        return successResponse(res, [], "Type at least 2 characters");
    }

    const safeRegex = escapeRegex(query);
    const matchesName = { $regexMatch: { input: '$$c.name', regex: safeRegex, options: 'i' } };

    const results = await Booking.aggregate([
        {
            $match: {
                $or: [
                    { 'sender.name': { $regex: safeRegex, $options: 'i' } },
                    { 'receiver.name': { $regex: safeRegex, $options: 'i' } }
                ]
            }
        },
        {
            $project: {
                status: 1,
                costs: 1,
                createdAt: 1,
                candidates: {
                    $filter: {
                        input: [
                            { name: '$sender.name', mobile: '$sender.mobile' },
                            { name: '$receiver.name', mobile: '$receiver.mobile' }
                        ],
                        as: 'c',
                        cond: matchesName
                    }
                }
            }
        },
        { $unwind: '$candidates' },
        {
            $group: {
                _id: '$candidates.name',
                mobile: { $first: '$candidates.mobile' },
                bookingCount: { $sum: 1 },
                totalRevenue: { $sum: { $cond: [{ $ne: ['$status', 'CANCELLED'] }, '$costs.total', 0] } },
                firstBooking: { $min: '$createdAt' },
                lastBooking: { $max: '$createdAt' },
            }
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 20 }
    ]);

    successResponse(res, results.map(r => ({
        name: r._id,
        mobile: r.mobile,
        bookingCount: r.bookingCount,
        totalRevenue: r.totalRevenue,
        firstBooking: r.firstBooking,
        lastBooking: r.lastBooking,
    })), "Parties matched");
});

// ─── Party Lookup: full booking history + stats for one exact party name ───
// Matches the name as sender OR receiver, since the same party can appear on either side.
export const getPartyHistory = catchAsync(async (req: AuthRequest, res: Response) => {
    const name = ((req.query.name as string) || '').trim();
    if (!name) throw new AppError("Party name is required", 400);

    const bookings = await Booking.find({ $or: [{ 'sender.name': name }, { 'receiver.name': name }] })
        .select('lrNumber fromBranch toBranch sender receiver parcels costs paymentType status remarks deliveredRemark cancellationRemark collectedBy collectedByMobile createdAt deliveredAt')
        .sort({ createdAt: -1 })
        .lean();

    if (bookings.length === 0) {
        return successResponse(res, { party: null, stats: null, bookings: [] }, "No history found");
    }

    const branchIds = Array.from(new Set(
        bookings.flatMap((b: any) => [b.fromBranch?.toString(), b.toBranch?.toString()]).filter(Boolean)
    ));
    const branches = await Branch.find({ _id: { $in: branchIds } }).select('name').lean();
    const branchNameMap = new Map(branches.map((b: any) => [b._id.toString(), b.name]));

    const roleOf = (b: any): 'sender' | 'receiver' => (b.sender?.name === name ? 'sender' : 'receiver');

    const activeBookings = bookings.filter((b: any) => b.status !== 'CANCELLED');
    const totalRevenue = activeBookings.reduce((s: number, b: any) => s + (b.costs?.total || 0), 0);
    const paidAmount = activeBookings.filter((b: any) => b.paymentType === 'Paid').reduce((s: number, b: any) => s + (b.costs?.total || 0), 0);
    const toPayAmount = activeBookings.filter((b: any) => b.paymentType === 'To Pay').reduce((s: number, b: any) => s + (b.costs?.total || 0), 0);
    const branchesUsed = Array.from(new Set(bookings.map((b: any) =>
        roleOf(b) === 'sender'
            ? (branchNameMap.get(b.fromBranch?.toString()) || 'Unknown')
            : (branchNameMap.get(b.toBranch?.toString()) || 'Unknown')
    )));
    const asSenderCount = bookings.filter((b: any) => roleOf(b) === 'sender').length;
    const asReceiverCount = bookings.length - asSenderCount;
    const firstMatch = bookings[0] as any;
    const mobile = roleOf(firstMatch) === 'sender' ? (firstMatch.sender?.mobile || '') : (firstMatch.receiver?.mobile || '');

    const stats = {
        name,
        mobile,
        totalBookings: bookings.length,
        asSenderCount,
        asReceiverCount,
        cancelledCount: bookings.length - activeBookings.length,
        totalRevenue,
        paidAmount,
        toPayAmount,
        branchesUsed,
        firstBooking: (bookings[bookings.length - 1] as any).createdAt,
        lastBooking: (bookings[0] as any).createdAt,
    };

    const mappedBookings = bookings.map((b: any) => {
        const role = roleOf(b);
        const counterparty = role === 'sender' ? b.receiver : b.sender;
        return {
            id: b._id,
            lrNumber: b.lrNumber,
            date: b.createdAt,
            role,
            fromBranch: branchNameMap.get(b.fromBranch?.toString()) || 'Unknown',
            toBranch: branchNameMap.get(b.toBranch?.toString()) || 'Unknown',
            counterparty: { name: counterparty?.name || '', mobile: counterparty?.mobile || '' },
            parcels: (b.parcels || []).map((p: any) => ({
                quantity: p.quantity,
                itemType: p.itemType,
                rate: p.rate,
                remarks: p.remarks || '',
            })),
            costs: {
                freight: b.costs?.freight || 0,
                handling: b.costs?.handling || 0,
                hamali: b.costs?.hamali || 0,
                total: b.costs?.total || 0,
            },
            paymentType: b.paymentType,
            status: b.status,
            remarks: b.remarks || '',
            deliveredRemark: b.deliveredRemark || '',
            cancellationRemark: b.cancellationRemark || '',
            collectedBy: b.collectedBy || '',
            collectedByMobile: b.collectedByMobile || '',
            deliveredAt: b.deliveredAt,
        };
    });

    successResponse(res, { party: { name, mobile: stats.mobile }, stats, bookings: mappedBookings }, "Party history fetched");
});
