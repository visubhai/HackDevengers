import { useState, useMemo, useEffect, useRef } from 'react';
import { Booking, Branch, PaymentStatus, ParcelStatus } from '@/shared/types';
import { useBranchStore } from '@/frontend/lib/store';
import useSWR from 'swr';
import { parcelService } from '@/frontend/services/parcelService';
import { getLocalDateString } from '../lib/utils';


export type SortField = 'date' | 'lrNumber' | 'fromBranch' | 'toBranch' | 'total' | 'sender' | 'receiver';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
    startDate: string;
    endDate: string;
    fromBranch: string | 'All';
    toBranch: string | 'All';
    paymentType: PaymentStatus | 'All';
    status: ParcelStatus | 'All';
    searchQuery: string;
    itemType: string | 'All';
    minAmount: string;
    maxAmount: string;
}

export function useReports(
    initialStatus: ParcelStatus | 'All' = 'All',
    explicitFromBranches?: string[],
    explicitToBranches?: string[]
) {
    const { currentUser } = useBranchStore();
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';



    const initialFilters = useMemo(() => {
        const isDeliveryReport = initialStatus === 'DELIVERED';
        
        return {
            startDate: getLocalDateString(new Date()),
            endDate: getLocalDateString(new Date()),
            fromBranch: !isDeliveryReport && currentUser?.branchId && currentUser?.role !== 'SUPER_ADMIN' ? currentUser.branchId : 'All',
            toBranch: isDeliveryReport && currentUser?.branchId ? currentUser.branchId : 'All',
            paymentType: 'All' as PaymentStatus | 'All',
            status: initialStatus as ParcelStatus | 'All',
            searchQuery: '',
            itemType: 'All',
            minAmount: '',
            maxAmount: ''
        };
    }, [currentUser, initialStatus]);

    // -- State --
    const [filters, setFilters] = useState<FilterState>(initialFilters);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
        field: initialStatus === 'DELIVERED' ? 'date' : 'lrNumber',
        order: initialStatus === 'DELIVERED' ? 'desc' : 'asc'
    });

    const [accumulatedBookings, setAccumulatedBookings] = useState<Booking[]>([]);

    // 1. Initial appliedFilters set to NULL to prevent auto-loading on page visit or session refresh
    const [appliedFilters, setAppliedFilters] = useState<FilterState | null>(null);

    // Reset accumulated data when filters change
    useEffect(() => {
        setAccumulatedBookings([]);
        setCurrentPage(1);
    }, [appliedFilters, sortConfig]);

    const applyFilters = (manualFilters?: FilterState) => {
        const nextFilters = manualFilters || { ...filters };
        setAppliedFilters(nextFilters);
        setCurrentPage(1);
        setTimeout(() => mutate(), 0);
    };

    // -- Fetch Data (Server Side) --
    const swrKey = useMemo(() => {
        if (!appliedFilters || !appliedFilters.startDate) return null;
        
        return [
            `reports-v5-${isSuperAdmin ? 'SA' : currentUser?.branchId}`, 
            appliedFilters,
            currentPage,
            rowsPerPage,
            sortConfig.field,
            sortConfig.order
        ];
    }, [appliedFilters, currentUser?.branchId, isSuperAdmin, currentPage, rowsPerPage, sortConfig]);

    const { data: response, error, isLoading, mutate } = useSWR(
        swrKey,
        async ([key, params, page, limit, sortField, sortOrder]: [string, FilterState | null, number, number, SortField, SortOrder]) => {
            if (!params) return { bookings: [], total: 0, stats: {} };

            const res = await parcelService.getBookingsForReports({
                startDate: params.startDate,
                endDate: params.endDate,
                fromBranch: params.fromBranch === 'All' 
                    ? (explicitFromBranches?.length ? explicitFromBranches.join(',') : undefined) 
                    : params.fromBranch,
                toBranch: params.toBranch === 'All' 
                    ? (explicitToBranches?.length ? explicitToBranches.join(',') : undefined) 
                    : params.toBranch,
                status: params.status === 'All' ? undefined : params.status,
                paymentType: params.paymentType === 'All' ? undefined : params.paymentType,
                lrNumber: params.searchQuery || undefined,
                itemType: params.itemType === 'All' ? undefined : params.itemType,
                minAmount: params.minAmount || undefined,
                maxAmount: params.maxAmount || undefined,
                page: page,
                limit: limit,
                sortField: sortField === 'date' ? (params.status === 'DELIVERED' ? 'deliveredAt' : 'createdAt') : sortField,
                sortOrder: sortOrder
            });

            if (res.error) throw res.error;

            const rawData = res.data?.data || [];
            const mappedBookings: Booking[] = rawData.map((p: any) => ({
                id: p._id,
                lrNumber: p.lrNumber,
                date: p.createdAt,
                fromBranch: p.fromBranch || { name: "Unknown" },
                toBranch: p.toBranch || { name: "Unknown" },
                sender: {
                    name: p.sender?.name || "",
                    mobile: p.sender?.mobile || "",
                    email: p.sender?.email
                },
                receiver: {
                    name: p.receiver?.name || "",
                    mobile: p.receiver?.mobile || "",
                    email: p.receiver?.email
                },
                parcels: p.parcels || [],
                costs: {
                    freight: Number(p.costs?.freight || 0),
                    handling: Number(p.costs?.handling || 0),
                    hamali: Number(p.costs?.hamali || 0),
                    total: Number(p.costs?.total || 0)
                },
                paymentType: p.paymentType,
                remarks: p.remarks,
                status: p.status,
                deliveredRemark: p.deliveredRemark,
                cancellationRemark: p.cancellationRemark,
                collectedBy: p.collectedBy,
                collectedByMobile: p.collectedByMobile,
                deliveredAt: p.deliveredAt
            }));

            return {
                bookings: mappedBookings,
                total: res.data?.total || 0,
                stats: res.data?.stats || {}
            };
        },
        {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 3000,
            keepPreviousData: true
        }
    );

    // Sync accumulated data
    useEffect(() => {
        if (response?.bookings) {
            setAccumulatedBookings(prev => {
                // If it's page 1, replace. Otherwise append.
                if (currentPage === 1) return response.bookings;
                
                // Prevent duplicates
                const existingIds = new Set(prev.map(b => b.id));
                const newOnes = response.bookings.filter(b => !existingIds.has(b.id));
                return [...prev, ...newOnes];
            });
        }
    }, [response, currentPage]);

    // -- Handlers --
    const handleSort = (field: SortField) => {
        setSortConfig(prev => ({
            field,
            order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    // For Exports/Charts (Fetching ALL filtered data without pagination)
    const fetchAllFilteredData = async () => {
        if (!appliedFilters) return [];

        const res = await parcelService.getBookingsForReports({
            startDate: appliedFilters.startDate,
            endDate: appliedFilters.endDate,
            fromBranch: appliedFilters.fromBranch === 'All' 
                ? (explicitFromBranches?.length ? explicitFromBranches.join(',') : undefined) 
                : appliedFilters.fromBranch,
            toBranch: appliedFilters.toBranch === 'All' 
                ? (explicitToBranches?.length ? explicitToBranches.join(',') : undefined) 
                : appliedFilters.toBranch,
            status: appliedFilters.status === 'All' ? undefined : appliedFilters.status,
            paymentType: appliedFilters.paymentType === 'All' ? undefined : appliedFilters.paymentType,
            lrNumber: appliedFilters.searchQuery || undefined,
            itemType: appliedFilters.itemType === 'All' ? undefined : appliedFilters.itemType,
            minAmount: appliedFilters.minAmount || undefined,
            maxAmount: appliedFilters.maxAmount || undefined,
            sortField: sortConfig.field === 'date' ? (appliedFilters.status === 'DELIVERED' ? 'deliveredAt' : 'createdAt') : sortConfig.field,
            sortOrder: sortConfig.order,
            limit: 10000, 
            page: 1,
            summary: true
        });

        return (res.data?.data || []).map((p: any) => ({
            id: p._id,
            lrNumber: p.lrNumber,
            date: p.createdAt,
            fromBranch: p.fromBranch?.name || "Unknown",
            toBranch: p.toBranch?.name || "Unknown",
            sender: {
                name: p.sender?.name || "",
                mobile: p.sender?.mobile || "",
            },
            receiver: {
                name: p.receiver?.name || "",
                mobile: p.receiver?.mobile || "",
            },
            parcels: p.parcels || [],
            costs: { total: Number(p.costs?.total || 0) },
            paymentType: p.paymentType,
            remarks: p.remarks,
            status: p.status,
            deliveredAt: p.deliveredAt
        }));
    };

    return {
        // Data
        data: accumulatedBookings,
        stats: response?.stats || {
            totalRevenue: 0,
            totalBookings: 0,
            paidAmount: 0,
            toPayAmount: 0,
            cancelledCount: 0,
            totalParcels: 0
        },

        // Loading More logic
        currentPage,
        totalPages: Math.ceil((response?.total || 0) / rowsPerPage),
        rowsPerPage,
        totalItems: response?.total || 0,
        loadMore: () => setCurrentPage(prev => prev + 1),
        hasMore: accumulatedBookings.length < (response?.total || 0),

        // Filters
        filters,
        setFilters,

        // Sorting
        sortConfig,
        handleSort,

        // Helpers
        mutate,
        isLoading,
        fetchAllFilteredData,
        applyFilters,
        isFilterApplied: appliedFilters !== null
    };
}
