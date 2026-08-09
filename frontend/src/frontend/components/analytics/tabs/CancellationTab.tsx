"use client";

import { useState, useEffect, useCallback } from "react";
import { XCircle, Banknote, TrendingDown, ArrowRight } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, Legend
} from "recharts";
import DateRangePicker from "../DateRangePicker";
import KPICard from "../KPICard";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, CancellationData } from "@/frontend/services/advancedAnalyticsService";
import { cn } from "@/frontend/lib/utils";

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CancellationTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 29 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [data, setData] = useState<CancellationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await advancedAnalyticsService.getCancellations(startDate, endDate);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Cancellation Data...</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800"><p>{error || "Unknown error"}</p></div>;
    }

    const avgRate = data.cancellationTrend.length > 0
        ? Math.round((data.cancellationTrend.reduce((s, d) => s + d.rate, 0) / data.cancellationTrend.length) * 10) / 10
        : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard
                    title="Total Cancellations"
                    subtitle="Number of cancelled bookings"
                    value={data.totalCancelled || 0}
                    icon={XCircle}
                    color="red"
                />
                <KPICard
                    title="Avg Cancellation Rate"
                    subtitle="Cancelled as % of all bookings"
                    value={`${avgRate.toFixed(1)}%`}
                    icon={TrendingDown}
                    color={avgRate > 10 ? "red" : avgRate > 5 ? "amber" : "emerald"}
                />
                <KPICard
                    title="Revenue Lost"
                    subtitle="Total value of cancelled bookings"
                    value={data.totalLostRevenue || 0}
                    prefix="₹"
                    icon={Banknote}
                    color="red"
                />
            </div>

            {/* Cancellation Trend */}
            <ChartWrapper title="Cancellation Trend" subtitle="Daily cancellations and cancellation rate">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.cancellationTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                            <YAxis yAxisId="count" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis yAxisId="rate" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar yAxisId="count" dataKey="cancelled" fill="#ef4444" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={20} name="Cancelled" />
                            <Bar yAxisId="count" dataKey="total" fill="#3b82f6" fillOpacity={0.2} radius={[4, 4, 0, 0]} barSize={20} name="Total Bookings" />
                            <Line yAxisId="rate" type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Rate %" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </ChartWrapper>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Branch */}
                {data.cancellationByBranch.length > 0 && (
                    <ChartWrapper title="Cancellations by Branch" subtitle="With cancellation rate">
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto" data-lenis-prevent>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border sticky top-0 bg-premium-card">
                                        <th className="px-3 py-2 text-left">Branch</th>
                                        <th className="px-3 py-2 text-left">Cancelled</th>
                                        <th className="px-3 py-2 text-left">Total</th>
                                        <th className="px-3 py-2 text-left">Rate</th>
                                        <th className="px-3 py-2 text-left">Lost Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.cancellationByBranch.slice(0, 10).map((b, i) => (
                                        <tr key={i} className="border-b border-premium-border/30 hover:bg-muted/20 transition-colors">
                                            <td className="px-3 py-2 font-bold text-foreground">{b.name}</td>
                                            <td className="px-3 py-2 font-black text-red-400">{(b.count || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-3 py-2 font-bold text-muted-foreground">{(b.totalBookings || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-3 py-2">
                                                <span className={cn(
                                                    "text-xs font-black px-2 py-0.5 rounded",
                                                    (b.rate || 0) > 10 ? "bg-red-500/20 text-red-400" :
                                                    (b.rate || 0) > 5 ? "bg-amber-500/20 text-amber-400" :
                                                    "bg-emerald-500/20 text-emerald-400"
                                                )}>
                                                    {(b.rate || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-bold text-foreground">₹{(b.lostRevenue || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ChartWrapper>
                )}

                {/* By Route */}
                {data.cancellationByRoute.length > 0 && (
                    <ChartWrapper title="Cancellations by Route" subtitle="Top cancelled routes">
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto" data-lenis-prevent>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border sticky top-0 bg-premium-card">
                                        <th className="px-3 py-2 text-left">Route</th>
                                        <th className="px-3 py-2 text-left">Count</th>
                                        <th className="px-3 py-2 text-left">Lost Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.cancellationByRoute.map((r, i) => (
                                        <tr key={i} className="border-b border-premium-border/30 hover:bg-muted/20 transition-colors">
                                            <td className="px-3 py-2">
                                                <span className="flex items-center gap-1 font-bold text-foreground text-xs">
                                                    {r.fromName} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {r.toName}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-black text-red-400">{r.count}</td>
                                            <td className="px-3 py-2 font-bold text-foreground">₹{r.lostRevenue.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ChartWrapper>
                )}
            </div>
        </div>
    );
}
