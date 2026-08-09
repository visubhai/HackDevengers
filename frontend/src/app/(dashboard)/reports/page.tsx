"use client";

import { useEffect, useState, useMemo, memo, useRef } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { useReports } from "@/frontend/hooks/useReports";
import { ReportFilters } from "@/frontend/components/reports/ReportFilters";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useBranches } from "@/frontend/hooks/useBranches";
import { adminService } from "@/super-admin/services/adminService";

import { ReportTable } from "@/frontend/components/reports/ReportTable";
import SafePrintReportTable from "@/frontend/components/reports/SafePrintReportTable";
import { generateReportPDF } from "@/frontend/lib/generateReportPDF";

const ExportButtons = dynamic(() => import("@/frontend/components/reports/ExportButtons").then(mod => mod.ExportButtons), { ssr: false });

const ReportSummary = memo(({ stats }: { stats: any }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-500/20">
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-4 translate-x-4"/>
            <p className="text-[9px] font-black text-indigo-100 uppercase tracking-tighter">Revenue</p>
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
        <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-xl border border-blue-200 dark:border-blue-500/20 shadow-sm">
            <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Bookings</p>
            <p className="text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5">{stats.totalBookings || 0}</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-500/10 p-3 rounded-xl border border-violet-200 dark:border-violet-500/20 shadow-sm">
            <p className="text-[9px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-tighter">Parcels</p>
            <p className="text-lg font-black text-violet-700 dark:text-violet-300 mt-0.5">{stats.totalParcels || 0}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Cancelled</p>
            <p className="text-lg font-black text-slate-500 dark:text-slate-400 mt-0.5">{stats.cancelledCount || 0}</p>
        </div>
    </div>
));

ReportSummary.displayName = "ReportSummary";

const ReportsPage = memo(() => {
    const { currentUser } = useBranchStore();
    const { branchObjects: allBranches } = useBranches();
    const [reportPermission, setReportPermission] = useState<any>(null);
    const searchParams = useSearchParams();
    const lrFromUrl = searchParams.get('lrNumber');
    const autoEdit = searchParams.get('edit') === 'true';

    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const isBranchRestricted = !isSuperAdmin;

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

    const fromBranchIds = useMemo(() => availableFromBranches.map(b => b.id), [availableFromBranches]);
    const toBranchIds = useMemo(() => availableToBranches.map(b => b.id), [availableToBranches]);

    const {
        data,
        filters,
        setFilters,
        stats,
        currentPage, totalPages, rowsPerPage, totalItems,
        sortConfig, handleSort, mutate, isLoading,
        applyFilters, isFilterApplied, fetchAllFilteredData,
        loadMore, hasMore
    } = useReports('All', isSuperAdmin ? undefined : fromBranchIds, isSuperAdmin ? undefined : toBranchIds);

    const [fullPrintData, setFullPrintData] = useState<any[]>([]);
    const [isPreparingPrint, setIsPreparingPrint] = useState(false);
    const printContainerRef = useRef<HTMLDivElement>(null);
    const pendingMobilePdf = useRef(false);

    // Triggered after fullPrintData renders into the off-screen container
    useEffect(() => {
        if (!pendingMobilePdf.current || fullPrintData.length === 0) return;
        pendingMobilePdf.current = false;
        const el = printContainerRef.current;
        if (!el) { setIsPreparingPrint(false); return; }
        const dateLabel = filters.startDate === filters.endDate
            ? filters.startDate
            : `${filters.startDate}_${filters.endDate}`;
        // 300ms delay lets React fully paint the table before html2canvas reads the DOM
        setTimeout(() => {
            generateReportPDF(el, `manifest-${dateLabel}`)
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
                // useEffect fires after React re-renders the off-screen container
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

    useEffect(() => {
        if (lrFromUrl && filters.searchQuery !== lrFromUrl) {
            setFilters((prev: any) => ({ ...prev, searchQuery: lrFromUrl }));
        }
    }, [lrFromUrl, setFilters, filters.searchQuery]);

    const formatDate = (d: string | Date | undefined) => {
        if (!d) return '';
        // If it's a YYYY-MM-DD string, split and reverse it to avoid timezone issues
        if (typeof d === 'string' && d.includes('-')) {
            const parts = d.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        const dateObj = typeof d === 'string' ? new Date(d) : d;
        if (isNaN(dateObj.getTime())) return d.toString();
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const dateRangeStr = `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`;

    return (
        <div className="max-w-[1900px] mx-auto p-2 lg:p-4 space-y-3 pb-20 print:max-w-none print:mx-0 print:p-0 overflow-x-hidden">
            {/* Desktop: shown only in print media */}
            <div className="hidden print:block daily-report-print">
                <div className="mb-4">
                    <h1 className="text-2xl font-black text-black uppercase">Savan Transport</h1>
                    <p className="text-xs font-bold text-gray-500 uppercase">Daily Manifest Report</p>
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
                            <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#000', textTransform: 'uppercase', margin: 0 }}>Savan Transport</h1>
                            <p style={{ fontSize: '18px', fontWeight: 700, color: '#555', textTransform: 'uppercase', margin: 0 }}>Daily Manifest Report</p>
                        </div>
                        <SafePrintReportTable data={fullPrintData} dateRange={dateRangeStr} />
                    </>
                )}
            </div>

            {/* ── INDIGO THEME BANNER ── */}
            <div className="relative overflow-hidden print:hidden rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-500/20 p-3 mb-1 shadow-sm border-l-4 border-l-indigo-500">
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="p-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <span className="text-indigo-500 dark:text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">Parcel Report</span>
                        </div>
                        <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Enterprise Analytics</h1>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium mt-0.5">Full booking history • Revenue tracking • Branch analysis</p>
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
                <div className="print:hidden text-center py-20 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-500/20">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Ready to compile report</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Configure your date range and branches above, then click <strong className="text-indigo-500">Get Report</strong> to fetch records.</p>
                </div>
            ) : (
                <>
                    <div className="print:hidden">
                        <ReportSummary stats={stats} />
                    </div>
                    <div className="space-y-2 print:hidden">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Transaction Log</h3>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1 rounded-lg">
                                {totalItems} RECORDS
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
});

ReportsPage.displayName = "ReportsPage";
export default ReportsPage;
