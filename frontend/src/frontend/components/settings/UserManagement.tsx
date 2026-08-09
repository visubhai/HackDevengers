import { PermissionEditor } from "@/super-admin/components/PermissionEditor";
import { User, Role } from "@/shared/types";
import { Users, Shield, Key, Eye, EyeOff, X, Edit2 } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { adminService } from "@/super-admin/services/adminService";
import { useToast } from "@/frontend/components/ui/toast";
import { useUsers } from "@/frontend/hooks/useUsers";

export function UserManagement() {
    const { users } = useUsers();
    const { addToast } = useToast();
    const [resettingUser, setResettingUser] = useState<any | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);

    useEffect(() => {
        if (resettingUser) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [resettingUser]);

    const handleResetPassword = async () => {
        if (!resettingUser || !newPassword) return;
        if (newPassword.length < 6) {
            addToast("Password must be at least 6 characters", "error");
            return;
        }

        setIsSubmitting(true);
        const { error } = await adminService.resetPassword(resettingUser.id, newPassword);
        setIsSubmitting(false);

        if (error) {
            addToast("Failed to reset password: " + error.message, "error");
        } else {
            addToast("Password reset successfully for " + resettingUser.name, "success");
            setResettingUser(null);
            setNewPassword("");
        }
    };

    const modalContent = resettingUser ? (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Reset Password</h3>
                    <button onClick={() => setResettingUser(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                        <Shield className="w-5 h-5 text-red-600" />
                        <p className="text-xs font-bold text-red-700 leading-tight">
                            Attention: This will immediately change the password for {resettingUser.name} ({resettingUser.username}).
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 px-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 flex gap-3">
                    <button
                        onClick={() => setResettingUser(null)}
                        className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleResetPassword}
                        disabled={isSubmitting || newPassword.length < 6}
                        className="flex-[2] bg-slate-900 text-white rounded-xl py-3 px-4 text-sm font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isSubmitting ? "Updating..." : "Confirm & Change"}
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                        <p className="text-slate-500">View system access and permissions (Managed via Admin Dashboard)</p>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-500 text-sm">User Details</th>
                            <th className="px-6 py-4 font-semibold text-slate-500 text-sm">Role</th>
                            <th className="px-6 py-4 font-semibold text-slate-500 text-sm">Branch</th>
                            <th className="px-6 py-4 font-semibold text-slate-500 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{user.name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                                        user.role === 'SUPER_ADMIN'
                                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                                            : "bg-blue-50 text-blue-700 border border-blue-200"
                                    )}>
                                        {user.role === 'SUPER_ADMIN' && <Shield className="w-3 h-3" />}
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.branch ? (
                                        <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                                            {user.branch}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">All Branches</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setIsEditOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                            title="Edit Permissions"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setResettingUser(user)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Reset Password"
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}

            <PermissionEditor 
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                user={selectedUser as User}
            />
        </div>
    );
}
