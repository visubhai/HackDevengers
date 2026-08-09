"use client";

import { ReactNode, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

interface ChartWrapperProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    action?: ReactNode;
    onRefresh?: () => void;
}

export default function ChartWrapper({ title, subtitle, children, className, action, onRefresh }: ChartWrapperProps) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        if (!onRefresh) return;
        setRefreshing(true);
        onRefresh();
        setTimeout(() => setRefreshing(false), 1000);
    };

    return (
        <div className={cn("bg-premium-card p-6 rounded-2xl border border-premium-border shadow-sm backdrop-blur-sm", className)}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">{title}</h3>
                    {subtitle && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-medium">{subtitle}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {action}
                    {onRefresh && (
                        <button
                            onClick={handleRefresh}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                            title="Refresh data"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                        </button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}
