"use client";

import { useState, useEffect } from "react";
import { PermissionEditor } from "@/super-admin/components/PermissionEditor";
import { BranchManager } from "@/super-admin/components/BranchManager";
import { AdminOverview } from "@/super-admin/components/AdminOverview";
import { AdminList } from "@/super-admin/components/AdminList";
import { AuditLogViewer } from "@/super-admin/components/AuditLogViewer";
import { SettingsManager } from "@/super-admin/components/SettingsManager";
import { BookingRouteManager } from "@/super-admin/components/BookingRouteManager";
import { ReportPermissionManager } from "@/super-admin/components/ReportPermissionManager";
import { ProfileSettings } from "@/frontend/components/settings/ProfileSettings";
import { User } from "@/shared/types";
import { ShieldAlert, Landmark, LayoutDashboard, History, Settings, Users, Route, ClipboardCheck, UserCircle } from "lucide-react";
import { useBranchStore } from "@/frontend/lib/store";
import { cn } from "@/frontend/lib/utils";

type TabType = 'overview' | 'branches' | 'admins' | 'audit' | 'booking' | 'report' | 'settings' | 'profile';

export default function SuperAdminDashboard() {
    const { currentUser } = useBranchStore();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Access Control
    if (currentUser?.role !== 'SUPER_ADMIN') {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-4">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
                <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
        { id: 'branches' as const, label: 'Branches', icon: Landmark },
        { id: 'admins' as const, label: 'Admins', icon: Users },
        { id: 'audit' as const, label: 'Audit Logs', icon: History },
        { id: 'booking' as const, label: 'Booking', icon: Route },
        { id: 'report' as const, label: 'Report Permission', icon: ClipboardCheck },
        { id: 'settings' as const, label: 'Settings', icon: Settings },
        { id: 'profile' as const, label: 'Profile', icon: UserCircle },
    ];

    const handleEditAdmin = (user: User) => {
        setSelectedUser(user);
        setIsEditOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">System Console</h1>
                    <p className="text-muted-foreground font-medium">Global administration and network configuration</p>
                </div>

                <div className="flex bg-premium-card p-1.5 rounded-2xl border border-premium-border overflow-x-auto no-scrollbar shadow-sm">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "bg-muted text-primary shadow-sm" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'overview' && <AdminOverview />}

                {activeTab === 'branches' && <BranchManager />}

                {activeTab === 'admins' && <AdminList onEdit={handleEditAdmin} />}

                {activeTab === 'audit' && <AuditLogViewer />}

                {activeTab === 'booking' && <BookingRouteManager />}

                {activeTab === 'report' && <ReportPermissionManager />}

                {activeTab === 'settings' && <SettingsManager />}

                {activeTab === 'profile' && <ProfileSettings />}
            </div>

            <PermissionEditor
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                user={selectedUser as User}
            />
        </div>
    );
}
