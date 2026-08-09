import useSWR from 'swr';
import { adminService } from '@/super-admin/services/adminService';

const fetcher = async () => {
    const { data, error } = await adminService.getUsers();
    if (error) throw error;
    return data;
};

export function useUsers() {
    const { data, error, isLoading, mutate } = useSWR('users', fetcher);

    return {
        users: data || [],
        isLoading,
        error,
        mutate
    };
}
