import { ServiceResponse, fetchApi, parseError } from './base';

export const ledgerService = {
    async getDailyStats(branchId: string, date: string): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi(`/ledger?branchId=${branchId}&date=${date}`);
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return {
                data: data.meta?.stats || data.stats || {},
                error: null
            };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async getBranchPerformance(startDate: string, endDate: string): Promise<ServiceResponse<any>> {
        return { data: null, error: null };
    },

    async addTransaction(transaction: any): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi('/ledger', {
                method: 'POST',
                body: JSON.stringify(transaction),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data.transaction || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    }
};
