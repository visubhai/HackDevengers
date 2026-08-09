"use client";

import { useState } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { useBranches } from "@/frontend/hooks/useBranches";
import { Download, Trash2, Database, TriangleAlert, Filter } from "lucide-react";
import { useToast } from "@/frontend/components/ui/toast";
import { fetchApi, parseError } from "@/frontend/services/base";

export const DatabaseManagement = () => {
    const { currentUser } = useBranchStore();
    const { addToast } = useToast();
    const { branchObjects } = useBranches();

    const [beforeDate, setBeforeDate] = useState("");
    const [afterDate, setAfterDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasDownloaded, setHasDownloaded] = useState(false);

    if (currentUser?.role !== "SUPER_ADMIN") {
        return null;
    }

    const handleDownload = async () => {
        if (!beforeDate) {
            addToast("Please select a 'Before Date'.", "error");
            return;
        }

        try {
            setIsDownloading(true);

            // Construct query params
            const params = new URLSearchParams();
            params.append("beforeDate", beforeDate);
            if (afterDate) params.append("afterDate", afterDate);
            if (statusFilter) params.append("status", statusFilter);
            if (branchFilter) params.append("branchId", branchFilter);

            const res = await fetchApi(`/superadmin/database/backup?${params.toString()}`);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(parseError(errorData) || "Failed to download backup");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logiopen-backup-${beforeDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setHasDownloaded(true);
            addToast("You have successfully downloaded the data backup.", "success");
        } catch (error: any) {
            console.error("Backup Download Error:", error);
            addToast(error.message || "Failed to download backup", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDelete = async () => {
        if (!hasDownloaded) {
            addToast("You must download the backup before deleting data.", "error");
            return;
        }
        if (confirmation !== "CONFIRM_DELETE") {
            addToast("Please type CONFIRM_DELETE exactly.", "error");
            return;
        }

        try {
            setIsDeleting(true);
            const res = await fetchApi(`/superadmin/database/cleanup`, {
                method: 'POST',
                body: JSON.stringify({
                    beforeDate,
                    afterDate: afterDate || undefined,
                    status: statusFilter || undefined,
                    branchId: branchFilter || undefined,
                    confirmation
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data) || "Failed to delete data");

            addToast(data.message || "Data successfully cleaned up.", "success");

            // Reset state
            setBeforeDate("");
            setConfirmation("");
            setHasDownloaded(false);
        } catch (error: any) {
            addToast(error.message || "Failed to delete data", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-premium-card rounded-3xl border border-premium-border shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        Storage & Database Management
                    </h2>
                    <p className="text-muted-foreground mt-1 max-w-2xl">
                        Free up database storage by downloading structural data older than a specific date and securely deleting it from the live database.
                    </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                    <div className="flex gap-4">
                        <TriangleAlert className="w-6 h-6 text-amber-500 flex-shrink-0" />
                        <div>
                            <h3 className="text-amber-500 font-bold mb-1">Danger Zone</h3>
                            <p className="text-amber-500/80 text-sm">
                                Deleting old data cannot be undone. Always ensure you have downloaded and securely saved your backup file before proceeding. <b>You will only be allowed to delete data after you have downloaded the backup for that specific date.</b>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-muted/30 border border-premium-border rounded-2xl p-6 mb-8">
                    <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-primary" />
                        Advanced Filters (Optional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">After Date</label>
                            <input
                                type="date"
                                value={afterDate}
                                onChange={(e) => {
                                    setAfterDate(e.target.value);
                                    setHasDownloaded(false);
                                }}
                                className="w-full rounded-xl border-premium-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setHasDownloaded(false);
                                }}
                                className="w-full rounded-xl border-premium-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                            >
                                <option value="">All Statuses</option>
                                <option value="DELIVERED">Delivered Only</option>
                                <option value="CANCELLED">Cancelled Only</option>
                                <option value="PENDING">Pending Only</option>
                                <option value="BOOKED">Booked Only</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Branch (From/To)</label>
                            <select
                                value={branchFilter}
                                onChange={(e) => {
                                    setBranchFilter(e.target.value);
                                    setHasDownloaded(false);
                                }}
                                className="w-full rounded-xl border-premium-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                            >
                                <option value="">All Branches</option>
                                {branchObjects?.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    {/* Step 1: Backup */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">1</span>
                            Backup Old Data
                        </h3>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground">Data Before Date (Inclusive)</label>
                            <input
                                type="date"
                                value={beforeDate}
                                onChange={(e) => {
                                    setBeforeDate(e.target.value);
                                    setHasDownloaded(false); // Reset if date changes
                                }}
                                className="w-full rounded-xl border-premium-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                            />
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={!beforeDate || isDownloading}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all"
                        >
                            {isDownloading ? <span className="animate-pulse">Preparing Backup...</span> : <><Download className="w-4 h-4" /> Download Excel Backup</>}
                        </button>
                    </div>

                    {/* Step 2: Delete */}
                    <div className={`space-y-4 transition-opacity duration-300 ${!hasDownloaded ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            <span className="bg-red-500/10 text-red-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">2</span>
                            Securely Delete
                        </h3>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground">Type "CONFIRM_DELETE"</label>
                            <input
                                type="text"
                                placeholder="CONFIRM_DELETE"
                                value={confirmation}
                                onChange={(e) => setConfirmation(e.target.value)}
                                disabled={!hasDownloaded}
                                className="w-full rounded-xl border-premium-border bg-background px-4 py-3 text-sm text-foreground focus:border-red-500 focus:ring-red-500 font-medium placeholder:text-muted-foreground/30"
                            />
                        </div>

                        <button
                            onClick={handleDelete}
                            disabled={!hasDownloaded || confirmation !== "CONFIRM_DELETE" || isDeleting}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all"
                        >
                            {isDeleting ? <span className="animate-pulse">Deleting...</span> : <><Trash2 className="w-4 h-4" /> Permanently Delete Data</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
