import { useState, useEffect } from "react";
import { useBranches } from "@/frontend/hooks/useBranches";
import { useBranchStore } from "@/frontend/lib/store";
import { User, Role, ReportType, Branch } from "@/shared/types";
import { X, Check } from "lucide-react";
import { useToast } from "@/frontend/components/ui/toast";
import { adminService } from "@/super-admin/services/adminService";
import { useUsers } from "@/frontend/hooks/useUsers";

interface PermissionEditorProps {
    user: Partial<User> | null;
    isOpen: boolean;
    onClose: () => void;
}

const REPORT_TYPES: ReportType[] = ["BOOKING_REPORT", "DELIVERY_REPORT", "LEDGER_REPORT", "SUMMARY_REPORT", "DAILY_REPORT"];

export function PermissionEditor({ user, isOpen, onClose }: PermissionEditorProps) {
    const { branchObjects: branches } = useBranches();
    const { addToast } = useToast();
    const { mutate } = useUsers();
    const { currentUser, setCurrentUser } = useBranchStore();

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        password: "",
        email: "",
        role: "BRANCH" as Role,
        allowedBranches: [] as string[],
        allowedReports: [] as ReportType[],
        isActive: true,
        branchId: ""
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                username: user.username || "", // Keep for reference in payload, but hidden in UI
                password: "",
                email: user.email || "",
                role: user.role || "BRANCH",
                allowedBranches: user.allowedBranches || [],
                allowedReports: user.allowedReports || [],
                isActive: user.isActive ?? true,
                branchId: user.branchId || ""
            });
        }
    }, [user, isOpen]);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            let res;
            if (user?.id) {
                const payload = { ...formData };
                if (!payload.password) {
                    delete (payload as any).password;
                }
                if (!payload.username) {
                    delete (payload as any).username;
                }
                res = await adminService.updateUser(user.id, payload);
            } else {
                if (!formData.password) {
                    addToast("Password is required for new users", "error");
                    setIsLoading(false);
                    return;
                }
                res = await adminService.createUser(formData);
            }

            if (res.error) {
                addToast(res.error.message, "error");
            } else {
                addToast(user ? "User updated successfully" : "User created successfully", "success");
                
                // If the updated user is the current user, update the store
                const isSelf = user?.id === currentUser?.id || (user as any)?._id === currentUser?.id;
                if (isSelf && res.data) {
                    setCurrentUser(res.data);
                }
                
                mutate();
                onClose();
            }
        } catch (error: any) {
            addToast(error.message, "error");
        } finally {
            setIsLoading(false);
        }
    };


    const toggleReport = (report: ReportType) => {
        setFormData(prev => ({
            ...prev,
            allowedReports: prev.allowedReports.includes(report)
                ? prev.allowedReports.filter(r => r !== report)
                : [...prev.allowedReports, report]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-premium-card w-full max-w-2xl rounded-2xl border border-premium-border shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-premium-border flex justify-between items-center">
                    <h3 className="text-xl font-bold text-foreground">
                        {user ? "Edit Admin Permissions" : "Create New Admin"}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6" data-lenis-prevent>
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                            <input
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                            <input
                                type="email"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
                        <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.isActive}
                                    onChange={() => setFormData({ ...formData, isActive: true })}
                                    className="w-4 h-4 text-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Active</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={!formData.isActive}
                                    onChange={() => setFormData({ ...formData, isActive: false })}
                                    className="w-4 h-4 text-muted-foreground"
                                />
                                <span className="text-sm font-medium text-muted-foreground">Inactive</span>
                            </label>
                        </div>
                    </div>

                    {/* Primary Branch Selection */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Primary Branch (Belongs to)</label>
                        <select
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                            className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">Select Primary Branch</option>
                            {branches.map((b: any, index: number) => (
                                <option key={b._id || b.id || b.name || index} value={b._id || b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Branch Permissions */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                            <span>Allowed Branches</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, allowedBranches: branches.map((b: any) => b._id || b.id) }))}
                                    className="text-[10px] text-primary hover:underline hover:text-primary/80 font-bold uppercase"
                                >
                                    Select All
                                </button>
                                <span className="text-muted-foreground/30">|</span>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, allowedBranches: [] }))}
                                    className="text-[10px] text-muted-foreground hover:underline hover:text-red-500 font-bold uppercase"
                                >
                                    Clear All
                                </button>
                                <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    {formData.allowedBranches.length} Selected
                                </span>
                            </div>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {branches.map((b: any, index: number) => {
                                const branchId = b._id || b.id;
                                const isSelected = formData.allowedBranches.includes(branchId);
                                return (
                                    <label
                                        key={`allowed-${branchId || index}`}
                                        className={`
                                            flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                            ${isSelected
                                                ? "bg-primary/10 border-primary shadow-sm"
                                                : "bg-background/50 border-premium-border hover:border-primary/50"
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-5 h-5 rounded-full flex items-center justify-center border
                                            ${isSelected
                                                ? "bg-primary border-primary text-white"
                                                : "bg-background border-premium-border"
                                            }
                                        `}>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    allowedBranches: isSelected
                                                        ? prev.allowedBranches.filter(id => id !== branchId)
                                                        : [...prev.allowedBranches, branchId]
                                                }));
                                            }}
                                        />
                                        <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                                            {b.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Report Permissions */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                            Allowed Reports
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {formData.allowedReports.length} Selected
                            </span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {REPORT_TYPES.map(report => (
                                <label
                                    key={report}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                        ${formData.allowedReports.includes(report)
                                            ? "bg-primary/10 border-primary shadow-sm"
                                            : "bg-background/50 border-premium-border hover:border-primary/50"
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-5 h-5 rounded-full flex items-center justify-center border
                                        ${formData.allowedReports.includes(report)
                                            ? "bg-primary border-primary text-white"
                                            : "bg-background border-premium-border"
                                        }
                                    `}>
                                        {formData.allowedReports.includes(report) && <Check className="w-3 h-3" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={formData.allowedReports.includes(report)}
                                        onChange={() => toggleReport(report)}
                                    />
                                    <span className={`text-sm font-bold ${formData.allowedReports.includes(report) ? "text-primary" : "text-foreground"}`}>
                                        {report.replace('_REPORT', '').replace('_', ' ')}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-premium-border flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-muted-foreground font-bold hover:bg-muted rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-primary/10"
                    >
                        Save Permissions
                    </button>
                </div>
            </div>
        </div>
    );
}
