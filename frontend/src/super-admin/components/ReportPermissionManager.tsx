import { useState, useMemo, useEffect } from "react";
import { useBranches } from "@/frontend/hooks/useBranches";
import { adminService } from "@/super-admin/services/adminService";
import { useToast } from "@/frontend/components/ui/toast";
import { LayoutDashboard, ArrowRight, Save, RotateCcw, CheckCircle2, Circle, Search, ShieldCheck, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

type PermissionType = 'from' | 'to';

export function ReportPermissionManager() {
    const { branchObjects, loading, refresh } = useBranches();
    const { addToast } = useToast();
    
    const [selectedOriginId, setSelectedOriginId] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [activePermissionType, setActivePermissionType] = useState<PermissionType>('from');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSortOrder, setSaveSortOrder] = useState<'numbered' | 'alphabetical'>('numbered');
    
    const [allowedFromIds, setAllowedFromIds] = useState<string[]>([]);
    const [allowedToIds, setAllowedToIds] = useState<string[]>([]);
    const [existingAllowedReports, setExistingAllowedReports] = useState<string[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    const selectedOrigin = useMemo(() => 
        branchObjects.find((b: any) => b._id === selectedOriginId),
    [branchObjects, selectedOriginId]);

    // Handle Origin Selection
    const handleOriginSelect = async (id: string) => {
        setSelectedOriginId(id);
        
        // Fetch current permissions for this branch
        const { data, error } = await adminService.getBranchPermissions(id);
        if (data) {
            setAllowedFromIds(data.allowedFromBranches?.map((b: any) => typeof b === 'string' ? b : b._id) || []);
            setAllowedToIds(data.allowedToBranches?.map((b: any) => typeof b === 'string' ? b : b._id) || []);
            setExistingAllowedReports(data.allowedReports || []);
        } else {
            setAllowedFromIds([]);
            setAllowedToIds([]);
            setExistingAllowedReports([]);
        }
        setHasChanges(false);
    };

    // Toggle Visible Branch
    const toggleBranchVisibility = (targetBranchId: string) => {
        if (!selectedOriginId) return;
        
        if (activePermissionType === 'from') {
            setAllowedFromIds(prev => {
                const isCurrentlyAllowed = prev.includes(targetBranchId);
                return isCurrentlyAllowed 
                    ? prev.filter(id => id !== targetBranchId) 
                    : [...prev, targetBranchId];
            });
        } else {
            setAllowedToIds(prev => {
                const isCurrentlyAllowed = prev.includes(targetBranchId);
                return isCurrentlyAllowed 
                    ? prev.filter(id => id !== targetBranchId) 
                    : [...prev, targetBranchId];
            });
        }
        setHasChanges(true);
    };

    const handleSelectAll = () => {
        if (!selectedOriginId) return;
        const allIds = branchObjects.map((b: any) => b._id);
        if (activePermissionType === 'from') setAllowedFromIds(allIds);
        else setAllowedToIds(allIds);
        setHasChanges(true);
    };

    const handleClearAll = () => {
        if (!selectedOriginId) return;
        if (activePermissionType === 'from') setAllowedFromIds([]);
        else setAllowedToIds([]);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!selectedOriginId) return;
        setIsSaving(true);
        try {
            let finalFromIds = [...allowedFromIds];
            let finalToIds = [...allowedToIds];

            if (saveSortOrder === 'alphabetical') {
                const sortByBranchName = (a: string, b: string) => {
                    const branchA = branchObjects.find((br: any) => br._id === a);
                    const branchB = branchObjects.find((br: any) => br._id === b);
                    return (branchA?.name || '').localeCompare(branchB?.name || '');
                };
                finalFromIds.sort(sortByBranchName);
                finalToIds.sort(sortByBranchName);
            }

            const res = await adminService.updateBranchPermissions(
                selectedOriginId, 
                existingAllowedReports,
                finalFromIds,
                finalToIds
            );
            
            if (res.error) {
                addToast(res.error.message, "error");
            } else {
                addToast("Report granular permissions updated successfully", "success");
                if (saveSortOrder === 'alphabetical') {
                    setAllowedFromIds(finalFromIds);
                    setAllowedToIds(finalToIds);
                }
                setHasChanges(false);
            }
        } catch (err: any) {
            addToast(err.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredBranches = useMemo(() => {
        return branchObjects
            .filter((b: any) => 
                b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                b.branchCode.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [branchObjects, searchTerm]);

    const currentAllowedList = activePermissionType === 'from' ? allowedFromIds : allowedToIds;

    if (loading) return <div className="p-8 text-center text-slate-500 italic">Accessing database...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Granular Report Visibility</h2>
                <p className="text-muted-foreground text-sm">Independently control which branches appear in 'From' and 'To' filters</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Select Subject Branch sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-premium-card border border-premium-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-muted/30 border-b border-premium-border">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Branch to Configure</h3>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-2 space-y-1 text-slate-900" data-lenis-prevent>
                            {branchObjects.map((branch: any) => (
                                <button
                                    key={branch._id}
                                    onClick={() => handleOriginSelect(branch._id)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                                        selectedOriginId === branch._id 
                                            ? "bg-slate-900 text-white shadow-lg" 
                                            : "hover:bg-muted text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                                            selectedOriginId === branch._id ? "bg-white/20" : "bg-primary/10 text-primary"
                                        )}>
                                            {branch.branchCode.substring(0, 2)}
                                        </div>
                                        <div className="truncate text-slate-900">
                                            <p className={cn("font-bold whitespace-nowrap", selectedOriginId === branch._id ? "text-white" : "text-slate-900")}>{branch.name}</p>
                                            <p className={cn(
                                                "text-[10px] uppercase font-bold",
                                                selectedOriginId === branch._id ? "text-white/70" : "text-muted-foreground"
                                            )}>
                                                {branch.branchCode}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedOriginId === branch._id && <ArrowRight className="w-4 h-4 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Configure Visible Branches main area */}
                <div className="lg:col-span-8 space-y-4">
                    {!selectedOriginId ? (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-premium-border rounded-3xl flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5 animate-pulse">
                            <ShieldCheck className="w-16 h-16 mb-4 text-emerald-500/20" />
                            <h4 className="font-bold text-xl mb-4 text-slate-800">Select Branch to Manage</h4>
                            <p className="max-w-sm text-sm leading-relaxed mb-6">
                                Click on a branch from the <span className="font-bold underline text-slate-900 italic">list on the left</span> first.
                            </p>
                            <div className="bg-slate-100 p-4 rounded-xl border border-dashed border-slate-200 inline-block text-left">
                                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">You will then be able to configure:</p>
                                <ul className="space-y-1.5 list-none">
                                    <li className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" /> Allowed Dispatch (FROM)
                                    </li>
                                    <li className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> Allowed Destination (TO)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-premium-card border border-premium-border rounded-2xl flex flex-col h-full shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-premium-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Configuring Visibility For:</span>
                                    </div>
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                                        {selectedOrigin?.name}
                                        <span className="text-sm font-normal text-muted-foreground">({selectedOrigin?.branchCode})</span>
                                    </h3>
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                                    <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-premium-border text-[11px] font-black uppercase tracking-wider">
                                        <button 
                                            onClick={() => { setSaveSortOrder('numbered'); setHasChanges(true); }}
                                            className={cn("px-3 py-1.5 rounded-lg transition-all", saveSortOrder === 'numbered' ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground hover:text-slate-700")}
                                        >
                                            Num Sequence
                                        </button>
                                        <button 
                                            onClick={() => { setSaveSortOrder('alphabetical'); setHasChanges(true); }}
                                            className={cn("px-3 py-1.5 rounded-lg transition-all", saveSortOrder === 'alphabetical' ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground hover:text-slate-700")}
                                        >
                                            Alphabetical
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <button
                                            disabled={!hasChanges || isSaving}
                                            onClick={handleSave}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-md shadow-emerald-200"
                                        >
                                            <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                        <button
                                            onClick={() => handleOriginSelect(selectedOriginId)}
                                            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
                                            title="Reset Changes"
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* GRANULAR SELECTOR TABS */}
                            <div className="p-6 pb-0">
                                <div className="flex p-1 bg-muted rounded-xl mb-6">
                                    <button 
                                        onClick={() => setActivePermissionType('from')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                                            activePermissionType === 'from' 
                                                ? "bg-white shadow-sm text-primary" 
                                                : "text-muted-foreground hover:bg-white/50"
                                        )}
                                    >
                                        <ArrowDownLeft className="w-4 h-4" /> Allowed Dispatch (FROM)
                                    </button>
                                    <button 
                                        onClick={() => setActivePermissionType('to')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                                            activePermissionType === 'to' 
                                                ? "bg-white shadow-sm text-primary" 
                                                : "text-muted-foreground hover:bg-white/50"
                                        )}
                                    >
                                        <ArrowUpRight className="w-4 h-4" /> Allowed Destination (TO)
                                    </button>
                                </div>

                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input 
                                        type="text"
                                        placeholder={`Search branches for ${activePermissionType === 'from' ? 'origin' : 'destination'} filter...`}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-premium-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-muted-foreground text-slate-900"
                                    />
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        {currentAllowedList.length} Branches Authorized
                                    </p>
                                    <div className="flex items-center gap-3 font-bold">
                                        <button onClick={handleSelectAll} className="text-[11px] text-emerald-600 hover:underline uppercase">Allow All</button>
                                        <span className="w-1 h-1 bg-muted rounded-full" />
                                        <button onClick={handleClearAll} className="text-[11px] text-red-500 hover:underline uppercase">Restrict All</button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 pt-0 overflow-y-auto max-h-[400px]" data-lenis-prevent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filteredBranches.map((branch: any) => {
                                        const isAllowed = currentAllowedList.includes(branch._id);
                                        const rankIndex = currentAllowedList.indexOf(branch._id);
                                        return (
                                            <button
                                                key={branch._id}
                                                onClick={() => toggleBranchVisibility(branch._id)}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                                                    isAllowed 
                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm" 
                                                        : "bg-background border-premium-border text-foreground hover:border-emerald-300"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                                                        isAllowed ? "bg-emerald-600 text-white shadow-inner" : "bg-muted"
                                                    )}>
                                                        {branch.branchCode.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className={cn("font-bold leading-tight", isAllowed ? "text-emerald-900" : "text-slate-900")}>{branch.name}</p>
                                                        <p className={cn("text-[10px] uppercase font-black", isAllowed ? "text-emerald-600/70" : "text-muted-foreground")}>{branch.branchCode}</p>
                                                    </div>
                                                </div>
                                                {isAllowed ? (
                                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                                                        {rankIndex + 1}
                                                    </div>
                                                ) : (
                                                    <Circle className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {filteredBranches.length === 0 && (
                                    <div className="py-20 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-premium-border">
                                        <p className="text-sm italic">No branches match "{searchTerm}"</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-auto p-4 bg-emerald-50/50 border-t border-emerald-100 flex items-start gap-3">
                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-[11px] leading-relaxed text-emerald-900/70">
                                    <span className="font-bold text-emerald-900">Separate Filters:</span> You are currently editing the <span className="font-black italic underline">{activePermissionType === 'from' ? 'FROM (Origin)' : 'TO (Destination)'}</span> visibility for <span className="font-black underline">{selectedOrigin?.name}</span>. Staff will only see authorized branches in that specific dropdown.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
