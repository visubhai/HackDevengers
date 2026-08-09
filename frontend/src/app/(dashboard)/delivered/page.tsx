"use client";

import { useEffect, useState, useRef } from "react";

import { useBranchStore } from "@/frontend/lib/store";
import { useReports } from "@/frontend/hooks/useReports";
import { ReportFilters } from "@/frontend/components/reports/ReportFilters";
import { ReportTable } from "@/frontend/components/reports/ReportTable";
import { ExportButtons } from "@/frontend/components/reports/ExportButtons";
import { useSearchParams } from "next/navigation";
import { useBranches } from "@/frontend/hooks/useBranches";
import SafePrintReportTable from "@/frontend/components/reports/SafePrintReportTable";
import { generateReportPDF } from "@/frontend/lib/generateReportPDF";
import { adminService } from "@/super-admin/services/adminService";
import { useMemo } from "react";



import { PackageOpen } from "lucide-react";

const ReportSummary = ({ stats }: { stats: any }) => (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg shadow-emerald-500/20">
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-4 translate-x-4"/>
            <p className="text-[9px] font-black text-emerald-100 uppercase tracking-tighter">Revenue</p>
            <p className="text-lg font-black text-white mt-0.5">₹{(stats.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Paid</p>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">₹{(stats.paidAmount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-200 dark:border-red-500/20 shadow-sm">
            <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-tighter">To Pay</p>
            <p className="text-lg font-black text-red-700 dark:text-red-300 mt-0.5">₹{(stats.toPayAmount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-teal-50 dark:bg-teal-500/10 p-3 rounded-xl border border-teal-200 dark:border-teal-500/20 shadow-sm">
            <p className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-tighter">Deliveries</p>
            <p className="text-lg font-black text-teal-700 dark:text-teal-300 mt-0.5">{stats.totalBookings || 0}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-500/10 p-3 rounded-xl border border-green-200 dark:border-green-500/20 shadow-sm">
            <p className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-tighter">Parcels</p>
            <p className="text-lg font-black text-green-700 dark:text-green-300 mt-0.5">{stats.totalParcels || 0}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Cancelled</p>
            <p className="text-lg font-black text-slate-500 dark:text-slate-400 mt-0.5">{stats.cancelledCount || 0}</p>
        </div>
    </div>
);

export default function DeliveredPage() {
    const { currentUser } = useBranchStore();
    const { branchObjects: availableBranches } = useBranches('reports');
    const searchParams = useSearchParams();
    const lrFromUrl = searchParams.get('lrNumber');
    const autoEdit = searchParams.get('edit') === 'true';

    const [reportPermission, setReportPermission] = useState<any>(null);

    useEffect(() => {
        if (currentUser?.branchId) {
            adminService.getBranchPermissions(currentUser.branchId).then(res => {
                if (res.data) setReportPermission(res.data);
            });
        }
    }, [currentUser?.branchId]);

    const availableFromBranches = useMemo(() => {
        if (!availableBranches || availableBranches.length === 0) return [];
        let filtered = [...availableBranches].sort((a: any, b: any) => a.name.localeCompare(b.name));
        if (currentUser?.role !== 'SUPER_ADMIN') {
            if (!reportPermission?.allowedFromBranches) {
                filtered = filtered.filter((b: any) => b._id === currentUser?.branchId);
            } else {
                const allowedIds = reportPermission.allowedFromBranches.map((b: any) => typeof b === 'string' ? b : b._id);
                filtered = allowedIds.map((id: string) => availableBranches.find((b: any) => b._id === id)).filter(Boolean);
            }
        }
        return filtered.map((b: any) => ({ id: b._id || b.id, name: b.name }));
    }, [availableBranches, reportPermission, currentUser]);

    const availableToBranches = useMemo(() => {
        if (!availableBranches || availableBranches.length === 0) return [];
        let filtered = [...availableBranches].sort((a: any, b: any) => a.name.localeCompare(b.name));
        if (currentUser?.role !== 'SUPER_ADMIN') {
            if (!reportPermission?.allowedToBranches) {
                filtered = filtered.filter((b: any) => b._id === currentUser?.branchId);
            } else {
                const allowedIds = reportPermission.allowedToBranches.map((b: any) => typeof b === 'string' ? b : b._id);
                filtered = allowedIds.map((id: string) => availableBranches.find((b: any) => b._id === id)).filter(Boolean);
            }
        }
        return filtered.map((b: any) => ({ id: b._id || b.id, name: b.name }));
    }, [availableBranches, reportPermission, currentUser]);

    // Force hook to load only DELIVERED
    const {
        data,
        filters,
        setFilters,
        stats,
        currentPage, totalPages, rowsPerPage, totalItems,
        sortConfig, handleSort, mutate, isLoading,
        applyFilters, isFilterApplied, fetchAllFilteredData,
        loadMore, hasMore
    } = useReports('DELIVERED');

    const [fullPrintData, setFullPrintData] = useState<any[]>([]);
    const [isPreparingPrint, setIsPreparingPrint] = useState(false);
    const printContainerRef = useRef<HTMLDivElement>(null);
    const pendingMobilePdf = useRef(false);

    useEffect(() => {
        if (!pendingMobilePdf.current || fullPrintData.length === 0) return;
        pendingMobilePdf.current = false;
        const el = printContainerRef.current;
        if (!el) { setIsPreparingPrint(false); return; }
        const dateLabel = filters.startDate === filters.endDate
            ? filters.startDate
            : `${filters.startDate}_${filters.endDate}`;
        setTimeout(() => {
            generateReportPDF(el, `delivered-${dateLabel}`)
                .catch(err => console.error('PDF error:', err))
                .finally(() => setIsPreparingPrint(false));
        }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullPrintData]);

    const handlePrint = async () => {
        if (!isFilterApplied) return;
        setIsPreparingPrint(true);
        try {
            const allRows = await fetchAllFilteredData();
            const isMobile = window.innerWidth < 768;
            if (isMobile) {
                pendingMobilePdf.current = true;
                setFullPrintData(allRows);
            } else {
                setFullPrintData(allRows);
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
            }
        } catch (error) {
            console.error("Print fetch failed:", error);
            setIsPreparingPrint(false);
        }
    };



    // Sync search from URL
    useEffect(() => {
        if (lrFromUrl && filters.searchQuery !== lrFromUrl) {
            setFilters(prev => ({ ...prev, searchQuery: lrFromUrl }));
        }
    }, [lrFromUrl, setFilters, filters.searchQuery]);

    // Permission check
    const isHirabagh = currentUser?.branch === 'hirabagh';
    const isBapunagar = currentUser?.branch === 'bapunagar';

    // UI flags
    const isBranchRestricted = currentUser?.role !== 'SUPER_ADMIN' && !isHirabagh && !isBapunagar;

    const formatDate = (d: string | Date | undefined) => {
        if (!d) return new Date().toLocaleDateString('en-GB');
        return new Date(d).toLocaleDateString('en-GB');
    };

    const dateRangeStr = `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`;

    return (
        <div className="max-w-[1600px] mx-auto p-4 space-y-3 pb-20">
            {/* Desktop: shown only in print media */}
            <div className="hidden print:block daily-report-print">
                <div className="mb-4">
                    <h1 className="text-2xl font-black text-black uppercase">LogiOpen Transport</h1>
                    <p className="text-xs font-bold text-gray-500 uppercase">Delivered Parcels Log</p>
                </div>
                <SafePrintReportTable data={fullPrintData} dateRange={dateRangeStr} />
            </div>

            {/* Mobile PDF capture container — invisible but fully rendered so html2canvas can capture it */}
            <div
                ref={printContainerRef}
                className="print:hidden"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1640px',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -1,
                    background: '#ffffff',
                    padding: '12px',
                    fontFamily: 'sans-serif',
                    overflow: 'visible',
                }}
                aria-hidden="true"
            >
                {fullPrintData.length > 0 && (
                    <>
                        <div style={{ marginBottom: '6px', borderBottom: '3px solid black', paddingBottom: '4px' }}>
                            <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#000', textTransform: 'uppercase', margin: 0 }}>LogiOpen Transport</h1>
                            <p style={{ fontSize: '18px', fontWeight: 700, color: '#555', textTransform: 'uppercase', margin: 0 }}>Delivered Parcels Log</p>
                        </div>
                        <SafePrintReportTable data={fullPrintData} dateRange={dateRangeStr} />
                    </>
                )}
            </div>

            {/* ── EMERALD THEME BANNER ── */}
            <div className="relative overflow-hidden print:hidden rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-500/20 p-3 mb-1 shadow-sm border-l-4 border-l-emerald-500">
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="p-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <span className="text-emerald-500 dark:text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em]">Delivery Report</span>
                        </div>
                        <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Delivered Parcels</h1>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium mt-0.5">Successful deliveries • Collection tracking • Receiver analytics</p>
                    </div>
                    <ExportButtons data={data} filters={filters} onPrint={handlePrint} isPreparingPrint={isPreparingPrint} />
                </div>
            </div>

            <div className="print:hidden space-y-3">
                <ReportFilters
                    filters={filters}
                    setFilters={setFilters}
                    fromBranches={availableFromBranches as any}
                    toBranches={availableToBranches as any}
                    isBranchRestricted={isBranchRestricted}
                    userBranch={currentUser?.branch}
                    onApplyFilters={applyFilters}
                />
            </div>

            {!isFilterApplied ? (
                <div className="print:hidden text-center py-20 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-500/20">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <PackageOpen className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Ready to compile delivered report</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Configure your date range and branches above, then click <strong className="text-emerald-500">Get Report</strong> to fetch delivered records.</p>
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="print:hidden">
                        <ReportSummary stats={stats} />
                    </div>

                    {/* Data Table */}
                    <div className="space-y-2 print:hidden">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Delivered Shipments</h3>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-lg">
                                {totalItems} DELIVERIES
                            </span>
                        </div>
                        <ReportTable
                            data={data}
                            isLoading={isLoading}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            rowsPerPage={rowsPerPage}
                            totalItems={totalItems}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            loadMore={loadMore}
                            hasMore={hasMore}
                            mutate={mutate}
                            autoOpenLr={autoEdit ? lrFromUrl : null}
                        />
                    </div>
                </>
            )}

        </div>
    );
}
