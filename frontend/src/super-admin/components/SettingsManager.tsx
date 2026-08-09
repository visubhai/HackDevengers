import { useState, useEffect } from "react";
import { adminService } from "@/super-admin/services/adminService";
import { useToast } from "@/frontend/components/ui/toast";
import { RefreshCcw, Save, TriangleAlert, Hash, ToggleLeft, ToggleRight } from "lucide-react";
import { LoadingSpinner } from "@/frontend/components/ui/LoadingSpinner";
import { DatabaseManagement } from "@/frontend/components/settings/DatabaseManagement";

export function SettingsManager() {
    const [counters, setCounters] = useState<any[]>([]);
    const [systemSettings, setSystemSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const [isSavingCounter, setIsSavingCounter] = useState<string | null>(null);
    const [isUpdatingSetting, setIsUpdatingSetting] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const [countersRes, settingsRes] = await Promise.all([
            adminService.getCounters(),
            adminService.getSystemSettings()
        ]);

        if (countersRes.data) setCounters(countersRes.data);
        if (settingsRes.data) setSystemSettings(settingsRes.data);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateCounter = async (id: string, newCount: number) => {
        setIsSavingCounter(id);
        const { error } = await adminService.updateCounter(id, newCount);
        if (error) {
            addToast(error.message, "error");
        } else {
            addToast("Counter updated successfully", "success");
            // Refresh counters
            const res = await adminService.getCounters();
            if (res.data) setCounters(res.data);
        }
        setIsSavingCounter(null);
    };

    const handleUpdateSetting = async (key: string, newValue: any) => {
        setIsUpdatingSetting(key);
        const { error } = await adminService.updateSystemSetting(key, newValue);

        if (error) {
            addToast(error.message, "error");
        } else {
            addToast(`Setting ${key} updated`, "success");
            // Update local state
            setSystemSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
        }
        setIsUpdatingSetting(null);
    };

    if (loading && counters.length === 0) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <LoadingSpinner size={32} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Loading Configuration...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">System Configuration</h2>
                    <p className="text-muted-foreground font-medium">Manage sequential numbering and global system behavior</p>
                </div>

                <button
                    onClick={fetchData}
                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                >
                    <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                    <TriangleAlert className="text-amber-500 w-5 h-5 flex-shrink-0" />
                </div>
                <div className="text-xs text-amber-500 font-medium leading-relaxed">
                    <strong className="block text-sm font-black mb-1">Danger: Critical Sequential Counters</strong>
                    Adjusting counters directly will change the next generated LR Number. Values should only be increased to avoid duplicate numbering unless you are resolving a specific conflict. Proceed with extreme caution.
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Counters Section */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Hash className="w-4 h-4" /> LR Number Counters
                    </h3>
                    <div className="grid gap-3">
                        {counters.map((counter) => (
                            <div key={counter._id} className="bg-premium-card border border-premium-border rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-primary/30 transition-colors">
                                <div>
                                    <div className="text-[10px] font-black text-primary uppercase mb-1 tracking-widest">{counter.branchId?.branchCode || 'Global'}</div>
                                    <h4 className="font-black text-foreground tracking-tight">{counter.branchId?.name}</h4>
                                    <p className="text-[11px] text-muted-foreground font-bold uppercase">{counter.entity} Sequence</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        defaultValue={counter.count}
                                        id={`counter-${counter._id}`}
                                        className="w-28 px-4 py-2 bg-background border border-premium-border rounded-xl text-sm font-black text-foreground text-right outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                    />
                                    <button
                                        disabled={isSavingCounter === counter._id}
                                        onClick={() => {
                                            const input = document.getElementById(`counter-${counter._id}`) as HTMLInputElement;
                                            handleUpdateCounter(counter._id, parseInt(input.value));
                                        }}
                                        className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-50 shadow-sm"
                                    >
                                        {isSavingCounter === counter._id ? <LoadingSpinner size={16} /> : <Save className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Global Settings Section */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">General System Behavior</h3>
                    <div className="bg-premium-card border border-premium-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="divide-y divide-premium-border">
                            {systemSettings
                                .filter(setting => !['HEADER_MARGIN', 'COMPANY_TAGLINE', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_CONTACT', 'PRINT_HEADER'].includes(setting.key))
                                .map((setting) => (
                                <div key={setting.key} className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                                    <div className="max-w-[70%]">
                                        <h4 className="font-black text-foreground tracking-tight uppercase text-xs mb-1">
                                            {setting.key.replace(/_/g, ' ')}
                                        </h4>
                                        <p className="text-sm font-bold text-muted-foreground leading-tight">{setting.description || 'Global system configuration flag'}</p>
                                    </div>
                                    <div className="flex-shrink-0 ml-4">
                                        {typeof setting.value === 'boolean' ? (
                                            <button
                                                disabled={isUpdatingSetting === setting.key}
                                                onClick={() => handleUpdateSetting(setting.key, !setting.value)}
                                                className={`transition-all duration-300 p-1 rounded-full ${setting.value ? 'text-emerald-500' : 'text-slate-300'
                                                    } disabled:opacity-50`}
                                            >
                                                {isUpdatingSetting === setting.key ? (
                                                    <LoadingSpinner size={32} />
                                                ) : setting.value ? (
                                                    <ToggleRight className="w-10 h-10" />
                                                ) : (
                                                    <ToggleLeft className="w-10 h-10" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {setting.key === 'PARCEL_ITEM_TYPES' ? (
                                                    <textarea
                                                        defaultValue={setting.value}
                                                        id={`setting-${setting.key}`}
                                                        rows={3}
                                                        className="px-3 py-1.5 bg-background border border-premium-border rounded-lg text-xs font-bold text-foreground w-64 md:w-96 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-y"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        defaultValue={setting.value}
                                                        id={`setting-${setting.key}`}
                                                        className="px-3 py-1.5 bg-background border border-premium-border rounded-lg text-xs font-bold text-foreground w-48 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                                    />
                                                )}
                                                <button
                                                    disabled={isUpdatingSetting === setting.key}
                                                    onClick={() => {
                                                        const input = document.getElementById(`setting-${setting.key}`) as HTMLInputElement;
                                                        handleUpdateSetting(setting.key, input.value);
                                                    }}
                                                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-all disabled:opacity-50"
                                                >
                                                    {isUpdatingSetting === setting.key ? (
                                                        <LoadingSpinner size={16} />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {systemSettings.length === 0 && (
                                <div className="p-10 text-center text-slate-400 italic text-sm">
                                    Initializing global settings...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-10 border-t border-premium-border">
                <DatabaseManagement />
            </div>
        </div>
    );
}
