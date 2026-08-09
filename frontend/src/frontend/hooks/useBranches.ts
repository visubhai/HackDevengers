import { adminService } from '@/super-admin/services/adminService';
import useSWR from 'swr';

export interface BranchObj {
    _id: string;
    id?: string;
    name: string;
    branchCode: string;
    state?: string;
    address?: string;
    phone?: string;
    isActive?: boolean;
    whatsappNotificationsEnabled?: boolean;
    username?: string;
    allowedDestinations?: any[]; // Array of branch IDs or objects
    allowedPaymentTypes?: string[];
}

export function useBranches(scope?: string, fromBranchId?: string) {
    const { data: rawData, error: apiError, isLoading, mutate } = useSWR(
        ['branches', scope || 'all', fromBranchId || 'none'],
        async () => {
            const { data, error } = await adminService.getAllBranches(scope, fromBranchId);
            if (error || !data) throw new Error(error?.message || 'Failed to fetch branches');
            return data;
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // Keep standard deduping to prevent duplicate requests
        }
    );

    const branches = rawData ? rawData.map((b: any) => b.name) : [];
    const branchObjects = (rawData || []) as unknown as BranchObj[];

    return {
        branches,
        branchObjects,
        loading: isLoading,
        error: apiError?.message || null,
        refresh: mutate
    };
}
