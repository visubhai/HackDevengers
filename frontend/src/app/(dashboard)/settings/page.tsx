"use client";

import { useState } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { ProfileSettings } from "@/frontend/components/settings/ProfileSettings";
import { UserManagement } from "@/frontend/components/settings/UserManagement";
import { BranchManagement } from "@/frontend/components/settings/BranchManagement";
import { SystemSettings } from "@/frontend/components/settings/SystemSettings";
import { AuditLogTable } from "@/frontend/components/settings/AuditLogTable";
import { DatabaseManagement } from "@/frontend/components/settings/DatabaseManagement";
import { BookingRouteManager } from "@/super-admin/components/BookingRouteManager";
import { User, Users, Building2, Settings as SettingsIcon, History, Database, Route, Sliders } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

export default function SettingsPage() {
    const { currentUser } = useBranchStore();
    const [activeTab, setActiveTab] = useState("profile");

    const tabs = [
        { id: "profile", label: "Profile Settings", icon: User, adminOnly: false },
        { id: "system", label: "System Settings", icon: Sliders, adminOnly: true },
        { id: "users", label: "User Management", icon: Users, adminOnly: true },
        { id: "branches", label: "Branch Management", icon: Building2, adminOnly: true },
        { id: "routes", label: "Booking Routes", icon: Route, adminOnly: true },
        { id: "logs", label: "Audit Logs", icon: History, adminOnly: true },
        { id: "database", label: "Storage & Database", icon: Database, adminOnly: true },
    ];

    const filteredTabs = tabs.filter(t => !t.adminOnly || currentUser?.role === 'SUPER_ADMIN');

    return (
        <main className="bg-transparent p-4 lg:p-8 pb-24">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Page Title */}
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your account and preferences</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-72 flex-shrink-0">
                        <div className="bg-premium-card rounded-2xl p-2 border border-premium-border shadow-sm sticky top-6 backdrop-blur-sm">
                            <nav className="space-y-1">
                                {filteredTabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200",
                                                isActive
                                                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md shadow-slate-900/10"
                                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1">
                        {activeTab === 'profile' && <ProfileSettings />}
                        {activeTab === 'system' && currentUser?.role === 'SUPER_ADMIN' && <SystemSettings />}
                        {activeTab === 'users' && currentUser?.role === 'SUPER_ADMIN' && <UserManagement />}
                        {activeTab === 'branches' && currentUser?.role === 'SUPER_ADMIN' && <BranchManagement />}
                        {activeTab === 'routes' && currentUser?.role === 'SUPER_ADMIN' && <BookingRouteManager />}
                        {activeTab === 'logs' && currentUser?.role === 'SUPER_ADMIN' && <AuditLogTable />}
                        {activeTab === 'database' && currentUser?.role === 'SUPER_ADMIN' && <DatabaseManagement />}
                    </div>
                </div>
            </div>
        </main>
    );
}
