import { Booking, Parcel, ParcelStatus, IncomingParcel } from "@/shared/types";
import { ServiceResponse, fetchApi, parseError } from "./base";

export interface InboundFilters {
    startDate?: string;
    endDate?: string;
    fromBranchId?: string;
    paymentType?: string;
}

export const parcelService = {
    async createBooking(booking: Booking, userId: string): Promise<ServiceResponse<{ id: string, lr_number: string }>> {
        try {
            const res = await fetchApi('/bookings', {
                method: 'POST',
                body: JSON.stringify(booking),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));

            // Support both old {booking: ...} and new {data: ...} format
            const actualData = json.data || json.booking;

            return {
                data: { id: actualData._id, lr_number: actualData.lrNumber },
                error: null
            };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async getIncomingParcels(branchId: string, filters?: InboundFilters, page = 1, limit = 50): Promise<ServiceResponse<IncomingParcel[]>> {
        try {
            const params = new URLSearchParams();
            params.append('toBranch', branchId);
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            params.append('status', 'PENDING,BOOKED');

            if (filters) {
                if (filters.startDate) params.append('startDate', filters.startDate);
                if (filters.endDate) params.append('endDate', filters.endDate);
                if (filters.fromBranchId) params.append('fromBranch', filters.fromBranchId);
                if (filters.paymentType && filters.paymentType !== 'All') params.append('paymentType', filters.paymentType);
            }

            params.append('sortField', 'lrNumber');
            params.append('sortOrder', 'asc');

            const res = await fetchApi(`/bookings?${params.toString()}`);
            const json = await res.json();

            if (!res.ok) throw new Error(parseError(json));

            // Support both array format and paginated format
            const dataToMap = Array.isArray(json) ? json : (json.data || []);

            // Map with safety checks
            const parcels: IncomingParcel[] = dataToMap
                .map((p: any) => ({
                    id: p._id,
                    lrNumber: p.lrNumber,
                    senderName: p.sender?.name || 'N/A',
                    senderMobile: p.sender?.mobile || '',
                    receiverName: p.receiver?.name || 'N/A',
                    receiverMobile: p.receiver?.mobile || '',
                    fromBranch: p.fromBranch?.name || 'Unknown',
                    toBranch: p.toBranch?.name || 'Unknown',
                    status: p.status,
                    paymentStatus: p.paymentType,
                    totalAmount: p.costs?.total || 0,
                    quantity: p.parcels?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0,
                    itemType: p.parcels?.[0]?.itemType || 'N/A',
                    rate: p.parcels?.[0]?.rate || 0,
                    remarks: p.remarks || '',
                    date: p.createdAt,
                    collectedBy: p.collectedBy,
                    collectedByMobile: p.collectedByMobile,
                    deliveredRemark: p.deliveredRemark
                }));

            return { data: parcels, error: null };
        } catch (error: any) {
            return { data: [], error: new Error(error.message) };
        }
    },

    async getIncomingParcelsByName(branchName: string): Promise<ServiceResponse<IncomingParcel[]>> {
        console.warn("getIncomingParcelsByName is deprecated. Use ID based fetching.");
        return { data: [], error: new Error("Method deprecated. Use ID.") };
    },

    async getOutgoingParcels(branchId: string, page = 1, limit = 50): Promise<ServiceResponse<any[]>> {
        try {
            const res = await fetchApi(`/bookings?fromBranch=${branchId}&page=${page}&limit=${limit}`);
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));
            // Support both old array format and new paginated format
            const data = Array.isArray(json) ? json : (json.data || []);
            return { data, error: null };
        } catch (error: any) {
            return { data: [], error: new Error(error.message) };
        }
    },

    async updateParcelStatus(parcelId: string, status: ParcelStatus, deliveredRemark?: string, collectedBy?: string, collectedByMobile?: string, cancellationRemark?: string): Promise<ServiceResponse<null>> {
        try {
            const res = await fetchApi(`/bookings/${parcelId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status, deliveredRemark, collectedBy, collectedByMobile, cancellationRemark }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(error.message) };
        }
    },

    async searchGlobalByLR(lrNumber: string): Promise<ServiceResponse<any[]>> {
        try {
            // If the search query looks like an LR number (e.g. HO/1 or ho/1), sort by LR number ascending 
            // so exact match like HO/1 comes before HO/10, HO/100, etc.
            const isLrFormat = /^[a-zA-Z]+\/\d+$/.test(lrNumber);
            const sortParams = isLrFormat ? '&sortField=lrNumber&sortOrder=asc' : '';
            const res = await fetchApi(`/bookings?lrNumber=${encodeURIComponent(lrNumber)}&limit=10${sortParams}`);
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));
            const data = Array.isArray(json) ? json : (json.data || []);
            return { data, error: null };
        } catch (error: any) {
            return { data: [], error: new Error(error.message) };
        }
    },

    async getBookingsForReports(paramsObj: {
        startDate?: string,
        endDate?: string,
        lrNumber?: string,
        status?: string,
        fromBranch?: string,
        toBranch?: string,
        paymentType?: string,
        itemType?: string,
        minAmount?: string,
        maxAmount?: string,
        page?: number,
        limit?: number,
        sortField?: string,
        sortOrder?: string,
        refresh?: boolean,
        summary?: boolean
    }): Promise<ServiceResponse<{ data: any[], total: number, stats: any }>> {

        try {
            const params = new URLSearchParams();
            Object.entries(paramsObj).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value.toString());
                }
            });

            const res = await fetchApi(`/bookings?${params.toString()}`);
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));

            return {
                data: {
                    data: json.data || [],
                    total: json.meta?.total || json.total || 0,
                    stats: json.meta?.stats || json.stats || {}
                },
                error: null
            };
        } catch (error: any) {
            return { data: { data: [], total: 0, stats: {} }, error: new Error(error.message) };
        }
    },
    async updateBooking(id: string, booking: Booking): Promise<ServiceResponse<Booking>> {
        try {
            const res = await fetchApi(`/bookings/${id}`, {
                method: 'PUT',
                body: JSON.stringify(booking),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));

            // Support both old {booking: ...} and new {data: ...} format
            const actualData = json.data || json.booking;
            return { data: actualData, error: null };
        } catch (error: any) {
            return { data: null as any, error: new Error(error.message) };
        }
    },

    async getNextLR(branchId: string): Promise<ServiceResponse<{ nextLR: string }>> {
        try {
            const res = await fetchApi(`/bookings/next-lr?branchId=${branchId}`);
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));
            return { data: json.data || json, error: null };
        } catch (error: any) {
            return { data: null as any, error: new Error(error.message) };
        }
    },

    async initDashboard(): Promise<ServiceResponse<{ branches: any[], nextLR: string, recentBookings: any[], serverTime: string, settings: any[] }>> {
        try {
            const res = await fetchApi('/bookings/init-dashboard');
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));
            return { data: json.data || json, error: null };
        } catch (error: any) {
            return { data: null as any, error: new Error(error.message) };
        }
    },

    async searchContact(query: string, type?: "name" | "mobile"): Promise<ServiceResponse<any[]>> {
        if (query.length < 2) return { data: [], error: null };
        try {
            const typeParam = type ? `&type=${type}` : '';
            const res = await fetchApi(`/customers/search?query=${encodeURIComponent(query)}${typeParam}`);
            const json = await res.json();
            if (!res.ok) throw new Error(parseError(json));
            return { data: json.data || [], error: null };
        } catch (error: any) {
            return { data: [], error: new Error(error.message) };
        }
    }
};

