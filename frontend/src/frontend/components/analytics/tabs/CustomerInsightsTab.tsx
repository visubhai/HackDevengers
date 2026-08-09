"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Users, Repeat, IndianRupee, UserCheck, Wallet } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, ComposedChart, Line, Area
} from "recharts";
import DateRangePicker from "../DateRangePicker";
import KPICard from "../KPICard";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, CustomerData } from "@/frontend/services/advancedAnalyticsService";
import { cn } from "@/frontend/lib/utils";

const SEGMENT_COLORS = ['#64748b', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CustomerInsightsTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 29 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [data, setData] = useState<CustomerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await advancedAnalyticsService.getCustomers(startDate, endDate);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Customer Data...</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800"><p>{error || "Unknown error"}</p></div>;
    }

    const { kpis, segments, newVsReturningTrend, topRepeatCustomers } = data;

    const filteredCustomers = topRepeatCustomers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const customerHealth = topRepeatCustomers.length > 0 ? {
        active: topRepeatCustomers.filter(c => (c.daysSinceLastBooking ?? 999) <= 7).length,
        atRisk: topRepeatCustomers.filter(c => (c.daysSinceLastBooking ?? 999) > 7 && (c.daysSinceLastBooking ?? 999) <= 30).length,
        inactive: topRepeatCustomers.filter(c => (c.daysSinceLastBooking ?? 999) > 30).length,
    } : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    title="Unique Customers"
                    subtitle="Distinct sender names in period"
                    value={kpis.totalUniqueCustomers || 0}
                    icon={Users}
                    color="blue"
                />
                <KPICard
                    title="Repeat Rate"
                    subtitle="Customers with 2+ bookings"
                    value={`${(kpis.repeatRate || 0).toFixed(1)}%`}
                    icon={Repeat}
                    color={(kpis.repeatRate || 0) >= 30 ? "emerald" : (kpis.repeatRate || 0) >= 15 ? "amber" : "red"}
                />
                <KPICard
                    title="Avg Bookings / Customer"
                    subtitle="Total bookings divided by unique customers"
                    value={kpis.avgBookingsPerCustomer || 0}
                    suffix="x"
                    icon={UserCheck}
                    color="indigo"
                />
                <KPICard
                    title="Avg Revenue / Customer"
                    subtitle="Total revenue divided by unique customers"
                    value={kpis.avgRevenuePerCustomer || 0}
                    prefix="₹"
                    icon={Wallet}
                    color="violet"
                />
                <KPICard
                    title="Repeat Revenue Share"
                    subtitle="Revenue from repeat customers as % of total"
                    value={`${(kpis.repeatRevenueShare || 0).toFixed(1)}%`}
                    icon={IndianRupee}
                    color="emerald"
                />
            </div>

            {/* Customer Concentration & Health */}
            <div className="bg-gradient-to-r from-violet-950/50 to-purple-950/50 p-5 rounded-2xl border border-violet-800/30 shadow-lg">
                <h3 className="text-[10px] font-black text-violet-300/70 tracking-[0.15em] uppercase mb-4">Customer Intelligence</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-violet-300/50 tracking-[0.15em] uppercase mb-1">Top 10% Revenue Share</p>
                        <p className="text-3xl font-black text-white">{(kpis.top10PctRevenueShare || 0).toFixed(1)}%</p>
                        <p className="text-[10px] text-violet-300/70 font-medium mt-1">of total revenue from top 10% customers</p>
                    </div>
                    {customerHealth && (
                        <div className="text-center">
                            <p className="text-[10px] font-black text-violet-300/50 tracking-[0.15em] uppercase mb-3">Top Customers Health</p>
                            <div className="flex justify-center gap-6">
                                <div>
                                    <p className="text-2xl font-black text-emerald-400">{customerHealth.active}</p>
                                    <p className="text-[9px] text-emerald-300/70 font-bold uppercase tracking-wider">Active</p>
                                    <p className="text-[9px] text-slate-500 font-medium">{'<'}7 days</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-amber-400">{customerHealth.atRisk}</p>
                                    <p className="text-[9px] text-amber-300/70 font-bold uppercase tracking-wider">At Risk</p>
                                    <p className="text-[9px] text-slate-500 font-medium">7-30 days</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-red-400">{customerHealth.inactive}</p>
                                    <p className="text-[9px] text-red-300/70 font-bold uppercase tracking-wider">Inactive</p>
                                    <p className="text-[9px] text-slate-500 font-medium">30+ days</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Repeat Revenue Highlight */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-4">Repeat Customer Impact</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Repeat Customers</p>
                        <p className="text-xl font-black text-white">{(kpis.repeatCount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">One-Time Customers</p>
                        <p className="text-xl font-black text-slate-400">{((kpis.totalUniqueCustomers || 0) - (kpis.repeatCount || 0)).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Revenue from Repeat</p>
                        <p className="text-xl font-black text-emerald-400">₹{(kpis.totalRevenueFromRepeat || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Repeat Revenue Share</p>
                        <p className="text-xl font-black text-emerald-400">{(kpis.repeatRevenueShare || 0).toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New vs Returning Trend */}
                <ChartWrapper title="New vs Returning Customers" subtitle="Daily breakdown with repeat rate" className="lg:col-span-2">
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={newVsReturningTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorReturning" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                <YAxis yAxisId="count" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis yAxisId="rate" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Area yAxisId="count" type="monotone" dataKey="newCustomers" stackId="1" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNew)" name="New Customers" />
                                <Area yAxisId="count" type="monotone" dataKey="returningCustomers" stackId="1" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReturning)" name="Returning Customers" />
                                <Line yAxisId="rate" type="monotone" dataKey="repeatRate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Repeat Rate %" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>

                {/* Customer Segments Pie */}
                <ChartWrapper title="Customer Segments" subtitle="By booking frequency">
                    <div className="h-[320px] w-full flex items-center justify-center">
                        {segments.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={segments} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="segment">
                                        {segments.map((_, i) => (
                                            <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any, name: any) => [v, name]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                    <Legend layout="vertical" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-muted-foreground text-sm">No segment data</p>
                        )}
                    </div>
                </ChartWrapper>
            </div>

            {/* Top Repeat Customers Table */}
            {topRepeatCustomers.length > 0 && (
                <ChartWrapper title="Top Repeat Customers" subtitle={`${topRepeatCustomers.length} most frequent senders — identified by name`} onRefresh={fetchData}>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search customers by name..."
                            value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)}
                            className="bg-muted/50 border border-premium-border rounded-lg px-3 py-2 text-sm font-medium text-foreground w-full max-w-xs placeholder:text-muted-foreground/50"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border">
                                    <th className="px-3 py-3 text-left">#</th>
                                    <th className="px-3 py-3 text-left">Customer</th>
                                    <th className="px-3 py-3 text-left">Tier</th>
                                    <th className="px-3 py-3 text-left">Bookings</th>
                                    <th className="px-3 py-3 text-left">Revenue</th>
                                    <th className="px-3 py-3 text-left">Avg Value</th>
                                    <th className="px-3 py-3 text-left">Last Active</th>
                                    <th className="px-3 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((c, i) => {
                                    const status = (c.daysSinceLastBooking ?? 999) <= 7 ? 'Active' : (c.daysSinceLastBooking ?? 999) <= 30 ? 'At Risk' : 'Inactive';
                                    const statusColor = status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : status === 'At Risk' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400';
                                    const tierColor = c.tier === 'VIP' ? 'bg-violet-500/20 text-violet-400' : c.tier === 'Premium' ? 'bg-blue-500/20 text-blue-400' : c.tier === 'Regular' ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-500/10 text-slate-500';
                                    const isExpanded = expandedCustomer === i;
                                    return (
                                        <Fragment key={i}>
                                            <tr
                                                className={cn("border-b border-premium-border/30 hover:bg-muted/20 transition-colors cursor-pointer", isExpanded && "bg-muted/10")}
                                                onClick={() => setExpandedCustomer(isExpanded ? null : i)}
                                            >
                                                <td className="px-3 py-3 text-muted-foreground font-bold">{i + 1}</td>
                                                <td className="px-3 py-3">
                                                    <div>
                                                        <p className="font-bold text-foreground">{c.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{c.mobile}</p>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider", tierColor)}>
                                                        {c.tier || 'New'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={cn(
                                                        "text-xs font-black px-2 py-0.5 rounded",
                                                        c.bookingCount >= 10 ? "bg-emerald-500/20 text-emerald-400" :
                                                        c.bookingCount >= 5 ? "bg-blue-500/20 text-blue-400" :
                                                        "bg-slate-500/20 text-slate-400"
                                                    )}>
                                                        {c.bookingCount}x
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 font-black text-foreground">₹{c.totalRevenue.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-3 font-bold text-muted-foreground">₹{(c.avgBookingValue || 0).toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-3 text-muted-foreground text-xs">
                                                    {c.daysSinceLastBooking === 0 ? 'Today' : c.daysSinceLastBooking != null ? `${c.daysSinceLastBooking}d ago` : '—'}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider", statusColor)}>
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-muted/5 border-b border-premium-border/30 animate-in fade-in duration-200">
                                                    <td colSpan={8} className="px-6 py-5">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                                            <div>
                                                                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">Payment Preference</p>
                                                                <div className="flex gap-2 flex-wrap">
                                                                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold">Paid: {c.paidCount ?? 0}</span>
                                                                    <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs font-bold">To Pay: {c.toPayCount ?? 0}</span>
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground mt-2">
                                                                    {(c.paidCount ?? 0) + (c.toPayCount ?? 0) > 0
                                                                        ? `${Math.round(((c.paidCount ?? 0) / ((c.paidCount ?? 0) + (c.toPayCount ?? 0))) * 100)}% paid`
                                                                        : ''}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">Top Route</p>
                                                                {c.topRoute ? (
                                                                    <div>
                                                                        <p className="font-bold text-foreground text-xs">{c.topRoute.fromName} → {c.topRoute.toName}</p>
                                                                        <p className="text-[10px] text-muted-foreground mt-1">{c.topRoute.count} bookings on this route</p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground">No route data</p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">Customer Since</p>
                                                                <p className="font-bold text-foreground text-xs">
                                                                    {new Date(c.firstBooking).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                                    Last: {new Date(c.lastBooking).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">Recent Bookings</p>
                                                                {c.recentBookings && c.recentBookings.length > 0 ? (
                                                                    <div className="space-y-1.5">
                                                                        {c.recentBookings.map((rb, j) => (
                                                                            <div key={j} className="flex items-center justify-between text-xs gap-3">
                                                                                <span className="text-muted-foreground">
                                                                                    {new Date(rb.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                                </span>
                                                                                <span className="font-bold text-foreground">₹{rb.amount?.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground">No recent data</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </ChartWrapper>
            )}
        </div>
    );
}
