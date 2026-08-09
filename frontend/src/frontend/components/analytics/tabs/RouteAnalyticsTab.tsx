"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, ArrowUpDown } from "lucide-react";
import DateRangePicker from "../DateRangePicker";
import ChartWrapper from "../ChartWrapper";
import { advancedAnalyticsService, RouteData } from "@/frontend/services/advancedAnalyticsService";
import { cn } from "@/frontend/lib/utils";

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function RouteAnalyticsTab() {
    const init = { startDate: toDateStr(new Date(Date.now() - 29 * 86400000)), endDate: toDateStr(new Date()) };
    const [startDate, setStartDate] = useState(init.startDate);
    const [endDate, setEndDate] = useState(init.endDate);
    const [data, setData] = useState<RouteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<'revenue' | 'volume' | 'avgValue'>('revenue');
    const [sortAsc, setSortAsc] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await advancedAnalyticsService.getRoutes(startDate, endDate);
        if (err) setError(err.message);
        else setData(result);
        setLoading(false);
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSort = (key: 'revenue' | 'volume' | 'avgValue') => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(false); }
    };

    const heatmapData = useMemo(() => {
        if (!data?.routeMatrix.length) return null;
        const froms = [...new Set(data.routeMatrix.map(r => r.fromName))].sort();
        const tos = [...new Set(data.routeMatrix.map(r => r.toName))].sort();
        const volumeMap = new Map(data.routeMatrix.map(r => [`${r.fromName}|${r.toName}`, r.volume]));
        const maxVolume = Math.max(...data.routeMatrix.map(r => r.volume), 1);
        return { froms, tos, volumeMap, maxVolume };
    }, [data]);

    const getHeatColor = (volume: number, max: number) => {
        if (volume === 0) return 'bg-muted/20';
        const intensity = volume / max;
        if (intensity > 0.75) return 'bg-indigo-600 text-white';
        if (intensity > 0.5) return 'bg-indigo-500/70 text-white';
        if (intensity > 0.25) return 'bg-indigo-400/40 text-foreground';
        return 'bg-indigo-300/20 text-foreground';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Loading Route Data...</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-6 rounded-xl border border-red-200 dark:border-red-800"><p>{error || "Unknown error"}</p></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

            {/* Top Routes Table */}
            <ChartWrapper title="Top Routes by Revenue" subtitle={`${data.topRoutes.length} routes`} onRefresh={fetchData}>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search routes..."
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
                                <th className="px-3 py-3 text-left">Route</th>
                                <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('revenue')}>
                                    <span className="flex items-center gap-1">Revenue <ArrowUpDown className={cn("w-3 h-3", sortKey === 'revenue' ? "text-blue-400" : "opacity-30")} /></span>
                                </th>
                                <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('volume')}>
                                    <span className="flex items-center gap-1">Volume <ArrowUpDown className={cn("w-3 h-3", sortKey === 'volume' ? "text-blue-400" : "opacity-30")} /></span>
                                </th>
                                <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('avgValue')}>
                                    <span className="flex items-center gap-1">Avg Value <ArrowUpDown className={cn("w-3 h-3", sortKey === 'avgValue' ? "text-blue-400" : "opacity-30")} /></span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...data.topRoutes]
                                .filter(r => `${r.fromName} ${r.toName}`.toLowerCase().includes(searchTerm.toLowerCase()))
                                .sort((a, b) => { const diff = a[sortKey] - b[sortKey]; return sortAsc ? diff : -diff; })
                                .map((r, i) => (
                                <tr key={i} className="border-b border-premium-border/30 hover:bg-muted/20 transition-colors">
                                    <td className="px-3 py-3 text-muted-foreground font-bold">{i + 1}</td>
                                    <td className="px-3 py-3">
                                        <span className="flex items-center gap-2 font-bold text-foreground">
                                            {r.fromName}
                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                            {r.toName}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 font-black text-foreground">₹{r.revenue.toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-3 font-bold">{(r.volume || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-3 font-bold">₹{r.avgValue.toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartWrapper>

            {/* Route Heatmap Matrix */}
            {heatmapData && heatmapData.froms.length <= 20 && (
                <ChartWrapper title="Route Traffic Heatmap" subtitle="Color intensity = booking volume">
                    <div className="overflow-x-auto">
                        <table className="text-xs">
                            <thead>
                                <tr>
                                    <th className="px-2 py-2 text-[10px] font-black text-muted-foreground tracking-wider uppercase sticky left-0 bg-premium-card z-10">
                                        From ↓ / To →
                                    </th>
                                    {heatmapData.tos.map(to => (
                                        <th key={to} className="px-2 py-2 text-[10px] font-bold text-muted-foreground tracking-wider" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', minWidth: '36px' }}>
                                            {to}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmapData.froms.map(from => (
                                    <tr key={from}>
                                        <td className="px-2 py-2 font-bold text-foreground whitespace-nowrap sticky left-0 bg-premium-card z-10 border-r border-premium-border">
                                            {from}
                                        </td>
                                        {heatmapData.tos.map(to => {
                                            const vol = heatmapData.volumeMap.get(`${from}|${to}`) || 0;
                                            return (
                                                <td key={to} className={cn("px-2 py-2 text-center font-bold rounded-sm min-w-[36px]", getHeatColor(vol, heatmapData.maxVolume))}>
                                                    {vol > 0 ? vol.toLocaleString('en-IN') : ''}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartWrapper>
            )}
        </div>
    );
}
