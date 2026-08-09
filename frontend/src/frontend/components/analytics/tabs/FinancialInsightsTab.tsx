"use client";

import { useState, useEffect, useCallback } from "react";
import { IndianRupee, Wallet, AlertCircle } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line
} from "recharts";
import DateRangePicker from "../DateRangePicker";
import KPICard from "../KPICard";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, FinancialData } from "@/frontend/services/advancedAnalyticsService";

const COST_COLORS = ['#4f46e5', '#10b981', '#f59e0b'];
const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function FinancialInsightsTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 29 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [data, setData] = useState<FinancialData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await advancedAnalyticsService.getFinancial(startDate, endDate);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Financial Data...</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800"><p>{error || "Unknown error"}</p></div>;
    }

    const { costBreakdown, outstandingToPay } = data;
    const costPieData = [
        { name: 'Freight', value: costBreakdown.freight },
        { name: 'Handling', value: costBreakdown.handling },
        { name: 'Hamali', value: costBreakdown.hamali },
    ].filter(d => d.value > 0);

    const totalPaid = data.revenueByPaymentType.reduce((s, d) => s + d.paid, 0);
    const totalToPay = data.revenueByPaymentType.reduce((s, d) => s + d.toPay, 0);
    const collectionEfficiency = (totalPaid + totalToPay) > 0 ? Math.round((totalPaid / (totalPaid + totalToPay)) * 1000) / 10 : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    title="Total Revenue"
                    subtitle="All booking charges (Paid + To Pay)"
                    value={data.totalRevenue}
                    prefix="₹"
                    icon={IndianRupee}
                    color="emerald"
                />
                <KPICard
                    title="Daily Avg Revenue"
                    subtitle="Total revenue divided by number of days"
                    value={data.dailyAvgRevenue}
                    prefix="₹"
                    icon={IndianRupee}
                    color="blue"
                />
                <KPICard
                    title="Collection Efficiency"
                    subtitle="Percentage of revenue already paid"
                    value={`${collectionEfficiency.toFixed(1)}%`}
                    icon={Wallet}
                    color={collectionEfficiency >= 60 ? "emerald" : "amber"}
                />
                <KPICard
                    title="Outstanding To Pay"
                    subtitle="Unpaid parcels still pending/booked"
                    value={outstandingToPay.amount}
                    prefix="₹"
                    icon={AlertCircle}
                    color={outstandingToPay.count > 100 ? "red" : "amber"}
                    suffix={` (${(outstandingToPay.count || 0).toLocaleString('en-IN')})`}
                />
                <KPICard
                    title="Daily Avg Cost"
                    subtitle="Total costs (freight+handling+hamali) per day"
                    value={(costBreakdown.total || 0) > 0 ? Math.round(costBreakdown.total / Math.max(data.revenueByPaymentType.length, 1)) : 0}
                    prefix="₹"
                    suffix="/day"
                    icon={IndianRupee}
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue by Payment Type */}
                <ChartWrapper title="Revenue by Payment Type" className="lg:col-span-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revenueByPaymentType} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorToPay" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Area type="monotone" dataKey="paid" stackId="1" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" name="Paid (₹)" />
                                <Area type="monotone" dataKey="toPay" stackId="1" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorToPay)" name="To Pay (₹)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>

                {/* Cost Breakdown */}
                <ChartWrapper title="Cost Breakdown">
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {costPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={costPieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                                        {costPieData.map((_, i) => (
                                            <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, '']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                    <Legend layout="vertical" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-muted-foreground text-sm">No cost data</p>
                        )}
                    </div>
                </ChartWrapper>
            </div>

            {/* Revenue by Item Type */}
            {data.revenueByItemType.length > 0 && (
                <ChartWrapper title="Revenue by Item Type">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.revenueByItemType} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis dataKey="itemType" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                                <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            )}

            {/* Avg Parcel Value Trend */}
            <ChartWrapper title="Average Parcel Value Trend">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.avgParcelValueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v}`} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`₹${(v || 0).toLocaleString('en-IN')}`, 'Avg Value']} />
                            <Line type="monotone" dataKey="avgValue" stroke="#ec4899" strokeWidth={2} dot={{ r: 3, fill: '#ec4899' }} name="Avg Value (₹)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ChartWrapper>
        </div>
    );
}
