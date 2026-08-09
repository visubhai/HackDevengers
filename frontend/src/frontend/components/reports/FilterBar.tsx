import { Calendar, Filter, ChevronDown } from "lucide-react";
import { Branch } from "@/shared/types";
import { cn, getLocalDateString } from "@/frontend/lib/utils";


interface FilterBarProps {
    fromBranch: Branch | "All";
    toBranch: Branch | "All";
    startDate: string;
    endDate: string;
    onFromBranchChange: (b: Branch | "All") => void;
    onToBranchChange: (b: Branch | "All") => void;
    onDateRangeChange: (start: string, end: string) => void;
    isBranchRestricted?: boolean;
    availableBranches?: Branch[];
}

export function FilterBar({ fromBranch, toBranch, startDate, endDate, onFromBranchChange, onToBranchChange, onDateRangeChange, isBranchRestricted, availableBranches }: FilterBarProps) {

    const applyQuickRange = (range: 'today' | 'week' | 'month') => {
        const today = new Date();
        const end = getLocalDateString(today);
        let start = end;

        if (range === 'week') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = getLocalDateString(d);
        } else if (range === 'month') {
            const d = new Date();
            d.setDate(1); // Start of month
            start = getLocalDateString(d);
        }

        onDateRangeChange(start, end);
    };


    const branchOptions = availableBranches || ["Branch A", "Branch B"];

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 pb-2">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                <Filter className="w-4 h-4" /> Advanced Filters
            </div>

            <div className="flex flex-col xl:flex-row gap-6">

                {/* Date Range Section */}
                <div className="flex flex-col gap-2 xl:w-auto w-full">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Date Range</label>
                    <div className="flex flex-col sm:flex-row gap-3 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div className="relative w-full sm:w-auto">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">FROM</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => onDateRangeChange(e.target.value, endDate)}
                                className="pl-12 pr-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white w-full sm:w-40"
                            />
                        </div>
                        <span className="text-slate-400 font-bold hidden sm:inline">→</span>
                        <div className="relative w-full sm:w-auto">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">TO</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => onDateRangeChange(startDate, e.target.value)}
                                min={startDate}
                                className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white w-full sm:w-40"
                            />
                        </div>

                        {/* Quick Selects */}
                        <div className="flex gap-1 w-full sm:w-auto justify-end">
                            <button onClick={() => applyQuickRange('today')} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">Today</button>
                            <button onClick={() => applyQuickRange('week')} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">Week</button>
                            <button onClick={() => applyQuickRange('month')} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">Month</button>
                        </div>
                    </div>
                </div>

                {/* Branch Filters */}
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Dispatch Branch</label>
                        <div className="relative">
                            <select
                                value={fromBranch}
                                disabled={isBranchRestricted}
                                onChange={(e) => onFromBranchChange(e.target.value as Branch | "All")}
                                className={cn(
                                    "w-full pl-3 pr-8 py-2.5 rounded-xl border text-sm font-bold appearance-none transition-colors",
                                    isBranchRestricted
                                        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                        : "bg-white border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                )}
                            >
                                <option value="All">All Branches</option>
                                {branchOptions.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Dest. Branch</label>
                        <div className="relative">
                            <select
                                value={toBranch}
                                onChange={(e) => onToBranchChange(e.target.value as Branch | "All")}
                                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white appearance-none"
                            >
                                <option value="All">All Branches</option>
                                {branchOptions.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
