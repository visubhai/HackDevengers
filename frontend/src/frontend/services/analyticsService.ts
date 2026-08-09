import { fetchApi, parseError, ServiceResponse } from './base';

export interface DailyTrend {
    date: string;
    displayDate: string;
    revenue: number;
    count: number;
}

export interface BranchPerformance {
    name: string;
    bookings: number;
    revenue: number;
}

export interface DashboardMetrics {
    dailyTrends: DailyTrend[];
    topBranches: BranchPerformance[];
    statusDistribution: { name: string; value: number }[];
    forecast: {
        estimatedRevenue: number;
        estimatedParcels: number;
        trend: 'UP' | 'DOWN';
    };
}

export const analyticsService = {
    getDashboardMetrics: async (): Promise<ServiceResponse<DashboardMetrics>> => {
        try {
            const res = await fetchApi('/analytics');
            const data = await res.json();

            if (!res.ok || data.status === 'fail' || data.status === 'error') {
                return { data: null, error: new Error(parseError(data)) };
            }

            return { data: data.data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message || 'Failed to fetch metrics') };
        }
    }
};
