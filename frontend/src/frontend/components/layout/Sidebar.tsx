"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    PlusCircle,
    PackageCheck,
    BarChart3,
    Settings,
    PackageOpen,
    TrendingUp
} from "lucide-react";
import { cn } from "@/frontend/lib/utils";

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    // { name: "New Booking", href: "/booking", icon: PlusCircle }, // Assuming Dashboard is Booking for now or separate?
    // User req: "Page 1: The Booking Dashboard (Home)" -> So Home is Booking.
    { name: "Godown Stock", href: "/inbound", icon: PackageCheck },
    { name: "Delivered", href: "/delivered", icon: PackageOpen },
    { name: "Reports", href: "/reports", icon: BarChart3 },
];

import { useState, useRef } from "react";
import { useBranchStore } from "@/frontend/lib/store";

export function Sidebar() {
    const pathname = usePathname();
    const { currentUser, isMobileMenuOpen, closeMobileMenu } = useBranchStore();
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<any>(null);

    const handleMouseEnter = () => {
        // Clear any existing timeout first
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        // Delay expansion by 300ms to ensure deliberate intent (prevents accidental opens)
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
        }, 300);
    };

    const handleMouseLeave = () => {
        // Immediately cancel the expansion timeout if the mouse leaves early
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        // Collapse the sidebar immediately when leaving
        setIsHovered(false);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    onClick={closeMobileMenu}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                />
            )}

            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    "h-screen bg-premium-sidebar text-white hidden md:flex flex-col border-r border-slate-800 dark:border-slate-900 z-50 print:hidden relative transition-all duration-300 ease-in-out",
                    "w-64",
                    isHovered ? "md:w-64" : "md:w-20"
                )}
            >
                {/* Abstract Background Patterns - Matches Login Page */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
                </div>

                <div className="relative z-10 h-full flex flex-col">

                    <div className="h-24 flex items-center px-6 border-b border-white/5 bg-transparent shrink-0 overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-white shadow-lg overflow-hidden border border-white/20 p-0.5 relative">
                                <Image
                                    src="/images/savan-logo.png"
                                    alt="Savan Travels Logo"
                                    fill
                                    sizes="48px"
                                    className="object-cover rounded-full"
                                />
                            </div>
                            <h1 className={cn(
                                "text-xl font-bold tracking-tight text-white transition-opacity duration-300 whitespace-nowrap flex flex-col items-start leading-tight",
                                isHovered ? "opacity-100" : "lg:opacity-0 lg:w-0 opacity-100"
                            )}>
                                SAVAN
                                <span className="text-[#f25c05] text-sm uppercase tracking-wider">Travels</span>
                            </h1>
                        </div>
                    </div>

                    <nav className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                                        isActive
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <item.icon className="w-6 h-6 shrink-0" />
                                    <span className={cn(
                                        "transition-all duration-300 whitespace-nowrap",
                                        isHovered ? "opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:w-0 opacity-100 translate-x-0"
                                    )}>
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}

                        {/* Super Admin Links */}
                        {currentUser?.role === "SUPER_ADMIN" && (
                            <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                                <p className={cn(
                                    "px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 transition-opacity duration-300 whitespace-nowrap",
                                    isHovered ? "opacity-100" : "lg:opacity-0 lg:hidden opacity-100"
                                )}>
                                    Admin Control
                                </p>

                                <Link
                                    href="/analytics"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                                        pathname === "/analytics"
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20"
                                            : "text-indigo-300 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <TrendingUp className="w-6 h-6 shrink-0" />
                                    <span className={cn(
                                        "transition-all duration-300 whitespace-nowrap",
                                        isHovered ? "opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:w-0 opacity-100 translate-x-0"
                                    )}>
                                        Analytics
                                    </span>
                                </Link>

                                <Link
                                    href="/dashboard/super-admin"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                                        pathname === "/dashboard/super-admin"
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20"
                                            : "text-indigo-300 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <Settings className="w-6 h-6 shrink-0" />
                                    <span className={cn(
                                        "transition-all duration-300 whitespace-nowrap",
                                        isHovered ? "opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:w-0 opacity-100 translate-x-0"
                                    )}>
                                        User Management
                                    </span>
                                </Link>
                            </div>
                        )}
                    </nav>

                    <div className="p-3 border-t border-white/5 overflow-hidden">
                        <div className={cn(
                            "bg-white/5 rounded-xl p-2 backdrop-blur-md border border-white/10 flex items-center transition-all duration-300",
                            isHovered ? "gap-3" : "lg:justify-center lg:gap-0 gap-3 justify-start"
                        )}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold ring-2 ring-white/10 shrink-0">
                                {(currentUser?.username || currentUser?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className={cn(
                                "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
                                isHovered ? "opacity-100 w-auto" : "lg:opacity-0 lg:w-0 opacity-100 w-auto"
                            )}>
                                <p className="text-xs text-slate-400">Logged in as</p>
                                <p className="text-sm font-bold text-white truncate">{currentUser?.name || currentUser?.username}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
