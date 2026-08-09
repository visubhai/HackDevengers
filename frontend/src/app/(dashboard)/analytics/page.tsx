"use client";

import { useState, Suspense } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { cn } from "@/frontend/lib/utils";
import {
    BarChart3, TrendingUp, GitBranch, Route,
    Truck, IndianRupee, XCircle, Users, ArrowLeftRight, UserSearch
} from "lucide-react";
import dynamic from "next/dynamic";

const OverviewTab = dynamic(() => import("@/frontend/components/analytics/tabs/OverviewTab"), { ssr: false });
const BranchPerformanceTab = dynamic(() => import("@/frontend/components/analytics/tabs/BranchPerformanceTab"), { ssr: false });
const RouteAnalyticsTab = dynamic(() => import("@/frontend/components/analytics/tabs/RouteAnalyticsTab"), { ssr: false });
const DeliveryPerformanceTab = dynamic(() => import("@/frontend/components/analytics/tabs/DeliveryPerformanceTab"), { ssr: false });
const FinancialInsightsTab = dynamic(() => import("@/frontend/components/analytics/tabs/FinancialInsightsTab"), { ssr: false });
const CancellationTab = dynamic(() => import("@/frontend/components/analytics/tabs/CancellationTab"), { ssr: false });
const CustomerInsightsTab = dynamic(() => import("@/frontend/components/analytics/tabs/CustomerInsightsTab"), { ssr: false });
const ComparisonTab = dynamic(() => import("@/frontend/components/analytics/tabs/ComparisonTab"), { ssr: false });
const PartyLookupTab = dynamic(() => import("@/frontend/components/analytics/tabs/PartyLookupTab"), { ssr: false });

const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "branches", label: "Branches", icon: GitBranch },
    { id: "routes", label: "Routes", icon: Route },
    { id: "delivery", label: "Delivery", icon: Truck },
    { id: "financial", label: "Financial", icon: IndianRupee },
    { id: "cancellations", label: "Cancellations", icon: XCircle },
    { id: "customers", label: "Customers", icon: Users },
    { id: "comparison", label: "Comparison", icon: ArrowLeftRight },
    { id: "party-lookup", label: "Party Lookup", icon: UserSearch },
];

function TabSkeleton() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-bold tracking-widest uppercase text-xs">Loading...</p>
        </div>
    );
}

export default function AnalyticsDashboard() {
    const { currentUser } = useBranchStore();
    const [activeTab, setActiveTab] = useState("overview");

    if (currentUser?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
                <p className="text-sm uppercase tracking-widest text-slate-500">Only Super Admins can view business analytics.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 print:hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-premium-header border-b border-slate-800/60 py-6 mb-6 shadow-md relative overflow-hidden -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
                <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                            <BarChart3 className="w-8 h-8 text-blue-400" />
                            Business Intelligence <span className="text-blue-400">Hub</span>
                        </h1>
                        <p className="text-xs text-slate-300 mt-1 uppercase tracking-[0.2em] font-black">Advanced Performance Analytics</p>
                    </div>
                    <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner backdrop-blur-md">
                        Global Enterprise View
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="bg-premium-card rounded-2xl border border-premium-border shadow-sm p-1.5 backdrop-blur-sm">
                <nav className="flex overflow-x-auto gap-1 scrollbar-none">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap flex-shrink-0",
                                    isActive
                                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md shadow-slate-900/10"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("w-4 h-4", isActive ? "text-blue-400 dark:text-blue-600" : "")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <Suspense fallback={<TabSkeleton />}>
                {activeTab === "overview" && <OverviewTab />}
                {activeTab === "branches" && <BranchPerformanceTab />}
                {activeTab === "routes" && <RouteAnalyticsTab />}
                {activeTab === "delivery" && <DeliveryPerformanceTab />}
                {activeTab === "financial" && <FinancialInsightsTab />}
                {activeTab === "cancellations" && <CancellationTab />}
                {activeTab === "customers" && <CustomerInsightsTab />}
                {activeTab === "comparison" && <ComparisonTab />}
                {activeTab === "party-lookup" && <PartyLookupTab />}
            </Suspense>
        </div>
    );
}
