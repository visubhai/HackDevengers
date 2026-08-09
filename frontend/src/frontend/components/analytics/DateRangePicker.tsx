"use client";

import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getPresets = () => {
    const now = new Date();
    const today = toDateStr(now);
    const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toDateStr(d); };
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    return [
        { label: "Today", startDate: today, endDate: today },
        { label: "7D", startDate: daysAgo(6), endDate: today },
        { label: "30D", startDate: daysAgo(29), endDate: today },
        { label: "MTD", startDate: toDateStr(monthStart), endDate: today },
        { label: "Last Month", startDate: toDateStr(lastMonthStart), endDate: toDateStr(lastMonthEnd) },
        { label: "90D", startDate: daysAgo(89), endDate: today },
        { label: "YTD", startDate: toDateStr(yearStart), endDate: today },
        { label: "1Y", startDate: daysAgo(364), endDate: today },
    ];
};

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (startDate: string, endDate: string) => void;
    granularity?: 'daily' | 'weekly' | 'monthly';
    onGranularityChange?: (g: 'daily' | 'weekly' | 'monthly') => void;
    showGranularity?: boolean;
}

export default function DateRangePicker({ startDate, endDate, onChange, granularity, onGranularityChange, showGranularity }: DateRangePickerProps) {
    const [isCustom, setIsCustom] = useState(false);
    const presets = useMemo(() => getPresets(), []);

    const activePreset = useMemo(() => {
        return presets.find(p => p.startDate === startDate && p.endDate === endDate)?.label || null;
    }, [startDate, endDate, presets]);

    const handlePreset = (p: typeof presets[0]) => {
        setIsCustom(false);
        onChange(p.startDate, p.endDate);
    };

    const periodDays = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    }, [startDate, endDate]);

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto scrollbar-none">
                {presets.map(p => (
                    <button
                        key={p.label}
                        onClick={() => handlePreset(p)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap",
                            !isCustom && activePreset === p.label
                                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        {p.label}
                    </button>
                ))}
                <button
                    onClick={() => setIsCustom(true)}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1 whitespace-nowrap",
                        isCustom
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                >
                    <Calendar className="w-3 h-3" /> Custom
                </button>
            </div>

            {isCustom && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => onChange(e.target.value, endDate)}
                        className="bg-muted/50 border border-premium-border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground"
                    />
                    <span className="text-xs text-muted-foreground font-bold">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => onChange(startDate, e.target.value)}
                        className="bg-muted/50 border border-premium-border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground"
                    />
                </div>
            )}

            <span className="text-[10px] text-muted-foreground/60 font-bold tracking-widest uppercase">
                {periodDays}d period
            </span>

            {showGranularity && onGranularityChange && (
                <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 ml-auto">
                    {(['daily', 'weekly', 'monthly'] as const).map(g => (
                        <button
                            key={g}
                            onClick={() => onGranularityChange(g)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all capitalize",
                                granularity === g
                                    ? "bg-blue-500/20 text-blue-400 shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
