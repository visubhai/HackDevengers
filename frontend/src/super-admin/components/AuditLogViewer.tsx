import { useState, useEffect } from "react";
import { adminService } from "@/super-admin/services/adminService";
import { History, Search, Filter, Calendar, User as UserIcon, Tag, Info, Eye } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/frontend/hooks/useDebounce";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";

export function AuditLogViewer() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [entityType, setEntityType] = useState("");
    const [action, setAction] = useState("");
    const [search, setSearch] = useState("");
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    const debouncedSearch = useDebounce(search, 500);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await adminService.getAuditLogs(page, 20, entityType, action, debouncedSearch);
        if (data) {
            setLogs(data.data || []);
            setTotal(data.total || 0);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [page, entityType, action, debouncedSearch]);

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        if (action.includes('UPDATE')) return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
        if (action.includes('DELETE')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        if (action.includes('LOGIN')) return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
        return 'bg-muted text-muted-foreground border-premium-border';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">System Audit logs</h2>
                    <p className="text-muted-foreground font-medium">Traceable record of all sensitive operations</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search logs or tracking..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-premium-border rounded-xl text-sm text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all transition-all"
                        />
                    </div>

                    <select
                        value={entityType}
                        onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                        className="bg-background border border-premium-border rounded-xl px-4 py-2 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all w-full sm:w-auto"
                    >
                        <option value="">All Entities</option>
                        <option value="Booking">Bookings</option>
                        <option value="User">Users</option>
                        <option value="Branch">Branches</option>
                        <option value="ReportPermission">Permissions</option>
                    </select>

                    <select
                        value={action}
                        onChange={(e) => { setAction(e.target.value); setPage(1); }}
                        className="bg-background border border-premium-border rounded-xl px-4 py-2 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all w-full sm:w-auto"
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE_USER">Create User</option>
                        <option value="UPDATE_USER">Update User</option>
                        <option value="DELETE_BOOKING">Delete Booking</option>
                        <option value="STATUS_CHANGE">Status Change</option>
                        <option value="LOGIN">Logins</option>
                    </select>
                </div>
            </div>

            <div className="bg-premium-card border border-premium-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    {/* Desktop Table View */}
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead>
                            <tr className="bg-muted/30 border-b border-premium-border">
                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Time (IST)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operator</th>
                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Activity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target</th>
                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Summary</th>
                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-premium-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-6 py-4"><div className="h-8 bg-slate-50 rounded-lg animate-pulse" /></td>
                                    </tr>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-muted-foreground text-xs font-medium">
                                                {format(new Date(log.createdAt), "dd MMM, HH:mm:ss")}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-[10px] font-bold">
                                                    {(log.userId?.name || '?').charAt(0)}
                                                </div>
                                                <div className="text-xs font-bold text-foreground">{log.userId?.name || 'System'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider ${getActionColor(log.action)}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-bold text-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
                                                {log.entityType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-500 font-medium max-w-[280px] line-clamp-1">
                                                {log.briefContext || "-"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1.5 hover:bg-muted border border-transparent hover:border-premium-border rounded-lg text-muted-foreground hover:text-primary transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <History className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="text-sm font-bold uppercase tracking-widest">No matching logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-28 bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse" />
                        ))
                    ) : logs.length > 0 ? (
                        logs.map((log) => (
                            <div key={log._id} className="bg-card p-3.5 rounded-xl border border-premium-border shadow-sm flex flex-col gap-2.5">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-[10px] font-bold">
                                            {(log.userId?.name || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-foreground">{log.userId?.name || 'System'}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium">
                                                {format(new Date(log.createdAt), "dd MMM, HH:mm")}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider ${getActionColor(log.action)}`}>
                                        {log.action.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="bg-muted/30 p-2 rounded-lg">
                                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 mx-0.5">Target: {log.entityType}</div>
                                    <div className="text-xs text-foreground font-medium line-clamp-2">
                                        {log.briefContext || "-"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(log)}
                                    className="w-full py-1.5 mt-1 bg-background border border-premium-border hover:bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Eye className="w-3 h-3 text-muted-foreground" /> View Detail
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No match</p>
                        </div>
                    )}
                </div>

                {(total > 20 || page > 1) && (
                    <div className="px-6 py-4 border-t border-premium-border flex items-center justify-between bg-muted/20">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Total {total} entries
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 bg-background border border-premium-border rounded-lg text-xs font-bold text-foreground disabled:opacity-30 shadow-sm hover:bg-muted transition-all"
                            >
                                PREVIOUS
                            </button>
                            <span className="text-xs font-black text-foreground bg-background px-2 py-1 rounded-md border border-premium-border min-w-8 text-center">{page}</span>
                            <button
                                disabled={page >= Math.ceil(total / 20)}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 bg-background border border-premium-border rounded-lg text-xs font-bold text-foreground disabled:opacity-30 shadow-sm hover:bg-muted transition-all"
                            >
                                NEXT
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Log Details Modal */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Log Detail Breakdown
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</label>
                                    <p className="font-bold text-slate-800">{selectedLog.action}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity Target</label>
                                    <p className="font-bold text-slate-800">{selectedLog.entityType} ({selectedLog.entityId})</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IP Address</label>
                                    <p className="text-sm font-medium text-slate-600 font-mono">{selectedLog.ipAddress || "Localhost/Unknown"}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</label>
                                    <p className="text-sm font-medium text-slate-600">{format(new Date(selectedLog.createdAt), "PPPP pppp")}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Context / Message</label>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                                    "{selectedLog.briefContext || "No context provided"}"
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Structural Change</label>
                                <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-[300px] text-[11px] font-mono text-blue-300 custom-scrollbar">
                                    <pre>{JSON.stringify({
                                        oldValue: selectedLog.oldValue,
                                        newValue: selectedLog.newValue
                                    }, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
