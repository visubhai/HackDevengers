"use client";

import { useBranchStore } from "@/frontend/lib/store";
import { parcelService } from "@/frontend/services/parcelService";
import { Package, Warehouse, CircleCheck, MessageCircle, Loader2 } from "lucide-react";
import { cn, getLocalDateString } from "@/frontend/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import useSWR from "swr";
import { ledgerService } from "@/frontend/services/ledgerService";
import { Button } from "@/frontend/components/ui/button";
import { ReceiveModal } from "./ReceiveModal";
import { IncomingParcel } from "@/shared/types";
import { useToast } from "@/frontend/components/ui/toast";
import { BranchSelect } from "@/frontend/components/common/BranchSelect";
import { openWhatsApp } from "@/frontend/lib/whatsapp";
import { useBranches } from "@/frontend/hooks/useBranches";
import { FilterState } from "@/frontend/hooks/useReports";
import { ReportFilters } from "@/frontend/components/reports/ReportFilters";
import { ExportButtons } from "@/frontend/components/reports/ExportButtons";
import SafePrintReportTable from "@/frontend/components/reports/SafePrintReportTable";
import { adminService } from "@/super-admin/services/adminService";

export function InboundTable() {
    const { currentUser } = useBranchStore();
    const { addToast } = useToast();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [selectedParcel, setSelectedParcel] = useState<IncomingParcel | null>(null);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const [filters, setFilters] = useState<FilterState>({
        startDate: yesterdayStr,
        endDate: yesterdayStr,
        fromBranch: 'All',
        toBranch: currentUser?.branchId || 'All',
        paymentType: 'All',
        status: 'All',
        searchQuery: '',
        itemType: 'All',
        minAmount: '',
        maxAmount: ''
    });

    const { branchObjects: allBranches } = useBranches();

    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const hasBranchControl = isSuperAdmin || (currentUser?.allowedBranches && currentUser.allowedBranches.length > 0);
    const targetBranchId = hasBranchControl ? (selectedBranchId || currentUser?.branchId) : currentUser?.branchId;
    const targetBranchName = (allBranches || []).find((b: any) => b._id === targetBranchId)?.name || currentUser?.branch || targetBranchId;

    const [reportPermission, setReportPermission] = useState<any>(null);

    useEffect(() => {
        if (currentUser?.branchId) {
            adminService.getBranchPermissions(currentUser.branchId).then(res => {
                if (res.data) setReportPermission(res.data);
            });
        }
    }, [currentUser?.branchId]);

    const availableFromBranches = useMemo(() => {
        if (!allBranches || allBranches.length === 0) return [];
        let filtered = [...allBranches].sort((a: any, b: any) => a.name.localeCompare(b.name));
        if (currentUser?.role !== 'SUPER_ADMIN') {
            if (!reportPermission?.allowedFromBranches) {
                filtered = filtered.filter((b: any) => b._id === currentUser?.branchId);
            } else {
                const allowedIds = reportPermission.allowedFromBranches.map((b: any) => typeof b === 'string' ? b : b._id);
                filtered = allowedIds.map((id: string) => allBranches.find((b: any) => b._id === id)).filter(Boolean);
            }
        }
        return filtered.map((b: any) => ({ id: b._id || b.id, name: b.name }));
    }, [allBranches, reportPermission, currentUser]);

    const availableToBranches = useMemo(() => {
        if (!allBranches || allBranches.length === 0) return [];
        let filtered = [...allBranches].sort((a: any, b: any) => a.name.localeCompare(b.name));
        if (currentUser?.role !== 'SUPER_ADMIN') {
            if (!reportPermission?.allowedToBranches) {
                filtered = filtered.filter((b: any) => b._id === currentUser?.branchId);
            } else {
                const allowedIds = reportPermission.allowedToBranches.map((b: any) => typeof b === 'string' ? b : b._id);
                filtered = allowedIds.map((id: string) => allBranches.find((b: any) => b._id === id)).filter(Boolean);
            }
        }
        return filtered.map((b: any) => ({ id: b._id || b.id, name: b.name }));
    }, [allBranches, reportPermission, currentUser]);

    const [appliedSearch, setAppliedSearch] = useState<{
        branchId: string;
        startDate: string;
        endDate: string;
        fromBranch: string;
        paymentType: string;
    } | null>(null);

    const [page, setPage] = useState(1);
    const [accumulatedParcels, setAccumulatedParcels] = useState<IncomingParcel[]>([]);
    const [fullPrintData, setFullPrintData] = useState<any[]>([]);
    const [isPreparingPrint, setIsPreparingPrint] = useState(false);

    const { data: serverData, mutate, isLoading } = useSWR(
        appliedSearch
            ? [
                'inbound-v2',
                appliedSearch.branchId,
                appliedSearch.startDate,
                appliedSearch.endDate,
                appliedSearch.fromBranch,
                appliedSearch.paymentType,
                page
              ] as const
            : null,
        async ([_key, branchId, startDate, endDate, fromBranch, paymentType, p]) => {
            const res = await parcelService.getIncomingParcels(branchId, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                fromBranchId: fromBranch === 'All' ? undefined : fromBranch,
                paymentType: paymentType === 'All' ? undefined : paymentType,
            }, p, 50);
            return res.data || [];
        },
        { revalidateOnFocus: false, keepPreviousData: false }
    );

    useEffect(() => {
        if (!serverData) return;
        if (page === 1) {
            setAccumulatedParcels(serverData);
        } else {
            setAccumulatedParcels(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newOnes = serverData.filter(p => !existingIds.has(p.id));
                return [...prev, ...newOnes];
            });
        }
    }, [serverData]);

    const handleGetStock = (manualFilters?: FilterState) => {
        if (!targetBranchId) {
            addToast("Please select a branch first", "error");
            return;
        }
        const activeFilters = manualFilters || filters;
        setAccumulatedParcels([]);
        setPage(1);
        setAppliedSearch({
            branchId: targetBranchId,
            startDate: activeFilters.startDate,
            endDate: activeFilters.endDate,
            fromBranch: activeFilters.fromBranch,
            paymentType: activeFilters.paymentType,
        });
        setTimeout(() => mutate(), 0); // Force re-fetch even if filters didn't change
    };

    const handlePrint = async () => {
        if (!targetBranchId) {
            addToast("Please select a branch first", "error");
            return;
        }
        setIsPreparingPrint(true);
        try {
            const res = await parcelService.getBookingsForReports({
                startDate: appliedSearch?.startDate || filters.startDate,
                endDate: appliedSearch?.endDate || filters.endDate,
                fromBranch: appliedSearch?.fromBranch === 'All' ? undefined : appliedSearch?.fromBranch,
                toBranch: targetBranchId,
                status: 'PENDING,BOOKED',
                paymentType: appliedSearch?.paymentType === 'All' ? undefined : appliedSearch?.paymentType,
                limit: 10000,
                page: 1,
                summary: true
            });

            const mappedBookings = (res.data?.data || []).map((p: any) => ({
                id: p._id,
                lrNumber: p.lrNumber,
                date: p.createdAt,
                fromBranch: p.fromBranch || { name: "Unknown" },
                toBranch: p.toBranch || { name: "Unknown" },
                sender: { name: p.sender?.name || "", mobile: p.sender?.mobile || "" },
                receiver: { name: p.receiver?.name || "", mobile: p.receiver?.mobile || "" },
                parcels: p.parcels || [],
                costs: { total: Number(p.costs?.total || 0) },
                paymentType: p.paymentType,
                remarks: p.remarks,
                status: p.status
            }));

            setFullPrintData(mappedBookings);

            setTimeout(() => {
                document.body.classList.add('print-report-only');
                window.print();
                const cleanup = () => {
                    document.body.classList.remove('print-report-only');
                    window.removeEventListener('afterprint', cleanup);
                };
                window.addEventListener('afterprint', cleanup);
                setTimeout(cleanup, 3000);
                setIsPreparingPrint(false);
            }, 800);
        } catch (error) {
            console.error("Print fetch failed:", error);
            setIsPreparingPrint(false);
        }
    };

    const incomingParcels: IncomingParcel[] = useMemo(() => {
        let data = [...accumulatedParcels];

        data.sort((a, b) => {
            const getLRParts = (lr: string) => {
                const parts = lr.split('/');
                return { prefix: parts[0] || "", index: parseInt(parts[1], 10) || 0 };
            };
            const partA = getLRParts(a.lrNumber);
            const partB = getLRParts(b.lrNumber);
            if (partA.prefix !== partB.prefix) return partA.prefix.localeCompare(partB.prefix);
            return partA.index - partB.index;
        });

        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            data = data.filter(p =>
                p.lrNumber.toLowerCase().includes(q) ||
                (p.senderName || '').toLowerCase().includes(q) ||
                (p.receiverName || '').toLowerCase().includes(q)
            );
        }

        return data;
    }, [accumulatedParcels, filters.searchQuery]);

    const hasMore = serverData?.length === 50;

    const inboundStats = useMemo(() => {
        const totalRevenue = accumulatedParcels.reduce((s, p) => s + (p.totalAmount || 0), 0);
        const paidAmount = accumulatedParcels.filter(p => p.paymentStatus === 'Paid').reduce((s, p) => s + (p.totalAmount || 0), 0);
        const toPayAmount = accumulatedParcels.filter(p => p.paymentStatus === 'To Pay').reduce((s, p) => s + (p.totalAmount || 0), 0);
        const totalQuantity = accumulatedParcels.reduce((s, p) => s + (p.quantity || 0), 0);
        return { totalRevenue, paidAmount, toPayAmount, totalBookings: accumulatedParcels.length, totalQuantity };
    }, [accumulatedParcels]);

    const handleActionClick = (parcel: IncomingParcel) => {
        if (parcel.status === "DELIVERED") return;
        setSelectedParcel(parcel);
    };

    const handleConfirmAction = async (deliveredRemark?: string, collectedBy?: string, collectedByMobile?: string) => {
        if (!selectedParcel) return;
        try {
            const currentStatus = selectedParcel.status?.toUpperCase();
            if (currentStatus !== "DELIVERED" && currentStatus !== "CANCELLED") {
                const finalAmount = selectedParcel.totalAmount;
                if (selectedParcel.paymentStatus === "To Pay") {
                    const ledgerRes = await ledgerService.addTransaction({
                        referenceId: selectedParcel.id,
                        amount: finalAmount,
                        type: 'CREDIT',
                        description: `Payment collected for LR ${selectedParcel.lrNumber}`,
                        branchId: targetBranchId || currentUser?.branchId || ''
                    });
                    if (ledgerRes.error) throw ledgerRes.error;
                }
                const finalRemark = deliveredRemark?.trim() || "Delivered at counter";
                const statusRes = await parcelService.updateParcelStatus(selectedParcel.id, 'DELIVERED', finalRemark, collectedBy, collectedByMobile);
                if (statusRes.error) throw statusRes.error;
                mutate();
                setSelectedParcel(null);
                addToast("Parcel delivered successfully", "success");
            } else {
                setSelectedParcel(null);
                addToast(`Parcel is already ${selectedParcel.status}`, "info");
            }
        } catch (error: any) {
            addToast("Error: " + error.message, "error");
        }
    };

    const dateRangeStr = `${new Date(filters.startDate).toLocaleDateString('en-GB')} - ${new Date(filters.endDate).toLocaleDateString('en-GB')}`;

    const exportFilters = {
        startDate: appliedSearch?.startDate || filters.startDate,
        endDate: appliedSearch?.endDate || filters.endDate,
        fromBranch: appliedSearch?.fromBranch || 'All',
        toBranch: targetBranchId || 'All',
        status: 'PENDING,BOOKED' as any,
        paymentType: appliedSearch?.paymentType || 'All',
        searchQuery: '',
        itemType: 'All',
        minAmount: '',
        maxAmount: ''
    };

    return (
        <div className="space-y-3 pb-4">
            {/* Print View */}
            <div className="hidden print:block daily-report-print">
                <div className="mb-4">
                    <h1 className="text-2xl font-black text-black uppercase">Savan Transport</h1>
                    <p className="text-xs font-bold text-gray-500 uppercase">Godown Stock Report</p>
                </div>
                <SafePrintReportTable data={fullPrintData} dateRange={dateRangeStr} />
            </div>

            {/* ── AMBER THEME BANNER ── */}
            <div className="relative overflow-hidden print:hidden rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-500/20 p-3 mb-1 shadow-sm border-l-4 border-l-amber-500">
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="p-1 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                                <Warehouse className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-amber-500 dark:text-amber-400 text-[9px] font-black uppercase tracking-[0.2em]">Godown Stock</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Warehouse Inventory</h1>
                            {targetBranchName && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-md">
                                    {targetBranchName}
                                </span>
                            )}
                            {hasBranchControl && (
                                <div className="w-44">
                                    <BranchSelect
                                        value={selectedBranchId || currentUser?.branchId || ""}
                                        onSelect={setSelectedBranchId}
                                        placeholder="Select Godown..."
                                        scope="reports"
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium mt-0.5">Inbound parcels • Pending deliveries • Counter collection</p>
                    </div>
                    <ExportButtons data={[] as any} filters={exportFilters as any} onPrint={handlePrint} isPreparingPrint={isPreparingPrint} />
                </div>
            </div>

            {/* Filters */}
            <div className="print:hidden space-y-3">
                <ReportFilters
                    filters={filters}
                    setFilters={setFilters}
                    fromBranches={availableFromBranches as any}
                    toBranches={availableToBranches as any}
                    onApplyFilters={handleGetStock}
                    isLoading={isLoading}
                    actionLabel="Get Stock"
                />
            </div>

            {!appliedSearch ? (
                /* ── PLACEHOLDER (before first search) ── */
                <div className="print:hidden text-center py-20 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-500/20">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Warehouse className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Ready to view godown stock</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Configure your date range and branches above, then click <strong className="text-amber-500">Get Stock</strong> to fetch inbound parcels.</p>
                </div>
            ) : (
                <>
                    {/* ── STATS CARDS ── */}
                    {!isLoading && inboundStats.totalBookings > 0 && (
                        <div className="print:hidden">
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl shadow-lg shadow-amber-500/20">
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-4 translate-x-4"/>
                                    <p className="text-[9px] font-black text-amber-100 uppercase tracking-tighter">Revenue</p>
                                    <p className="text-lg font-black text-white mt-0.5">₹{inboundStats.totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Paid</p>
                                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">₹{inboundStats.paidAmount.toLocaleString()}</p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-200 dark:border-red-500/20 shadow-sm">
                                    <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-tighter">To Pay</p>
                                    <p className="text-lg font-black text-red-700 dark:text-red-300 mt-0.5">₹{inboundStats.toPayAmount.toLocaleString()}</p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 shadow-sm">
                                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Bookings</p>
                                    <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">{inboundStats.totalBookings}</p>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-500/10 p-3 rounded-xl border border-orange-200 dark:border-orange-500/20 shadow-sm">
                                    <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter">Parcels</p>
                                    <p className="text-lg font-black text-orange-700 dark:text-orange-300 mt-0.5">{inboundStats.totalQuantity}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TABLE SECTION ── */}
                    <div className="space-y-2 print:hidden">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Godown Stock</h3>
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1 rounded-lg">
                                {incomingParcels.length} ITEMS
                            </span>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-premium-border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                {/* Desktop Table */}
                                <table className="w-full text-left text-sm border-collapse hidden lg:table">
                                    <thead>
                                        <tr className="bg-premium-card/50 text-muted-foreground border-b border-premium-border">
                                            <th className="px-1 py-4 font-bold uppercase tracking-wider text-[10px] w-[40px] text-center">SR.</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[140px]">LR Number</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[120px]">Date & Time</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[120px]">From</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[120px]">To</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[150px]">Sender</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[150px]">Receiver</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[80px]">Value</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[80px]">Qty</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[100px]">Payment</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] w-[130px]">Status</th>
                                            <th className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-right w-[120px]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-premium-border">
                                        {incomingParcels.map((parcel, index) => (
                                            <tr key={parcel.id || index} className="hover:bg-slate-500/5 transition-colors group">
                                                <td className="px-1 py-4 text-[11px] font-bold text-slate-400 text-center">{index + 1}</td>
                                                <td className="px-4 py-4 text-sm font-mono font-black text-foreground">{parcel.lrNumber}</td>
                                                <td className="px-4 py-4 text-muted-foreground font-bold text-xs uppercase tracking-tighter">
                                                    {parcel.date || (parcel as any).createdAt ? <>
                                                        <div className="text-foreground">{new Date(parcel.date || (parcel as any).createdAt).toLocaleDateString('en-GB')}</div>
                                                        <div className="text-[10px] text-muted-foreground font-normal">{new Date(parcel.date || (parcel as any).createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </> : "-"}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground font-black text-[11px] uppercase tracking-tight">{parcel.fromBranch}</td>
                                                <td className="px-4 py-4 text-muted-foreground font-black text-[11px] uppercase tracking-tight">{parcel.toBranch}</td>
                                                <td className="px-4 py-4">
                                                    <div className="text-foreground font-bold text-xs">{parcel.senderName}</div>
                                                    {parcel.senderMobile && (
                                                        <div className="text-[10px] text-muted-foreground font-medium font-mono mt-0.5">
                                                            {parcel.senderMobile.slice(0, 3)}XXXX{parcel.senderMobile.slice(7)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-foreground font-bold text-xs">{parcel.receiverName}</div>
                                                    {parcel.receiverMobile && (
                                                        <div className="text-[10px] text-muted-foreground font-medium font-mono mt-0.5">
                                                            {parcel.receiverMobile.slice(0, 3)}XXXX{parcel.receiverMobile.slice(7)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-foreground font-black text-xs">₹{parcel.totalAmount?.toLocaleString() || parcel.rate?.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-foreground font-black text-[16px]">{parcel.quantity}</td>
                                                <td className="px-4 py-4">
                                                    <span className={cn(
                                                        "inline-flex px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter",
                                                        parcel.paymentStatus === "Paid"
                                                            ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                                            : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 shadow-sm border border-red-200 dark:border-red-500/20"
                                                    )}>
                                                        {parcel.paymentStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider",
                                                        parcel.status === "DELIVERED" ? "text-emerald-600" : (
                                                            parcel.status === "PENDING" ? "text-blue-600" : "text-teal-600"
                                                        )
                                                    )}>
                                                        {parcel.status === "DELIVERED" ? (
                                                            <CircleCheck className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Package className="w-3.5 h-3.5" />
                                                        )}
                                                        {parcel.status.toLowerCase()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(parcel.receiverMobile || parcel.senderMobile) && (
                                                            <button
                                                                onClick={() => openWhatsApp({
                                                                    mobile: parcel.receiverMobile || parcel.senderMobile || "",
                                                                    lrNumber: parcel.lrNumber,
                                                                    status: parcel.status,
                                                                    fromBranch: parcel.fromBranch,
                                                                    toBranch: parcel.toBranch,
                                                                    senderName: parcel.senderName || "-",
                                                                    receiverName: parcel.receiverName || "-",
                                                                    amount: parcel.totalAmount,
                                                                    paymentStatus: parcel.paymentStatus
                                                                }, addToast)}
                                                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors shadow-sm border border-emerald-500/20"
                                                                title="Send WhatsApp Notification"
                                                            >
                                                                <MessageCircle className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {parcel.status !== "DELIVERED" ? (
                                                            <button
                                                                onClick={() => handleActionClick(parcel)}
                                                                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:bg-slate-800"
                                                            >
                                                                Confirm Delivery
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                                Success
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Mobile Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 lg:hidden">
                                    {incomingParcels.map((parcel, index) => (
                                        <div key={parcel.id || index} className="bg-white/50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-premium-border shadow-sm flex flex-col gap-3 relative">
                                            <div className="flex justify-between items-start border-b border-premium-border pb-3">
                                                <div>
                                                    <div className="text-sm font-mono font-black text-foreground">{parcel.lrNumber}</div>
                                                    <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">{parcel.fromBranch} → {parcel.toBranch}</div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                        parcel.paymentStatus === "Paid"
                                                            ? "bg-emerald-500/10 text-emerald-500"
                                                            : "bg-red-500/10 text-red-500"
                                                    )}>
                                                        {parcel.paymentStatus}
                                                    </span>
                                                    <span className="text-sm font-black mt-0.5">₹{parcel.totalAmount?.toLocaleString() || parcel.rate?.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block mb-0.5 uppercase tracking-wide">Rec:</span>
                                                    <span className="font-bold">{parcel.receiverName}</span>
                                                    {parcel.receiverMobile && <span className="block text-[10px] font-mono text-muted-foreground">{parcel.receiverMobile}</span>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-muted-foreground block mb-0.5 uppercase tracking-wide">Qty:</span>
                                                    <span className="font-black text-base">{parcel.quantity}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2 border-t border-premium-border mt-auto">
                                                <button
                                                    onClick={() => openWhatsApp({
                                                        mobile: parcel.receiverMobile || parcel.senderMobile || "",
                                                        lrNumber: parcel.lrNumber,
                                                        status: parcel.status,
                                                        fromBranch: parcel.fromBranch,
                                                        toBranch: parcel.toBranch,
                                                        senderName: parcel.senderName || "-",
                                                        receiverName: parcel.receiverName || "-",
                                                        amount: parcel.totalAmount,
                                                        paymentStatus: parcel.paymentStatus
                                                    }, addToast)}
                                                    className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 active:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>

                                                {parcel.status !== "DELIVERED" ? (
                                                    <button
                                                        onClick={() => handleActionClick(parcel)}
                                                        className="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all bg-primary text-white shadow-lg active:scale-95"
                                                    >
                                                        Confirm Delivery
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center py-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                        <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1.5 uppercase tracking-widest">
                                                            <CircleCheck className="w-3.5 h-3.5" /> Delivered
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isLoading && (
                                <div className="p-12 text-center text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest text-xs animate-pulse flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Searching database...
                                </div>
                            )}

                            {!isLoading && incomingParcels.length === 0 && (
                                <div className="p-12 text-center text-muted-foreground font-medium italic">
                                    No parcels found in stock for the selected filters.
                                </div>
                            )}

                            {hasMore && (
                                <div className="p-4 bg-amber-50/50 dark:bg-amber-500/5 border-t border-premium-border flex justify-center">
                                    <Button
                                        onClick={() => setPage(prev => prev + 1)}
                                        disabled={isLoading}
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest px-8 shadow-md shadow-amber-500/20"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                LOADING...
                                            </>
                                        ) : (
                                            "LOAD MORE STOCK"
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {selectedParcel && (
                <ReceiveModal
                    parcel={selectedParcel}
                    isOpen={!!selectedParcel}
                    onClose={() => setSelectedParcel(null)}
                    onConfirm={handleConfirmAction}
                />
            )}
        </div>
    );
}
