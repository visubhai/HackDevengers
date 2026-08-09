import { useState } from "react";
import { useBranches } from "@/frontend/hooks/useBranches";
import { useBranchStore } from "@/frontend/lib/store";
import { adminService } from "@/super-admin/services/adminService";
import { useToast } from "@/frontend/components/ui/toast";
import { Plus, Edit2, Trash2, MapPin, Building2, CircleCheck, CircleX, X, Eye, EyeOff, TriangleAlert, RefreshCw, Copy, Check, CreditCard } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

export function BranchManager() {
    const { branchObjects, loading, refresh } = useBranches();
    const { currentUser, checkSession } = useBranchStore();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedItem, setCopiedItem] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        branchCode: "",
        state: "",
        address: "",
        phone: "",
        username: "",
        password: "",
        isActive: true,
        whatsappNotificationsEnabled: true,
        allowedPaymentTypes: ["Paid", "To Pay"] as string[]
    });

    const handleCopy = (text: string, type: 'username' | 'password') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedItem(type);
        setTimeout(() => setCopiedItem(null), 2000);
        addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} copied!`, "success");
    };

    const handleGeneratePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let retVal = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        setFormData(prev => ({ ...prev, password: retVal }));
        setShowPassword(true);
    };

    const openModal = (branch: any = null) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name,
                branchCode: branch.branchCode,
                state: branch.state || "",
                address: branch.address || "",
                phone: branch.phone || "",
                username: branch.username || "", // Populate current username
                password: "",
                isActive: branch.isActive ?? true,
                whatsappNotificationsEnabled: branch.whatsappNotificationsEnabled ?? true,
                allowedPaymentTypes: branch.allowedPaymentTypes?.length ? branch.allowedPaymentTypes : ["Paid", "To Pay"]
            });
        } else {
            setEditingBranch(null);
            setFormData({
                name: "",
                branchCode: "",
                state: "",
                address: "",
                phone: "",
                username: "",
                password: "",
                isActive: true,
                whatsappNotificationsEnabled: true,
                allowedPaymentTypes: ["Paid", "To Pay"]
            });
        }
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Advanced Logic: Validation for existing branches
        if (editingBranch) {
            const isUsernameChanged = formData.username !== "" && formData.username !== editingBranch.username;
            const isPasswordChanged = formData.password !== "";
            const isBranchCodeChanged = formData.branchCode !== editingBranch.branchCode;

            if (isUsernameChanged || isPasswordChanged || isBranchCodeChanged) {
                const confirmMsg = "Warning: You are changing sensitive branch details (Branch Code, Username, or Password). This may affect active sessions for this branch. Are you sure you want to proceed?";
                if (!window.confirm(confirmMsg)) {
                    return;
                }
            }
        }

        setIsSubmitting(true);
        try {
            let res;
            const payload = { ...formData };
            if (editingBranch) {
                // To allow updating username/password, we only delete them if they are explicitly empty strings
                if (payload.password === "") delete (payload as any).password;
                if (payload.username === "") delete (payload as any).username;
                res = await adminService.updateBranch(editingBranch._id, payload);
            } else {
                res = await adminService.createBranch(payload);
            }

            if (res.error) {
                addToast(res.error.message, "error");
            } else {
                addToast(editingBranch ? "Branch details updated successfully" : "Branch created successfully", "success");
                refresh();
                
                // If the updated branch is the one current user belongs to, refresh session/store
                if (editingBranch && currentUser?.branchId === editingBranch._id) {
                    await checkSession();
                }
                
                setIsModalOpen(false);
            }
        } catch (error: any) {
            addToast(error.message || "An error occurred", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBranch = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to PERMANENTLY delete the branch '${name}'? This will also delete all admin accounts linked to this branch. This action cannot be undone.`)) {
            const res = await adminService.deleteBranch(id);
            if (res.error) {
                // The backend now returns a 400 if bookings exist
                addToast(res.error.message, "error");
            } else {
                addToast("Branch and associated users deleted successfully", "success");
                refresh();
            }
        }
    };

    if (loading && !branchObjects.length) return <div className="p-8 text-center text-slate-500">Loading branches...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Branch Management</h2>
                    <p className="text-muted-foreground text-sm">Create and manage your logistics network</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" /> Add Branch
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchObjects.map((branch: any) => (
                    <div key={branch._id} className="bg-premium-card border border-premium-border rounded-2xl p-5 hover:shadow-xl hover:border-primary/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                                    {branch.branchCode}
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">{branch.name}</h3>
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{branch.state}</p>
                                        <p className="text-[9px] text-primary/70 font-mono tracking-tight lowercase">u: {branch.username || "unset"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={() => openModal(branch)}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    title="Edit Branch"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteBranch(branch._id, branch.name)}
                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Delete Branch"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 text-muted-foreground/50" />
                                <span className="truncate">{branch.address || "No address provided"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="w-4 h-4 text-muted-foreground/50" />
                                <span>{branch.phone || "No contact info"}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-premium-border">
                            <div className={cn(
                                "flex items-center gap-1.5 text-xs font-bold",
                                branch.isActive ? "text-green-500" : "text-muted-foreground"
                            )}>
                                {branch.isActive ? <CircleCheck className="w-4 h-4" /> : <CircleX className="w-4 h-4" />}
                                {branch.isActive ? "ACTIVE" : "INACTIVE"}
                            </div>
                            <div className={cn(
                                "flex items-center gap-1.5 text-[10px] font-black tracking-widest",
                                branch.whatsappNotificationsEnabled !== false ? "text-emerald-500" : "text-amber-500"
                            )}>
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full animate-pulse",
                                    branch.whatsappNotificationsEnabled !== false ? "bg-emerald-500" : "bg-amber-500"
                                )} />
                                WA: {branch.whatsappNotificationsEnabled !== false ? "ON" : "OFF"}
                            </div>
                        </div>
                        {(() => {
                            const types: string[] = branch.allowedPaymentTypes?.length ? branch.allowedPaymentTypes : ["Paid", "To Pay"];
                            const isBoth = types.includes("Paid") && types.includes("To Pay");
                            return !isBoth ? (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400">
                                    <CreditCard className="w-3 h-3" />
                                    {types[0] === "To Pay" ? "TO PAY ONLY" : "PAID ONLY"}
                                </div>
                            ) : null;
                        })()}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-premium-card w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-premium-border">
                        <div className="shrink-0 p-6 border-b border-premium-border flex justify-between items-center">
                            <h3 className="text-xl font-bold text-foreground">{editingBranch ? "Edit Branch" : "Add New Branch"}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto" data-lenis-prevent>
                            {/* Branch Details Section */}
                            <div className="space-y-4">
                                <h4 className="text-sm border-b border-premium-border pb-2 font-bold text-foreground">Branch Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Branch Name</label>
                                        <input
                                            required
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Branch Code</label>
                                        <input
                                            required
                                            value={formData.branchCode}
                                            onChange={e => setFormData({ ...formData, branchCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                                            placeholder="e.g. BAPUNAGAR"
                                            className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-foreground outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">State</label>
                                    <input
                                        required
                                        value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })}
                                        className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Phone</label>
                                    <input
                                        value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Address</label>
                                    <textarea
                                        value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 bg-background/50 border border-premium-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none h-20"
                                    />
                                </div>
                            </div>

                            {/* Admin Credentials Section */}
                            <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-premium-border">
                                <h4 className="text-sm border-b border-premium-border pb-2 font-bold text-foreground flex items-center gap-2">
                                    <TriangleAlert className="w-4 h-4 text-amber-500" />
                                    Admin User Credentials
                                </h4>
                                <p className="text-xs font-normal text-muted-foreground mt-1">
                                    {editingBranch ? "Careful: Changing these will immediately update login access." : "If left blank, secure defaults will be generated."}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                                            <span>Username</span>
                                            {editingBranch && <span className="text-[10px] text-primary/60 font-mono">ID: {editingBranch._id.slice(-6)}</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                value={formData.username}
                                                onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                                                placeholder={editingBranch ? `Change to:` : (formData.branchCode ? formData.branchCode.toLowerCase() : "Auto-generated")}
                                                className="w-full pl-3 pr-10 py-2 bg-background border border-premium-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                            {formData.username && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(formData.username, 'username')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    title="Copy Username"
                                                >
                                                    {copiedItem === 'username' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                                            <span>Password</span>
                                            <div className="flex gap-2">
                                                {editingBranch && <span className="text-[9px] text-amber-600 font-bold uppercase tracking-tighter">Encrypted State</span>}
                                                <button
                                                    type="button"
                                                    onClick={handleGeneratePassword}
                                                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 font-bold"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> New Secure
                                                </button>
                                            </div>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder={editingBranch ? "•••••••• Securely Managed ••••••••" : "Auto-generated"}
                                                className="w-full pl-3 pr-16 py-2 bg-background border border-premium-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="text-muted-foreground hover:text-foreground focus:outline-none"
                                                    title={showPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                {formData.password && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(formData.password, 'password')}
                                                        className="text-muted-foreground hover:text-foreground focus:outline-none"
                                                        title="Copy Password"
                                                    >
                                                        {copiedItem === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 text-foreground">
                                <input
                                    type="checkbox"
                                    id="branchActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <label htmlFor="branchActive" className="text-sm font-bold">Active Branch</label>
                            </div>
                            <div className="flex items-center gap-2 pt-2 text-foreground">
                                <input
                                    type="checkbox"
                                    id="branchWA"
                                    checked={formData.whatsappNotificationsEnabled}
                                    onChange={e => setFormData({ ...formData, whatsappNotificationsEnabled: e.target.checked })}
                                    className="w-4 h-4 text-emerald-500 rounded"
                                />
                                <label htmlFor="branchWA" className="text-sm font-bold text-emerald-600">WhatsApp Notifications Enabled</label>
                            </div>

                            {/* Allowed Booking Types */}
                            <div className="space-y-2 pt-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" /> Allowed Booking Types
                                </label>
                                <div className="flex gap-2">
                                    {(["To Pay", "Paid"] as const).map((type) => {
                                        const active = formData.allowedPaymentTypes.includes(type);
                                        return (
                                            <button
                                                type="button"
                                                key={type}
                                                onClick={() => {
                                                    if (active) {
                                                        if (formData.allowedPaymentTypes.length === 1) return;
                                                        setFormData({ ...formData, allowedPaymentTypes: formData.allowedPaymentTypes.filter(t => t !== type) });
                                                    } else {
                                                        setFormData({ ...formData, allowedPaymentTypes: [...formData.allowedPaymentTypes, type] });
                                                    }
                                                }}
                                                className={cn(
                                                    "flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all",
                                                    active
                                                        ? type === "To Pay"
                                                            ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500"
                                                            : "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500"
                                                        : "border-premium-border text-muted-foreground"
                                                )}
                                            >
                                                {active && <span className="mr-1">✓</span>}{type}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-muted-foreground">At least one type must be selected. Default is both.</p>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 text-muted-foreground font-bold hover:bg-muted rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    {isSubmitting ? "Saving..." : "Save Branch"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
