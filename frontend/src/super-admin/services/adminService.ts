import { ServiceResponse, fetchApi, API_URL, parseError } from '@/frontend/services/base';
import { User } from '@/shared/types';

export const adminService = {
    async getUsers(): Promise<ServiceResponse<User[]>> {
        try {
            const res = await fetchApi('/users');
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async getDashboardStats(): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi('/superadmin/dashboard-data');
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async toggleUserStatus(userId: string, isActive: boolean): Promise<ServiceResponse<null>> {
        try {
            const res = await fetchApi(`/users/${userId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async getAllBranches(scope?: string, fromBranchId?: string): Promise<ServiceResponse<any[]>> {
        const params = new URLSearchParams();
        if (scope) params.append('scope', scope);
        if (fromBranchId) params.append('fromBranchId', fromBranchId);
        
        const queryString = params.toString();
        const url = queryString ? `/branches?${queryString}` : '/branches';

        try {
            const res = await fetchApi(url);

            if (!res.ok) {
                let errorData: any = {};
                const clonedRes = res.clone();
                try {
                    errorData = await res.json();
                } catch (e) {
                    const text = await clonedRes.text().catch(() => 'No text body');
                    errorData = { message: `Server error ${res.status}: ${text.substring(0, 50)}...` };
                }
                const msg = parseError(errorData);
                throw new Error(msg || `HTTP Error ${res.status}`);
            }

            const data = await res.json();
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: [], error: new Error(error.message || 'Unknown network error') };
        }
    },

    async getBranchPermissions(branchId: string): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi(`/superadmin/permissions/${branchId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async updateBranchPermissions(
        branchId: string, 
        allowedReports: string[], 
        allowedFromBranches: string[] = [],
        allowedToBranches: string[] = []
    ): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi(`/superadmin/permissions/${branchId}`, {
                method: 'PUT',
                body: JSON.stringify({ allowedReports, allowedFromBranches, allowedToBranches }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async getAuditLogs(page: number = 1, limit: number = 50, entityType?: string, action?: string, search?: string): Promise<ServiceResponse<any>> {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            if (entityType) params.append('entityType', entityType);
            if (action) params.append('action', action);
            if (search) params.append('search', search);

            const res = await fetchApi(`/superadmin/audit-logs?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));

            if (data.data && data.meta) {
                return { data: { data: data.data, total: data.meta.total || 0 }, error: null };
            }
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: { data: [], total: 0 }, error: new Error(error.message) };
        }
    },

    async getCounters(): Promise<ServiceResponse<any[]>> {
        try {
            const res = await fetchApi('/superadmin/counters');
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: [], error: new Error(error.message) };
        }
    },

    async updateCounter(counterId: string, count: number): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi(`/superadmin/counters/${counterId}`, {
                method: 'PUT',
                body: JSON.stringify({ count }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async resetPassword(userId: string, password: string): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi(`/users/${userId}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async createUser(userData: Partial<User>): Promise<ServiceResponse<User>> {
        try {
            const res = await fetchApi('/users', {
                method: 'POST',
                body: JSON.stringify(userData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async updateUser(userId: string, userData: Partial<User>): Promise<ServiceResponse<User>> {
        try {
            const res = await fetchApi(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async deleteUser(userId: string): Promise<ServiceResponse<null>> {
        try {
            const res = await fetchApi(`/users/${userId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async createBranch(branchData: any): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi('/branches', {
                method: 'POST',
                body: JSON.stringify(branchData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async updateBranch(branchId: string, branchData: any): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi(`/branches/${branchId}`, {
                method: 'PUT',
                body: JSON.stringify(branchData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async deleteBranch(branchId: string): Promise<ServiceResponse<null>> {
        try {
            const res = await fetchApi(`/branches/${branchId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async deleteBooking(id: string): Promise<ServiceResponse<null>> {
        try {
            const res = await fetchApi(`/superadmin/bookings/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async getSystemSettings(): Promise<ServiceResponse<any[]>> {
        try {
            const res = await fetchApi('/superadmin/settings');
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: [], error: new Error(error.message) };
        }
    },

    async updateSystemSetting(key: string, value: any): Promise<ServiceResponse<any>> {
        try {
            const res = await fetchApi('/superadmin/settings', {
                method: 'PUT',
                body: JSON.stringify({ key, value }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data));
            return { data: data.data || data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    }
};
