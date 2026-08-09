"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from "recharts";
import DateRangePicker from "../DateRangePicker";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, BranchData, BranchRanking } from "@/frontend/services/advancedAnalyticsService";
import { cn } from "@/frontend/lib/utils";

const BRANCH_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type SortKey = 'revenue' | 'volume' | 'avgValue' | 'deliveryRate';

export default function BranchPerformanceTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 29 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [data, setData] = useState<BranchData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('revenue');
    const [sortAsc, setSortAsc] = useState(false);
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const branchIdsParam = selectedBranches.length > 0 ? selectedBranches.join(',') : undefined;
        const { data: result, error: err } = await advancedAnalyticsService.getBranches(startDate, endDate, branchIdsParam);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate, selectedBranches]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(false); }
    };

    const toggleBranch = (id: string) => {
        setSelectedBranches(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : prev.length < 5 ? [...prev, id] : prev
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Branch Data...</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800"><p>{error || "Unknown error"}</p></div>;
    }

    const sorted = [...data.branches]
        .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const diff = (a[sortKey] as number) - (b[sortKey] as number);
            return sortAsc ? diff : -diff;
        });

    const topBranches = sorted.slice(0, 10);
    const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
        <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort(field)}>
            <span className="flex items-center gap-1">
                {label}
                <ArrowUpDown className={cn("w-3 h-3", sortKey === field ? "text-blue-400" : "opacity-30")} />
            </span>
        </th>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

            {/* Branch Ranking Table */}
            <ChartWrapper title="Branch Ranking" subtitle={`${data.branches.length} branches`} onRefresh={fetchData}>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search branches..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-muted/50 border border-premium-border rounded-lg px-3 py-2 text-sm font-medium text-foreground w-full max-w-xs placeholder:text-muted-foreground/50"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border">
                                <th className="px-3 py-3 text-left">#</th>
                                <th className="px-3 py-3 text-left">Branch</th>
                                <SortHeader label="Revenue" field="revenue" />
                                <SortHeader label="Volume" field="volume" />
                                <SortHeader label="Avg Value" field="avgValue" />
                                <SortHeader label="Delivery %" field="deliveryRate" />
                                <th className="px-3 py-3 text-left text-[10px] font-black text-muted-foreground tracking-widest uppercase">Share %</th>
                                <th className="px-3 py-3 text-left">Compare</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((b, i) => (
                                <tr key={b.branchId} className="border-b border-premium-border/30 hover:bg-muted/20 transition-colors">
                                    <td className="px-3 py-3 text-muted-foreground font-bold">{i + 1}</td>
                                    <td className="px-3 py-3 font-bold text-foreground">{b.name}</td>
                                    <td className="px-3 py-3 font-black text-foreground">₹{(b.revenue || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-3 font-bold">{(b.volume || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-3 font-bold">₹{(b.avgValue || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-3">
                                        <span className={cn(
                                            "text-xs font-black px-2 py-0.5 rounded",
                                            (b.deliveryRate || 0) >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                                            (b.deliveryRate || 0) >= 50 ? "bg-amber-500/20 text-amber-400" :
                                            "bg-red-500/20 text-red-400"
                                        )}>
                                            {(b.deliveryRate || 0).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-xs font-bold text-muted-foreground">{(b.marketShare || 0).toFixed(1)}%</td>
                                    <td className="px-3 py-3">
                                        <button
                                            onClick={() => toggleBranch(b.branchId)}
                                            className={cn(
                                                "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                                                selectedBranches.includes(b.branchId)
                                                    ? "bg-blue-500 border-blue-500 text-white"
                                                    : "border-slate-300 dark:border-slate-600"
                                            )}
                                        >
                                            {selectedBranches.includes(b.branchId) && <span className="text-xs">✓</span>}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartWrapper>

            {/* Top Branches Bar Chart */}
            <ChartWrapper title="Top Branches by Revenue">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topBranches} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v}`} />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} width={120} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                            <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartWrapper>

            {/* Branch Trend Comparison */}
            {data.branchTrends.length > 0 && (
                <ChartWrapper title="Branch Trend Comparison" subtitle="Selected branches revenue over time">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="date" type="category" allowDuplicatedCategory={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                {data.branchTrends.map((bt, i) => (
                                    <Line
                                        key={bt.branchId}
                                        data={bt.data}
                                        dataKey="revenue"
                                        name={bt.name}
                                        stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            )}
        </div>
    );
}
