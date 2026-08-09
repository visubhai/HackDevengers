import { useBranchStore } from "@/frontend/lib/store";
import { useUsers } from "@/frontend/hooks/useUsers";
import { adminService } from "@/super-admin/services/adminService";
import { Shield, Trash2, Edit2, CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

interface AdminListProps {
    onEdit: (user: any) => void;
}

export function AdminList({ onEdit }: AdminListProps) {
    const { currentUser } = useBranchStore();
    const { users, isLoading, mutate } = useUsers();

    // Filter to only show Admins (and Super Admins, but mainly we manage Admins)
    const admins = users.filter(u => u.role === 'BRANCH' || u.role === 'SUPER_ADMIN');

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to PERMANENTLY delete this admin account? This cannot be undone.")) {
            const res = await adminService.deleteUser(id);
            if (res.error) {
                alert(res.error.message);
            } else {
                mutate(); // Refresh list
            }
        }
    };

    if (isLoading) return <div className="p-4 text-center text-slate-500">Loading admins...</div>;

    return (
        <div className="bg-premium-card rounded-xl border border-premium-border shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <table className="w-full text-left hidden md:table">
                <thead className="bg-muted/30 border-b border-premium-border">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-muted-foreground text-sm uppercase tracking-wider">Admin</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground text-sm uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground text-sm uppercase tracking-wider">Permissions</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground text-sm uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground text-sm uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-premium-border">
                    {admins.map(user => (
                        <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground">{user.name}</p>
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
                                {user.role === 'SUPER_ADMIN' ? (
                                    <span className="text-xs text-muted-foreground italic">Full Access</span>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap gap-1">
                                            {user.allowedBranchNames?.slice(0, 2).map((b: string) => (
                                                <span key={b} className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded text-foreground">{b}</span>
                                            ))}
                                            {(user.allowedBranchNames?.length || 0) > 2 && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded text-muted-foreground">+{user.allowedBranchNames!.length - 2}</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {(user.allowedReports?.length || 0)} Reports Allowed
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {user.isActive ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                                        <CircleCheck className="w-3 h-3" /> Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                                        <CircleX className="w-3 h-3" /> Inactive
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(user)}
                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {user.id !== currentUser?.id && user.role !== 'SUPER_ADMIN' && (
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                {admins.map(user => (
                    <div key={user.id} className="bg-card p-4 rounded-xl border border-premium-border shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-sm">{user.name}</p>
                                    <span className={cn(
                                        "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                                        user.role === 'SUPER_ADMIN'
                                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                                            : "bg-blue-50 text-blue-700 border border-blue-200"
                                    )}>
                                        {user.role === 'SUPER_ADMIN' && <Shield className="w-3 h-3" />}
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {user.isActive ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                                        <CircleCheck className="w-3 h-3" /> Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        <CircleX className="w-3 h-3" /> Inactive
                                    </span>
                                )}
                            </div>
                        </div>

                        {user.role !== 'SUPER_ADMIN' && (
                            <div className="bg-muted/30 p-2 rounded-lg mt-1 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Permitted Branches</span>
                                <div className="flex flex-wrap gap-1">
                                    {user.allowedBranchNames?.map((b: string) => (
                                        <span key={b} className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded border border-premium-border text-foreground">{b}</span>
                                    ))}
                                    {(!user.allowedBranchNames || user.allowedBranchNames.length === 0) && (
                                        <span className="text-[10px] text-muted-foreground italic">No branches permitted</span>
                                    )}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                                    {(user.allowedReports?.length || 0)} Reports Allowed
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-premium-border">
                            <button
                                onClick={() => onEdit(user)}
                                className="flex-1 py-2 text-primary bg-primary/10 font-bold text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white rounded-lg transition-colors border border-primary/20"
                            >
                                Edit Profile
                            </button>
                            {user.id !== currentUser?.id && user.role !== 'SUPER_ADMIN' && (
                                <button
                                    onClick={() => handleDelete(user.id)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
