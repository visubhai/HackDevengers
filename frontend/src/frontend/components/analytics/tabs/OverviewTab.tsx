"use client";

import { useState, useEffect, useCallback } from "react";
import { Banknote, PackageCheck, TrendingUp, IndianRupee } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, ComposedChart, Bar
} from "recharts";
import DateRangePicker from "../DateRangePicker";
import KPICard from "../KPICard";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, OverviewData } from "@/frontend/services/advancedAnalyticsService";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function OverviewTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 6 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await advancedAnalyticsService.getOverview(startDate, endDate, granularity);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate, granularity]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDateChange = (s: string, e: string) => { setStartDate(s); setEndDate(e); };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Overview...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800">
                <h3 className="font-bold text-lg mb-2">Failed to load overview</h3>
                <p>{error || "Unknown error"}</p>
            </div>
        );
    }

    const { kpis, revenueTrend, statusDistribution, paymentTypeSplit } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateChange}
                granularity={granularity}
                onGranularityChange={setGranularity}
                showGranularity
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Revenue"
                    subtitle="All booking charges (excl. cancelled)"
                    value={kpis.totalRevenue}
                    prefix="₹"
                    icon={Banknote}
                    color="emerald"
                    currentValue={kpis.totalRevenue}
                    previousValue={kpis.previousPeriodRevenue}
                    sparklineData={revenueTrend.map(d => ({ value: d.revenue }))}
                />
                <KPICard
                    title="Total Parcels"
                    subtitle="Number of bookings (excl. cancelled)"
                    value={kpis.totalParcels}
                    icon={PackageCheck}
                    color="blue"
                    currentValue={kpis.totalParcels}
                    previousValue={kpis.previousPeriodParcels}
                    sparklineData={revenueTrend.map(d => ({ value: d.count }))}
                />
                <KPICard
                    title="Avg Parcel Value"
                    subtitle="Revenue divided by total parcels"
                    value={kpis.avgParcelValue}
                    prefix="₹"
                    icon={IndianRupee}
                    color="indigo"
                />
                <KPICard
                    title="Revenue Growth"
                    subtitle="Change vs. same-length previous period"
                    value={`${kpis.revenueChangePercent > 0 ? '+' : ''}${Number(kpis.revenueChangePercent || 0).toFixed(1)}%`}
                    icon={TrendingUp}
                    color={kpis.revenueChangePercent >= 0 ? "emerald" : "red"}
                />
            </div>

            {/* Key Insights */}
            <div className="bg-gradient-to-r from-blue-950/50 to-indigo-950/50 p-4 rounded-2xl border border-blue-800/30 shadow-lg">
                <h3 className="text-[10px] font-black text-blue-300/70 tracking-[0.15em] uppercase mb-3">Key Insights</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-blue-300/50 tracking-[0.15em] uppercase mb-1">Peak Day</p>
                        <p className="text-sm font-black text-white">{kpis.peakDay || 'N/A'}</p>
                        <p className="text-xs text-blue-300 font-bold">{kpis.peakDayRevenue > 0 ? `₹${kpis.peakDayRevenue.toLocaleString('en-IN')}` : ''}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-blue-300/50 tracking-[0.15em] uppercase mb-1">Daily Average</p>
                        <p className="text-sm font-black text-white">₹{(kpis.dailyAvgRevenue || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-blue-300/50 tracking-[0.15em] uppercase mb-1">Items Shipped</p>
                        <p className="text-sm font-black text-white">{(kpis.totalQuantity || 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>

            {/* Period Comparison */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-4">Period Comparison</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Revenue</p>
                        <p className="text-xl font-black text-white">₹{(kpis.totalRevenue || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Previous Revenue</p>
                        <p className="text-xl font-black text-slate-400">₹{(kpis.previousPeriodRevenue || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Parcels</p>
                        <p className="text-xl font-black text-white">{(kpis.totalParcels || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Previous Parcels</p>
                        <p className="text-xl font-black text-slate-400">{(kpis.previousPeriodParcels || 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue + Volume Trend */}
                <ChartWrapper title="Revenue & Volume Trend" className="lg:col-span-2" onRefresh={fetchData}>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevOverview" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                <YAxis yAxisId="revenue" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v}`} />
                                <YAxis yAxisId="volume" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevOverview)" name="Revenue (₹)" />
                                <Bar yAxisId="volume" dataKey="count" fill="#10b981" fillOpacity={0.4} radius={[4, 4, 0, 0]} barSize={20} name="Bookings" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>

                {/* Status Distribution */}
                <ChartWrapper title="Parcel Status Mix">
                    <div className="h-[320px] w-full flex items-center justify-center">
                        {statusDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusDistribution} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                                        {statusDistribution.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => [v, 'Parcels']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                    <Legend layout="vertical" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-muted-foreground text-sm font-medium">No data available</p>
                        )}
                    </div>
                </ChartWrapper>
            </div>

            {/* Payment Type Split */}
            {paymentTypeSplit.length > 0 && (
                <ChartWrapper title="Payment Type Split">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {paymentTypeSplit.map(p => (
                            <div key={p.type} className="bg-muted/30 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{p.type}</p>
                                    <p className="text-2xl font-black text-foreground mt-1">₹{p.amount.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-muted-foreground">{p.count}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">bookings</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartWrapper>
            )}
        </div>
    );
}
