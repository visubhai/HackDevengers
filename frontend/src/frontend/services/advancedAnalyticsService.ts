import { fetchApi, parseError, ServiceResponse } from './base';

// ─── Types ───

export interface OverviewKPIs {
    totalRevenue: number;
    totalParcels: number;
    totalQuantity: number;
    avgParcelValue: number;
    previousPeriodRevenue: number;
    previousPeriodParcels: number;
    revenueChangePercent: number;
    parcelsChangePercent: number;
    peakDay: string;
    peakDayRevenue: number;
    dailyAvgRevenue: number;
}

export interface TrendPoint {
    date: string;
    displayDate: string;
    revenue: number;
    count: number;
    quantity: number;
}

export interface OverviewData {
    kpis: OverviewKPIs;
    revenueTrend: TrendPoint[];
    statusDistribution: { name: string; value: number }[];
    paymentTypeSplit: { type: string; amount: number; count: number }[];
}

export interface BranchRanking {
    branchId: string;
    name: string;
    revenue: number;
    volume: number;
    avgValue: number;
    deliveryRate: number;
    deliveredCount: number;
    totalCount: number;
    marketShare: number;
}

export interface BranchTrend {
    branchId: string;
    name: string;
    data: { date: string; revenue: number; count: number }[];
}

export interface BranchData {
    branches: BranchRanking[];
    branchTrends: BranchTrend[];
}

export interface RouteEntry {
    fromName: string;
    toName: string;
    fromId: string;
    toId: string;
    revenue: number;
    volume: number;
    avgValue: number;
}

export interface RouteMatrixEntry {
    fromName: string;
    toName: string;
    volume: number;
}

export interface RouteData {
    topRoutes: RouteEntry[];
    routeMatrix: RouteMatrixEntry[];
}

export interface DeliveryTrendPoint {
    date: string;
    displayDate: string;
    total: number;
    delivered: number;
    rate: number;
}

export interface DeliveryData {
    avgDeliveryHours: number;
    minDeliveryHours: number;
    maxDeliveryHours: number;
    deliveryRate: number;
    totalPending: number;
    totalDelivered: number;
    slaCompliance: { within24h: number; within48h: number; within72h: number };
    pendingAging: { bucket: string; count: number }[];
    deliveryTrend: DeliveryTrendPoint[];
    branchDeliverySpeed: { branchId: string; name: string; avgHours: number; deliveredCount: number }[];
}

export interface FinancialData {
    totalRevenue: number;
    dailyAvgRevenue: number;
    revenueByPaymentType: { date: string; displayDate: string; paid: number; toPay: number }[];
    avgParcelValueTrend: { date: string; displayDate: string; avgValue: number }[];
    revenueByItemType: { itemType: string; revenue: number; count: number }[];
    costBreakdown: { freight: number; handling: number; hamali: number; total: number };
    outstandingToPay: { amount: number; count: number };
}

export interface CancellationTrendPoint {
    date: string;
    displayDate: string;
    total: number;
    cancelled: number;
    rate: number;
}

export interface CancellationData {
    cancellationTrend: CancellationTrendPoint[];
    totalLostRevenue: number;
    totalCancelled: number;
    cancellationByBranch: { branchId: string; name: string; count: number; lostRevenue: number; totalBookings: number; rate: number }[];
    cancellationByRoute: { fromName: string; toName: string; count: number; lostRevenue: number }[];
}

export interface CustomerKPIs {
    totalUniqueCustomers: number;
    repeatCount: number;
    repeatRate: number;
    avgBookingsPerCustomer: number;
    totalRevenueFromRepeat: number;
    repeatRevenueShare: number;
    avgRevenuePerCustomer: number;
    top10PctRevenueShare: number;
}

export interface TopRepeatCustomer {
    name: string;
    mobile: string;
    bookingCount: number;
    totalRevenue: number;
    avgBookingValue: number;
    firstBooking: string;
    lastBooking: string;
    daysSinceLastBooking: number;
    tier: string;
    paidCount: number;
    toPayCount: number;
    topRoute: { fromName: string; toName: string; count: number } | null;
    recentBookings: { date: string; amount: number; lr: string }[];
}

export interface NewVsReturningPoint {
    date: string;
    displayDate: string;
    newCustomers: number;
    returningCustomers: number;
    repeatRate: number;
}

export interface CustomerData {
    kpis: CustomerKPIs;
    segments: { segment: string; count: number }[];
    newVsReturningTrend: NewVsReturningPoint[];
    topRepeatCustomers: TopRepeatCustomer[];
}

export interface ComparisonDailyPoint {
    date: string;
    displayDate: string;
    revenue: number;
    count: number;
    growth: number;
}

export interface ComparisonWeeklyPoint {
    week: number;
    year: number;
    weekLabel: string;
    revenue: number;
    count: number;
    growth: number;
}

export interface ComparisonBranchRevenue {
    branchId: string;
    name: string;
    revenue: number;
    count: number;
    avgValue: number;
    share: number;
}

export interface ComparisonBranchTrend {
    branchId: string;
    name: string;
    data: { date: string; revenue: number; count: number }[];
}

export interface ComparisonRouteRevenue {
    fromName: string;
    toName: string;
    revenue: number;
    count: number;
    avgValue: number;
}

export interface ComparisonRouteTrend {
    routeLabel: string;
    data: { date: string; revenue: number }[];
}

export interface ComparisonData {
    dailyRevenue: ComparisonDailyPoint[];
    weeklyRevenue: ComparisonWeeklyPoint[];
    bookingBranchRevenue: ComparisonBranchRevenue[];
    destinationBranchRevenue: ComparisonBranchRevenue[];
    bookingBranchTrend: ComparisonBranchTrend[];
    destinationBranchTrend: ComparisonBranchTrend[];
    routeRevenue: ComparisonRouteRevenue[];
    routeTrend: ComparisonRouteTrend[];
    kpis: {
        totalRevenue: number;
        avgDailyRevenue: number;
        dodGrowth: number;
        wowGrowth: number;
        bestDay: { date: string; revenue: number };
        worstDay: { date: string; revenue: number };
    };
}

export interface PartySearchResult {
    name: string;
    mobile: string;
    bookingCount: number;
    totalRevenue: number;
    firstBooking: string;
    lastBooking: string;
}

export interface PartyHistoryStats {
    name: string;
    mobile: string;
    totalBookings: number;
    asSenderCount: number;
    asReceiverCount: number;
    cancelledCount: number;
    totalRevenue: number;
    paidAmount: number;
    toPayAmount: number;
    branchesUsed: string[];
    firstBooking: string;
    lastBooking: string;
}

export interface PartyHistoryParcel {
    quantity: number;
    itemType: string;
    rate: number;
    remarks: string;
}

export interface PartyHistoryBooking {
    id: string;
    lrNumber: string;
    date: string;
    role: 'sender' | 'receiver';
    fromBranch: string;
    toBranch: string;
    counterparty: { name: string; mobile: string };
    parcels: PartyHistoryParcel[];
    costs: { freight: number; handling: number; hamali: number; total: number };
    paymentType: string;
    status: string;
    remarks: string;
    deliveredRemark: string;
    cancellationRemark: string;
    collectedBy: string;
    collectedByMobile: string;
    deliveredAt?: string;
}

export interface PartyHistoryData {
    party: { name: string; mobile: string } | null;
    stats: PartyHistoryStats | null;
    bookings: PartyHistoryBooking[];
}

// ─── Service ───

const buildQuery = (startDate: string, endDate: string, extras?: Record<string, string>) => {
    const params = new URLSearchParams({ startDate, endDate, ...extras });
    return params.toString();
};

const fetchAnalytics = async <T>(endpoint: string, startDate: string, endDate: string, extras?: Record<string, string>): Promise<ServiceResponse<T>> => {
    try {
        const query = buildQuery(startDate, endDate, extras);
        const res = await fetchApi(`/analytics/v2/${endpoint}?${query}`);
        const data = await res.json();
        if (!res.ok || data.status !== 'success') {
            return { data: null, error: new Error(parseError(data)) };
        }
        return { data: data.data, error: null };
    } catch (err: any) {
        return { data: null, error: new Error(err.message || 'Failed to fetch analytics') };
    }
};

export const advancedAnalyticsService = {
    getOverview: (startDate: string, endDate: string, granularity = 'daily') =>
        fetchAnalytics<OverviewData>('overview', startDate, endDate, { granularity }),

    getBranches: (startDate: string, endDate: string, branchIds?: string) =>
        fetchAnalytics<BranchData>('branches', startDate, endDate, branchIds ? { branchIds } : undefined),

    getRoutes: (startDate: string, endDate: string) =>
        fetchAnalytics<RouteData>('routes', startDate, endDate),

    getDelivery: (startDate: string, endDate: string) =>
        fetchAnalytics<DeliveryData>('delivery', startDate, endDate),

    getFinancial: (startDate: string, endDate: string) =>
        fetchAnalytics<FinancialData>('financial', startDate, endDate),

    getCancellations: (startDate: string, endDate: string) =>
        fetchAnalytics<CancellationData>('cancellations', startDate, endDate),

    getCustomers: (startDate: string, endDate: string) =>
        fetchAnalytics<CustomerData>('customers', startDate, endDate),

    getComparison: (startDate: string, endDate: string) =>
        fetchAnalytics<ComparisonData>('comparison', startDate, endDate),

    searchParties: async (query: string): Promise<ServiceResponse<PartySearchResult[]>> => {
        try {
            const res = await fetchApi(`/analytics/v2/parties/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (!res.ok || data.status !== 'success') {
                return { data: null, error: new Error(parseError(data)) };
            }
            return { data: data.data, error: null };
        } catch (err: any) {
            return { data: null, error: new Error(err.message || 'Failed to search parties') };
        }
    },

    getPartyHistory: async (name: string): Promise<ServiceResponse<PartyHistoryData>> => {
        try {
            const res = await fetchApi(`/analytics/v2/parties/history?name=${encodeURIComponent(name)}`);
            const data = await res.json();
            if (!res.ok || data.status !== 'success') {
                return { data: null, error: new Error(parseError(data)) };
            }
            return { data: data.data, error: null };
        } catch (err: any) {
            return { data: null, error: new Error(err.message || 'Failed to fetch party history') };
        }
    },
};
