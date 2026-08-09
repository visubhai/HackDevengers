"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    IndianRupee, TrendingUp, TrendingDown, CalendarDays,
    ArrowRight, Trophy, AlertTriangle
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, Legend, LineChart, Cell
} from "recharts";
import DateRangePicker from "../DateRangePicker";
import KPICard from "../KPICard";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, ComparisonData, ComparisonBranchTrend, ComparisonRouteTrend } from "@/frontend/services/advancedAnalyticsService";
import { cn } from "@/frontend/lib/utils";

const TREND_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type ViewMode = 'daily' | 'weekly';

function pivotBranchTrend(trends: ComparisonBranchTrend[], top = 5) {
    const sliced = trends.slice(0, top);
    const dateMap = new Map<string, Record<string, any>>();
    sliced.forEach(branch => {
        branch.data.forEach(pt => {
            const existing = dateMap.get(pt.date) || { date: pt.date };
            existing[branch.name] = pt.revenue;
            dateMap.set(pt.date, existing);
        });
    });
    const data = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    data.forEach(d => {
        const dt = new Date(d.date + 'T00:00:00');
        d.displayDate = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    return { data, names: sliced.map(t => t.name) };
}

function pivotRouteTrend(trends: ComparisonRouteTrend[], top = 5) {
    const sliced = trends.slice(0, top);
    const dateMap = new Map<string, Record<string, any>>();
    sliced.forEach(route => {
        route.data.forEach(pt => {
            const existing = dateMap.get(pt.date) || { date: pt.date };
            existing[route.routeLabel] = pt.revenue;
            dateMap.set(pt.date, existing);
        });
    });
    const data = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    data.forEach(d => {
        const dt = new Date(d.date + 'T00:00:00');
        d.displayDate = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    return { data, names: sliced.map(t => t.routeLabel) };
}

function GrowthBadge({ value }: { value: number }) {
    const isPositive = value >= 0;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full",
            isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
        )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{(value || 0).toFixed(1)}%
        </span>
    );
}

export default function ComparisonTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 29 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [data, setData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('daily');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await advancedAnalyticsService.getComparison(startDate, endDate);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const bookingPivot = useMemo(() => data ? pivotBranchTrend(data.bookingBranchTrend) : { data: [], names: [] }, [data]);
    const destPivot = useMemo(() => data ? pivotBranchTrend(data.destinationBranchTrend) : { data: [], names: [] }, [data]);
    const routePivot = useMemo(() => data ? pivotRouteTrend(data.routeTrend) : { data: [], names: [] }, [data]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Comparison Data...</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800"><p>{error || "Unknown error"}</p></div>;
    }

    const { kpis } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <KPICard title="Total Revenue" subtitle="All charges excl. cancelled" value={kpis.totalRevenue} prefix="₹" icon={IndianRupee} color="emerald" />
                <KPICard title="Daily Avg Revenue" subtitle="Total revenue / number of days" value={kpis.avgDailyRevenue} prefix="₹" icon={CalendarDays} color="blue" />
                <KPICard
                    title="Day-over-Day"
                    subtitle="Latest day vs previous day"
                    value={`${kpis.dodGrowth >= 0 ? '+' : ''}${(kpis.dodGrowth || 0).toFixed(1)}%`}
                    icon={kpis.dodGrowth >= 0 ? TrendingUp : TrendingDown}
                    color={kpis.dodGrowth >= 0 ? "emerald" : "red"}
                />
                <KPICard
                    title="Week-over-Week"
                    subtitle="Latest week vs previous week"
                    value={`${kpis.wowGrowth >= 0 ? '+' : ''}${(kpis.wowGrowth || 0).toFixed(1)}%`}
                    icon={kpis.wowGrowth >= 0 ? TrendingUp : TrendingDown}
                    color={kpis.wowGrowth >= 0 ? "emerald" : "red"}
                />
                <KPICard title="Best Day" subtitle="Highest revenue day in period" value={kpis.bestDay?.revenue || 0} prefix="₹" icon={Trophy} color="emerald" suffix={` (${kpis.bestDay?.date || 'N/A'})`} />
                <KPICard title="Worst Day" subtitle="Lowest revenue day in period" value={kpis.worstDay?.revenue || 0} prefix="₹" icon={AlertTriangle} color="red" suffix={` (${kpis.worstDay?.date || 'N/A'})`} />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">View:</span>
                {(['daily', 'weekly'] as ViewMode[]).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            viewMode === mode
                                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {mode === 'daily' ? 'Day-by-Day' : 'Week-by-Week'}
                    </button>
                ))}
            </div>

            {/* Daily Revenue Trend */}
            {viewMode === 'daily' && (
                <ChartWrapper title="Day-over-Day Revenue" subtitle="Daily revenue with growth % compared to previous day" onRefresh={fetchData}>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                <YAxis yAxisId="rev" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${(v || 0).toLocaleString('en-IN')}`} />
                                <YAxis yAxisId="growth" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any, name: any) => [name === 'Growth %' ? `${v}%` : `₹${v.toLocaleString('en-IN')}`, name]} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar yAxisId="rev" dataKey="revenue" radius={[4, 4, 0, 0]} barSize={18} name="Revenue">
                                    {data.dailyRevenue.map((d, i) => (
                                        <Cell key={i} fill={d.growth >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.7} />
                                    ))}
                                </Bar>
                                <Line yAxisId="growth" type="monotone" dataKey="growth" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Growth %" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            )}

            {/* Weekly Revenue Trend */}
            {viewMode === 'weekly' && (
                <ChartWrapper title="Week-over-Week Revenue" subtitle="Weekly revenue with growth % compared to previous week" onRefresh={fetchData}>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.weeklyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                <YAxis yAxisId="rev" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${(v || 0).toLocaleString('en-IN')}`} />
                                <YAxis yAxisId="growth" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any, name: any) => [name === 'Growth %' ? `${v}%` : `₹${v.toLocaleString('en-IN')}`, name]} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar yAxisId="rev" dataKey="revenue" radius={[6, 6, 0, 0]} barSize={40} name="Revenue">
                                    {data.weeklyRevenue.map((w, i) => (
                                        <Cell key={i} fill={w.growth >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.75} />
                                    ))}
                                </Bar>
                                <Line yAxisId="growth" type="monotone" dataKey="growth" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} name="Growth %" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            )}

            {/* ── Booking Branch Revenue ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWrapper title="Booking Branch Revenue" subtitle="Revenue by source/sender branch">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.bookingBranchRevenue.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${(v || 0).toLocaleString('en-IN')}`} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} width={90} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>

                <ChartWrapper title="Booking Branch Trend" subtitle="Top 5 source branches — daily revenue">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={bookingPivot.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${(v || 0).toLocaleString('en-IN')}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${(v || 0).toLocaleString('en-IN')}`, '']} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                {bookingPivot.names.map((name, i) => (
                                    <Line key={name} type="monotone" dataKey={name} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={false} connectNulls name={name} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            </div>

            {/* ── Destination Branch Revenue ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWrapper title="Destination Branch Revenue" subtitle="Revenue by receiving/destination branch">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.destinationBranchRevenue.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${(v || 0).toLocaleString('en-IN')}`} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} width={90} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>

                <ChartWrapper title="Destination Branch Trend" subtitle="Top 5 destination branches — daily revenue">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={destPivot.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${(v || 0).toLocaleString('en-IN')}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${(v || 0).toLocaleString('en-IN')}`, '']} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                {destPivot.names.map((name, i) => (
                                    <Line key={name} type="monotone" dataKey={name} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={false} connectNulls name={name} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            </div>

            {/* ── Branch Revenue Comparison Table ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWrapper title="Booking Branch Breakdown" subtitle="Revenue, volume & share by source branch">
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto" data-lenis-prevent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border sticky top-0 bg-premium-card">
                                    <th className="px-3 py-2 text-left">Branch</th>
                                    <th className="px-3 py-2 text-right">Revenue</th>
                                    <th className="px-3 py-2 text-right">Bookings</th>
                                    <th className="px-3 py-2 text-right">Avg Value</th>
                                    <th className="px-3 py-2 text-right">Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.bookingBranchRevenue.map((b, i) => (
                                    <tr key={i} className="border-b border-premium-border/30 hover:bg-muted/20 transition-colors">
                                        <td className="px-3 py-2 font-bold text-foreground">{b.name}</td>
                                        <td className="px-3 py-2 text-right font-black text-emerald-400">₹{b.revenue.toLocaleString('en-IN')}</td>
                                        <td className="px-3 py-2 text-right font-bold text-muted-foreground">{b.count}</td>
                                        <td className="px-3 py-2 text-right font-bold text-foreground">₹{b.avgValue.toLocaleString('en-IN')}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(b.share, 100)}%` }} />
                                                </div>
                                                <span className="text-xs font-black text-blue-400">{(b.share || 0).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartWrapper>

                <ChartWrapper title="Destination Branch Breakdown" subtitle="Revenue, volume & share by destination branch">
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto" data-lenis-prevent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border sticky top-0 bg-premium-card">
                                    <th className="px-3 py-2 text-left">Branch</th>
                                    <th className="px-3 py-2 text-right">Revenue</th>
                                    <th className="px-3 py-2 text-right">Parcels</th>
                                    <th className="px-3 py-2 text-right">Avg Value</th>
                                    <th className="px-3 py-2 text-right">Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.destinationBranchRevenue.map((b, i) => (
                                    <tr key={i} className="border-b border-premium-border/30 hover:bg-muted/20 transition-colors">
                                        <td className="px-3 py-2 font-bold text-foreground">{b.name}</td>
                                        <td className="px-3 py-2 text-right font-black text-violet-400">₹{b.revenue.toLocaleString('en-IN')}</td>
                                        <td className="px-3 py-2 text-right font-bold text-muted-foreground">{b.count}</td>
                                        <td className="px-3 py-2 text-right font-bold text-foreground">₹{b.avgValue.toLocaleString('en-IN')}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(b.share, 100)}%` }} />
                                                </div>
                                                <span className="text-xs font-black text-violet-400">{(b.share || 0).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartWrapper>
            </div>

            {/* ── Route Revenue ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWrapper title="Top Route Revenue" subtitle="Highest revenue routes">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto" data-lenis-prevent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border sticky top-0 bg-premium-card">
                                    <th className="px-3 py-2 text-left">Route</th>
                                    <th className="px-3 py-2 text-right">Revenue</th>
                                    <th className="px-3 py-2 text-right">Volume</th>
                                    <th className="px-3 py-2 text-right">Avg Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.routeRevenue.map((r, i) => (
                                    <tr key={i} className="border-b border-premium-border/30 hover:bg-muted/20 transition-colors">
                                        <td className="px-3 py-2">
                                            <span className="flex items-center gap-1 font-bold text-foreground text-xs">
                                                {r.fromName} <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" /> {r.toName}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-emerald-400">₹{r.revenue.toLocaleString('en-IN')}</td>
                                        <td className="px-3 py-2 text-right font-bold text-muted-foreground">{r.count}</td>
                                        <td className="px-3 py-2 text-right font-bold text-foreground">₹{r.avgValue.toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartWrapper>

                <ChartWrapper title="Route Revenue Trend" subtitle="Top 5 routes — daily revenue">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={routePivot.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${(v || 0).toLocaleString('en-IN')}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${(v || 0).toLocaleString('en-IN')}`, '']} />
                                <Legend wrapperStyle={{ fontSize: '9px' }} />
                                {routePivot.names.map((name, i) => (
                                    <Line key={name} type="monotone" dataKey={name} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={false} connectNulls name={name} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            </div>
        </div>
    );
}
