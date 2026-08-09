"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, Legend
} from "recharts";
import DateRangePicker from "../DateRangePicker";
import KPICard from "../KPICard";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, DeliveryData } from "@/frontend/services/advancedAnalyticsService";
import { cn } from "@/frontend/lib/utils";

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function DeliveryPerformanceTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 29 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [data, setData] = useState<DeliveryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await advancedAnalyticsService.getDelivery(startDate, endDate);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Delivery Data...</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800"><p>{error || "Unknown error"}</p></div>;
    }

    const formatHours = (h: number) => {
        if (!h || h <= 0) return '0m';
        if (h < 1) return `${Math.round(h * 60)}m`;
        if (h < 24) return `${h.toFixed(1)}h`;
        return `${(h / 24).toFixed(1)}d`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard
                    title="Avg Delivery Time"
                    subtitle="Average hours from booking to delivery"
                    value={formatHours(data.avgDeliveryHours || 0)}
                    icon={Clock}
                    color="blue"
                />
                <KPICard
                    title="Delivery Rate"
                    subtitle="Delivered as % of eligible (excl. cancelled)"
                    value={`${(data.deliveryRate || 0).toFixed(1)}%`}
                    icon={CheckCircle2}
                    color={(data.deliveryRate || 0) >= 80 ? "emerald" : (data.deliveryRate || 0) >= 50 ? "amber" : "red"}
                />
                <KPICard
                    title="Total Pending"
                    subtitle="Parcels in BOOKED or PENDING status"
                    value={data.totalPending || 0}
                    suffix=" parcels"
                    icon={AlertTriangle}
                    color={(data.totalPending || 0) > 50 ? "red" : "amber"}
                />
            </div>

            {/* SLA Compliance */}
            {data.slaCompliance && (
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                    <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-4">SLA Compliance</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Within 24h</p>
                            <p className={cn("text-3xl font-black", (data.slaCompliance.within24h || 0) >= 70 ? "text-emerald-400" : (data.slaCompliance.within24h || 0) >= 40 ? "text-amber-400" : "text-red-400")}>
                                {(data.slaCompliance.within24h || 0).toFixed(1)}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Within 48h</p>
                            <p className={cn("text-3xl font-black", (data.slaCompliance.within48h || 0) >= 85 ? "text-emerald-400" : (data.slaCompliance.within48h || 0) >= 60 ? "text-amber-400" : "text-red-400")}>
                                {(data.slaCompliance.within48h || 0).toFixed(1)}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Within 72h</p>
                            <p className={cn("text-3xl font-black", (data.slaCompliance.within72h || 0) >= 95 ? "text-emerald-400" : (data.slaCompliance.within72h || 0) >= 75 ? "text-amber-400" : "text-red-400")}>
                                {(data.slaCompliance.within72h || 0).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Aging */}
            <ChartWrapper title="Pending Parcel Aging" subtitle="How long parcels have been waiting">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.pendingAging} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis type="category" dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} width={80} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                            <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={20} name="Pending Parcels" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartWrapper>

            {/* Delivery Trend */}
            <ChartWrapper title="Delivery Trend" subtitle="Daily deliveries and delivery rate">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.deliveryTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                            <YAxis yAxisId="count" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis yAxisId="rate" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar yAxisId="count" dataKey="delivered" fill="#10b981" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={20} name="Delivered" />
                            <Bar yAxisId="count" dataKey="total" fill="#3b82f6" fillOpacity={0.3} radius={[4, 4, 0, 0]} barSize={20} name="Total" />
                            <Line yAxisId="rate" type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Rate %" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </ChartWrapper>

            {/* Branch Delivery Speed */}
            {data.branchDeliverySpeed.length > 0 && (
                <ChartWrapper title="Branch Delivery Speed" subtitle="Average delivery time by destination branch">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.branchDeliverySpeed.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.3} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v}h`} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} width={120} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: any) => [`${v} hours`, 'Avg Time']} />
                                <Bar dataKey="avgHours" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} name="Avg Hours" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            )}
        </div>
    );
}
