"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/super-admin/services/adminService";
import { Branch } from "@/shared/types";
import { cn } from "@/frontend/lib/utils";
import { Store } from "lucide-react";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface BranchOption {
    _id: string;
    name: string;
    branchCode: string;
}

interface BranchSelectProps {
    value?: string;
    onSelect: (branchId: string) => void;
    className?: string;
    placeholder?: string;
    scope?: string;
}

export function BranchSelect({ value, onSelect, className, placeholder = "Select a branch", scope }: BranchSelectProps) {
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBranches = async () => {
            setLoading(true);
            const { data } = await adminService.getAllBranches(scope);
            if (data) {
                setBranches(data);
            }
            setLoading(false);
        };
        fetchBranches();
    }, [scope]);

    return (
        <div className={cn("relative", className)}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Store className="w-4 h-4" />
            </div>
            <select
                value={value || ""}
                onChange={(e) => onSelect(e.target.value)}
                disabled={loading}
                className="h-10 w-[240px] appearance-none rounded-xl border border-premium-border bg-background/50 backdrop-blur-sm pl-9 pr-8 text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 disabled:opacity-50"
            >
                <option value="" disabled className="bg-background text-muted-foreground">
                    {placeholder}
                </option>
                {branches.map((branch) => (
                    <option key={branch._id} value={branch._id} className="bg-background text-foreground">
                        {branch.name} ({branch.branchCode})
                    </option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 opacity-50"
                >
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            </div>
            {loading && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size={14} />
                </div>
            )}
        </div>
    );
}
