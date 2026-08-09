"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    PackageCheck,
    PackageOpen,
    BarChart3
} from "lucide-react";
import { cn } from "@/frontend/lib/utils";

const navItems = [
    { name: "Book", href: "/", icon: LayoutDashboard },
    { name: "Godown", href: "/inbound", icon: PackageCheck },
    { name: "Deliver", href: "/delivered", icon: PackageOpen },
    { name: "Reports", href: "/reports", icon: BarChart3 },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <div className="lg:hidden print:hidden fixed bottom-0 left-0 right-0 h-16 bg-premium-header/90 backdrop-blur-xl border-t border-slate-800/60 z-50 px-2 pb-[env(safe-area-inset-bottom)] flex items-center justify-around">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all",
                            isActive ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-xl transition-all duration-300",
                            isActive ? "bg-blue-500/10 text-blue-500" : "text-slate-400"
                        )}>
                            <item.icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            isActive ? "opacity-100" : "opacity-80"
                        )}>
                            {item.name}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
