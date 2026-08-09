import { FilterState } from "@/frontend/hooks/useReports";
import { Branch, PaymentStatus, ParcelStatus } from "@/shared/types";
import { Search, Calendar, Filter, X, MapPin, Navigation, Tag, CreditCard, RefreshCcw } from "lucide-react";
import { cn, getLocalDateString } from "@/frontend/lib/utils";

import { MultiSelect, Option } from "@/frontend/components/ui/multi-select-dropdown";
import { useBranchStore } from "@/frontend/lib/store";

interface ReportFiltersProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    fromBranches: any[];
    toBranches: any[];
    isBranchRestricted?: boolean;
    userBranch?: string;
    onApplyFilters?: (manualFilters?: FilterState) => void;
    isLoading?: boolean;
    actionLabel?: string;
}

export function ReportFilters({ filters, setFilters, fromBranches, toBranches, isBranchRestricted, userBranch, onApplyFilters, isLoading, actionLabel = 'Get Report' }: ReportFiltersProps) {
    const { currentUser } = useBranchStore();

    const allowedReports = currentUser?.allowedReports || [];
    const hasPaymentAccess = currentUser?.role === 'SUPER_ADMIN' || allowedReports.includes('Payment');

    // Helper to Convert String "A,B" to Array ["A", "B"]
    const toArray = (val: string | string[]) => {
        if (Array.isArray(val)) return val;
        if (!val || val === 'All') return [];
        return val.split(',');
    };

    const fromBranchOptions: Option[] = (fromBranches || []).map(b => ({
        label: b && typeof b === 'object' ? b.name || b.id || "" : String(b || ""),
        value: b && typeof b === 'object' ? b.id || b._id : String(b || "")
    }));
    const toBranchOptions: Option[] = (toBranches || []).map(b => ({
        label: b && typeof b === 'object' ? b.name || b.id || "" : String(b || ""),
        value: b && typeof b === 'object' ? b.id || b._id : String(b || "")
    }));

    const handleMultiChange = (key: 'fromBranch' | 'toBranch', selected: string[]) => {
        setFilters(prev => {
            const newVal = selected.length > 0 ? selected.join(',') : 'All';
            return { ...prev, [key]: newVal };
        });
    };

    const handleChange = (key: keyof FilterState, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            return newFilters;
        });
    };

    const handleQuickDate = (daysAgo: number) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const dateStr = getLocalDateString(date);
        const newFilters = {
            ...filters,
            startDate: dateStr,
            endDate: dateStr
        };
        setFilters(newFilters);
        if (onApplyFilters) onApplyFilters(newFilters);
    };


    const clearFilters = () => {
        const resetFilters: FilterState = {
            ...filters,
            searchQuery: '',
            paymentType: 'All',
            itemType: 'All',
            minAmount: '',
            maxAmount: '',
            startDate: getLocalDateString(),
            endDate: getLocalDateString(),
            fromBranch: 'All',
            toBranch: 'All'
        };
        setFilters(resetFilters);
        if (onApplyFilters) onApplyFilters(resetFilters);
    };

    return (
        <div className="bg-premium-card p-2 rounded-xl border border-premium-border shadow-soft space-y-2 sticky top-0 z-30 bg-white dark:bg-slate-900">
            <div className="flex flex-col lg:flex-row gap-2 items-end">

                {/* Search Bar */}
                <div className="flex-1 relative">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Search Record</span>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by LR No, Sender/Receiver name, or Mobile..."
                            value={filters.searchQuery}
                            onChange={(e) => handleChange('searchQuery', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 sm:py-1.5 bg-background border border-premium-border rounded-lg text-base sm:text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30 text-foreground"
                        />
                    </div>
                </div>

                {/* Quick Date Menu */}
                <div className="flex flex-col gap-1 w-full md:w-auto md:min-w-[280px]">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Quick Reports</span>
                    <div className="flex items-center gap-1 p-0.5 bg-muted/30 rounded-lg border border-premium-border">
                        <button
                            onClick={() => handleQuickDate(0)}
                            className={cn(
                                "flex-1 px-2 py-2 sm:py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all",
                                (filters.startDate === filters.endDate && filters.startDate === getLocalDateString())
                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => handleQuickDate(1)}
                            className={cn(
                                "flex-1 px-2 py-2 sm:py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all",
                                (filters.startDate === filters.endDate && filters.startDate === getLocalDateString(new Date(Date.now() - 86400000)))
                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Yesterday
                        </button>
                        <button
                            onClick={() => handleQuickDate(2)}
                            className={cn(
                                "flex-1 px-2 py-2 sm:py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all",
                                (filters.startDate === filters.endDate && filters.startDate === getLocalDateString(new Date(Date.now() - 172800000)))
                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Ereyesterday
                        </button>
                    </div>
                </div>

                {/* Date Range */}
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Custom Period</span>
                    <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-premium-border w-full md:w-auto">
                        <div className="relative flex-1 min-w-0 md:flex-initial">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase">From</span>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                                max={filters.endDate}
                                className="pl-11 pr-1 py-1 bg-transparent text-[11px] font-black text-foreground outline-none w-full md:w-36 min-w-0 transition-all"
                            />
                        </div>
                        <span className="text-muted-foreground/30">|</span>
                        <div className="relative flex-1 min-w-0 md:flex-initial">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase">To</span>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleChange('endDate', e.target.value)}
                                min={filters.startDate}
                                className="pl-7 pr-1 py-1 bg-transparent text-[11px] font-black text-foreground outline-none w-full md:w-32 min-w-0 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Filters — stacked on mobile so each dropdown gets full width to select properly, side-by-side from tablet up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full">

                {/* From Branch Dropdown */}
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1 tracking-tighter">
                        <MapPin className="w-3 h-3 text-blue-500" /> Origin Branch
                    </span>
                    <MultiSelect
                        options={fromBranchOptions}
                        selected={toArray(filters.fromBranch || 'All')}
                        onChange={(selected) => handleMultiChange('fromBranch', selected)}
                        placeholder="Select Origins..."
                        className="min-h-[44px] border-premium-border hover:border-blue-400 focus:ring-blue-500/20 shadow-sm transition-all"
                    />
                </div>

                {/* To Branch Dropdown */}
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1 tracking-tighter">
                        <Navigation className="w-3 h-3 text-purple-500" /> Dest. Branch
                    </span>
                    <MultiSelect
                        options={toBranchOptions}
                        selected={toArray(filters.toBranch || 'All')}
                        onChange={(selected) => handleMultiChange('toBranch', selected)}
                        placeholder="Select Destinations..."
                        className="min-h-[44px] border-premium-border hover:border-purple-400 focus:ring-purple-500/20 shadow-sm transition-all"
                    />
                </div>
            </div>

            {/* Payment + Desktop Action Buttons row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">

                {/* Payment Dropdown */}
                {hasPaymentAccess && (
                    <div className="flex flex-col w-full md:w-auto md:min-w-[140px] md:max-w-[160px]">
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1 tracking-tighter">
                            <CreditCard className="w-3 h-3 text-emerald-500" /> Payment
                        </span>
                        <select
                            value={filters.paymentType}
                            onChange={(e) => handleChange('paymentType', e.target.value)}
                            className="w-full min-h-[40px] bg-background border border-premium-border rounded-lg px-2 text-xs font-medium outline-none transition-all shadow-sm text-foreground appearance-none"
                        >
                            <option value="All">All Payments</option>
                            <option value="Paid">Paid</option>
                            <option value="To Pay">To Pay</option>
                        </select>
                    </div>
                )}


                {/* Action Buttons — inline on desktop */}
                <div className="hidden md:flex md:w-auto md:ml-auto items-center justify-end gap-2">
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors border border-dashed border-transparent hover:border-red-500/20"
                    >
                        <X className="w-3 h-3" />
                        Reset
                    </button>
                    {onApplyFilters && (
                        <button
                            onClick={() => onApplyFilters()}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                        >
                            {isLoading ? (
                                <RefreshCcw className="w-3 h-3 animate-spin" />
                            ) : (
                                <Search className="w-3 h-3" />
                            )}
                            {isLoading ? 'Fetching...' : actionLabel}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile-only: full-width prominent Get Report button */}
            <div className="flex md:hidden items-center gap-2 mt-2 pt-2 border-t border-premium-border">
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2.5 text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors border border-dashed border-muted-foreground/20 hover:border-red-500/30 shrink-0"
                >
                    <X className="w-3.5 h-3.5" />
                    Reset
                </button>
                {onApplyFilters && (
                    <button
                        onClick={() => onApplyFilters()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/30 transition-all"
                    >
                        <Search className="w-4 h-4" />
                        {actionLabel}
                    </button>
                )}
            </div>

        </div>
    );
}
