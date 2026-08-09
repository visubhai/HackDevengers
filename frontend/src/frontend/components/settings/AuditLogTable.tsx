"use client";

import { useState, useEffect } from "react";
import { adminService } from "@/super-admin/services/adminService";
import { History, Search, Filter, ChevronLeft, ChevronRight, User } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import { useToast } from "@/frontend/components/ui/toast";

export function AuditLogTable() {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [isLoading, setIsLoading] = useState(true);
    const [entityType, setEntityType] = useState("");
    const [action, setAction] = useState("");

    const fetchLogs = async () => {
        setIsLoading(true);
        const { data, error } = await adminService.getAuditLogs(page, limit, entityType, action);
        if (error) {
            addToast("Failed to fetch audit logs: " + error.message, "error");
        } else {
            setLogs(data.data);
            setTotal(data.total);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [page, entityType, action]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-500/20 text-white">
                        <History className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">System Audit Logs</h2>
                        <p className="text-slate-500">Track all critical actions and changes across the system</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={entityType}
                        onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium text-slate-700 appearance-none"
                    >
                        <option value="">All Entities</option>
                        <option value="Booking">Bookings</option>
                        <option value="User">Users</option>
                        <option value="Branch">Branches</option>
                    </select>
                </div>
                <div className="relative">
                    <History className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={action}
                        onChange={(e) => { setAction(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium text-slate-700 appearance-none"
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="STATUS_CHANGE">Status Change</option>
                        <option value="PASSWORD_RESET">Password Reset</option>
                    </select>
                </div>
                <div className="flex items-center justify-end">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{total} Total Events</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Entity</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-bold text-slate-700">
                                                {new Date(log.createdAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase">
                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
                                                    {log.userId?.name?.charAt(0) || "S"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 leading-none">{log.userId?.name || "System"}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{log.userId?.role?.replace('_', ' ')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider border",
                                                log.action === 'PASSWORD_RESET' ? "bg-red-50 text-red-600 border-red-100" :
                                                    log.action === 'STATUS_CHANGE' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                        log.action === 'UPDATE_BOOKING' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                            "bg-slate-50 text-slate-600 border-slate-200"
                                            )}>
                                                {log.action.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-700">{log.entityType}</p>
                                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: {log.entityId.slice(-8)}</p>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            {log.newValue ? (
                                                <div className="text-[11px] text-slate-600 font-medium">
                                                    {typeof log.newValue === 'object' ?
                                                        Object.entries(log.newValue).map(([k, v]) => (
                                                            <div key={k} className="flex gap-1 truncate">
                                                                <span className="text-slate-400 font-bold uppercase text-[9px]">{k}:</span>
                                                                <span className="text-slate-800">{String(v)}</span>
                                                            </div>
                                                        )) :
                                                        <span>{String(log.newValue)}</span>
                                                    }
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 italic">No value data</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <p className="text-sm font-medium text-slate-400 italic">No audit logs found matching your criteria</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 hover:bg-white rounded-lg border border-slate-200 disabled:opacity-50 transition-all text-slate-500"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 hover:bg-white rounded-lg border border-slate-200 disabled:opacity-50 transition-all text-slate-500"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
