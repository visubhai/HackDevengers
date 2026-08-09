"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface KPICardProps {
    title: string;
    value: string | number;
    previousValue?: number;
    currentValue?: number;
    icon: LucideIcon;
    color: string;
    prefix?: string;
    suffix?: string;
    subtitle?: string;
    sparklineData?: { value: number }[];
}

export default function KPICard({ title, value, previousValue, currentValue, icon: Icon, color, prefix = '', suffix = '', subtitle, sparklineData }: KPICardProps) {
    const changePercent = (previousValue !== undefined && currentValue !== undefined && previousValue > 0)
        ? Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10
        : null;

    const isPositive = changePercent !== null && changePercent >= 0;
    const colorMap: Record<string, { bg: string; text: string; sparkline: string }> = {
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', sparkline: '#10b981' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', sparkline: '#3b82f6' },
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', sparkline: '#6366f1' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', sparkline: '#f59e0b' },
        red: { bg: 'bg-red-500/10', text: 'text-red-400', sparkline: '#ef4444' },
        violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', sparkline: '#8b5cf6' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className="bg-premium-card p-5 rounded-2xl border border-premium-border shadow-sm relative overflow-hidden group backdrop-blur-sm">
            <div className={`absolute right-0 top-0 w-24 h-24 ${c.bg} rounded-bl-[100px] transition-transform group-hover:scale-110 opacity-50`} />

            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${c.bg} ${c.text} rounded-lg`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{title}</h3>
                    {subtitle && <p className="text-[9px] text-muted-foreground/60 font-medium mt-0.5">{subtitle}</p>}
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-2xl font-black text-foreground tracking-tight">
                        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
                    </p>
                    {changePercent !== null && (
                        <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{isPositive ? '+' : ''}{changePercent}%</span>
                            <span className="text-muted-foreground font-medium">vs prev</span>
                        </div>
                    )}
                </div>

                {sparklineData && sparklineData.length > 1 && (
                    <div className="w-20 h-10 opacity-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={c.sparkline} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={c.sparkline} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={c.sparkline}
                                    strokeWidth={2}
                                    fill={`url(#spark-${color})`}
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
