"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/frontend/hooks/useBranches";
import { adminService } from "@/super-admin/services/adminService";
import { ReportType } from "@/shared/types";
import { useBranchStore } from "@/frontend/lib/store";
import { ShieldCheck, Save, Trash2, CircleCheckBig } from "lucide-react";
import { LoadingSpinner } from "@/frontend/components/ui/LoadingSpinner";
import { Card, CardHeader, CardTitle, CardContent } from "@/frontend/components/ui/card";
import { useToast } from "@/frontend/components/ui/toast";

const REPORT_OPTIONS: { id: ReportType; label: string; description: string }[] = [
    { id: "DAILY_REPORT", label: "Daily Report", description: "View daily booking summaries and totals" },
    { id: "DELIVERY_REPORT", label: "Delivery Report", description: "Monitor delivered parcels and delivery performance" },
    { id: "LEDGER_REPORT", label: "Ledger Report", description: "Access branch financial transactions and revenue" },
    { id: "SUMMARY_REPORT", label: "Summary Report", description: "High-level overview of branch operations" },
    { id: "BOOKING_REPORT", label: "Booking Report", description: "Detailed list of all bookings and their status" }
];

export default function ReportPermissionsPage() {
    const { currentUser } = useBranchStore();
    const { branchObjects, loading: branchesLoading } = useBranches();
    const { addToast } = useToast();

    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const [allowedReports, setAllowedReports] = useState<ReportType[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch permissions when branch selected
    useEffect(() => {
        if (!selectedBranchId) return;

        const fetchPermissions = async () => {
            setLoading(true);
            const { data, error } = await adminService.getBranchPermissions(selectedBranchId);
            if (!error && data) {
                setAllowedReports(data.allowedReports || []);
            } else {
                setAllowedReports([]); // New branch or error
            }
            setLoading(false);
        };

        fetchPermissions();
    }, [selectedBranchId]);

    const handleToggle = (report: ReportType) => {
        setAllowedReports(prev =>
            prev.includes(report)
                ? prev.filter(r => r !== report)
                : [...prev, report]
        );
    };

    const handleSave = async () => {
        if (!selectedBranchId) return;

        setSaving(true);
        const { error } = await adminService.updateBranchPermissions(selectedBranchId, allowedReports);

        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast("Permissions updated successfully", 'success');
        }
        setSaving(false);
    };

    if (currentUser?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Super Admin Only</h2>
                <p className="text-slate-500">You do not have permission to manage report visibility.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Report Visibility</h1>
                <p className="text-slate-500 font-medium mt-1">Control which reports are accessible to each branch</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Branch Selection */}
                <Card className="col-span-1 border-none shadow-xl bg-slate-900 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Select Branch</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {branchesLoading ? (
                            <div className="flex justify-center p-4">
                                <LoadingSpinner size={24} />
                            </div>
                        ) : (
                            branchObjects.map(branch => (
                                <button
                                    key={branch._id}
                                    onClick={() => setSelectedBranchId(branch._id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedBranchId === branch._id
                                        ? "bg-white text-slate-900 shadow-lg"
                                        : "hover:bg-slate-800 text-slate-400"
                                        }`}
                                >
                                    {branch.name}
                                    <span className="block text-[10px] opacity-60 font-medium">{branch.branchCode}</span>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Permissions Management */}
                <div className="md:col-span-2 space-y-6">
                    {selectedBranchId ? (
                        <>
                            <Card className="border-slate-200 shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <CardTitle className="text-xl">Enabled Reports</CardTitle>
                                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 rounded-full text-slate-600">
                                        {allowedReports.length} Selected
                                    </span>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <LoadingSpinner size={32} />
                                            <p className="text-slate-400 mt-2 font-medium">Loading permissions...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {REPORT_OPTIONS.map(report => (
                                                <div
                                                    key={report.id}
                                                    onClick={() => handleToggle(report.id)}
                                                    className={`group flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${allowedReports.includes(report.id)
                                                        ? "bg-indigo-50 border-indigo-500"
                                                        : "bg-white border-slate-100 hover:border-slate-200"
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${allowedReports.includes(report.id)
                                                        ? "bg-indigo-600 text-white"
                                                        : "border-2 border-slate-200 text-transparent"
                                                        }`}>
                                                        <CircleCheckBig className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`font-bold ${allowedReports.includes(report.id) ? "text-indigo-900" : "text-slate-700"}`}>
                                                            {report.label}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-medium">{report.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setAllowedReports([])}
                                    className="flex items-center gap-2 px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Clear All
                                </button>
                                <button
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? <LoadingSpinner size={20} /> : <Save className="w-5 h-5" />}
                                    Save Permissions
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl h-[400px]">
                            <p className="text-slate-400 font-bold text-lg">Select a branch to manage visibility</p>
                            <p className="text-slate-400 text-sm mt-1">Changes are applied immediately after saving</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
