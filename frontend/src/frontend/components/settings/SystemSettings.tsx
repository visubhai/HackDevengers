"use client";

import { useState, useEffect } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { Settings, Save, AlertCircle, MessageSquare, Building2, Phone, MapPin, Printer } from "lucide-react";
import { useToast } from "@/frontend/components/ui/toast";
import { fetchApi, parseError } from "@/frontend/services/base";

interface SystemSetting {
    _id?: string;
    key: string;
    value: any;
    description?: string;
}

export const SystemSettings = () => {
    const { currentUser } = useBranchStore();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const res = await fetchApi("/superadmin/settings");
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data) || "Failed to fetch settings");
            setSettings(data.data || []);
        } catch (error: any) {
            addToast(error.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (key: string, value: any) => {
        try {
            setIsSaving(true);
            const res = await fetchApi("/superadmin/settings", {
                method: "PUT",
                body: JSON.stringify({ key, value })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseError(data) || `Failed to update ${key}`);
            
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
            addToast(`Setting updated successfully`, "success");
        } catch (error: any) {
            addToast(error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (currentUser?.role !== "SUPER_ADMIN") return null;

    const getSetting = (key: string) => settings.find(s => s.key === key);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-premium-card rounded-3xl border border-premium-border shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-8">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Settings className="w-5 h-5 text-primary" />
                            Global System Settings
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Configure system-wide preferences and defaults for all branches.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {/* WhatsApp Notifications Toggle */}
                        <div className="bg-muted/30 border border-premium-border rounded-2xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                                        WhatsApp Notifications
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically send a WhatsApp message to the receiver when a new booking is saved.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={getSetting('WHATSAPP_NOTIFICATIONS')?.value ? "text-emerald-500 text-sm font-bold" : "text-muted-foreground text-sm font-bold"}>
                                        {getSetting('WHATSAPP_NOTIFICATIONS')?.value ? "Enabled" : "Disabled"}
                                    </span>
                                    <button
                                        onClick={() => handleUpdate('WHATSAPP_NOTIFICATIONS', !getSetting('WHATSAPP_NOTIFICATIONS')?.value)}
                                        disabled={isSaving}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                            getSetting('WHATSAPP_NOTIFICATIONS')?.value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                getSetting('WHATSAPP_NOTIFICATIONS')?.value ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Company Branding */}
                        <div className="bg-muted/30 border border-premium-border rounded-2xl p-6 space-y-6">
                            <h3 className="font-bold flex items-center gap-2 border-b border-premium-border pb-4">
                                <Building2 className="w-4 h-4 text-primary" />
                                Business Branding
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Company Name</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            defaultValue={getSetting('COMPANY_NAME')?.value}
                                            onBlur={(e) => handleUpdate('COMPANY_NAME', e.target.value)}
                                            className="w-full rounded-xl border-premium-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tagline</label>
                                    <input
                                        type="text"
                                        defaultValue={getSetting('COMPANY_TAGLINE')?.value}
                                        onBlur={(e) => handleUpdate('COMPANY_TAGLINE', e.target.value)}
                                        className="w-full rounded-xl border-premium-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Support Contact (Numbers)</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            defaultValue={getSetting('COMPANY_CONTACT')?.value}
                                            onBlur={(e) => handleUpdate('COMPANY_CONTACT', e.target.value)}
                                            className="w-full rounded-xl border-premium-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Office Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <textarea
                                            rows={2}
                                            defaultValue={getSetting('COMPANY_ADDRESS')?.value}
                                            onBlur={(e) => handleUpdate('COMPANY_ADDRESS', e.target.value)}
                                            className="w-full rounded-xl border-premium-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-primary font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Printing Defaults */}
                        <div className="bg-muted/30 border border-premium-border rounded-2xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Printer className="w-4 h-4 text-blue-500" />
                                        Print Header Branding
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Show company name and address on printed LRs and reports.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleUpdate('PRINT_HEADER', !getSetting('PRINT_HEADER')?.value)}
                                        disabled={isSaving}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                            getSetting('PRINT_HEADER')?.value ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                getSetting('PRINT_HEADER')?.value ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 flex items-start gap-3 text-slate-500 dark:text-slate-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed">
                            These settings are global and affect all branches immediately. Changes to business branding will reflect on new printouts and WhatsApp messages.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
