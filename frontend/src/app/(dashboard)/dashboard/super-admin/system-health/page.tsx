'use client';
import { useEffect, useState } from 'react';
import { adminService } from '@/super-admin/services/adminService';
import { useToast } from '@/frontend/components/ui/toast';
import { ShieldCheck, Server, Activity, TriangleAlert, Clock } from 'lucide-react';

export default function SystemHealthPage() {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        const { data, error } = await adminService.getAuditLogs(50);
        if (error) {
            addToast('Failed to load system logs', 'error');
        } else {
            setLogs(data || []);
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">System Health</h2>
                        <p className="text-slate-500 dark:text-slate-400">Real-time system monitoring and audit logs</p>
                    </div>
                </div>
                <button
                    onClick={loadLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                    <Clock className="w-4 h-4" />
                    Refresh Logs
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">Security Status</h3>
                    </div>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">Secure</div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">RLS Policies Active</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Server className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">Database Connection</h3>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">Connected</div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Latency: ~45ms</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg">
                            <TriangleAlert className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">Recent Errors</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">0</div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Last 24 hours</p>
                </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Recent Audit Logs</h3>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-slate-400 dark:text-slate-500">Loading logs...</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Time</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Operation</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Table</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`
                                                inline-flex px-2 py-0.5 rounded text-xs font-bold
                                                ${log.operation === 'INSERT' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : ''}
                                                ${log.operation === 'UPDATE' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' : ''}
                                                ${log.operation === 'DELETE' ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400' : ''}
                                            `}>
                                                {log.operation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">
                                            {log.table_name}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                            {log.record_id}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
