import { useState, useMemo } from "react";
import { useBranches } from "@/frontend/hooks/useBranches";
import { adminService } from "@/super-admin/services/adminService";
import { useToast } from "@/frontend/components/ui/toast";
import { MapPin, ArrowRight, Save, RotateCcw, CheckCircle2, Circle, Search, Route } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

export function BookingRouteManager() {
    const { branchObjects, loading, refresh } = useBranches();
    const { addToast } = useToast();
    
    const [selectedOriginId, setSelectedOriginId] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [localAllowedIds, setLocalAllowedIds] = useState<string[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    const selectedOrigin = useMemo(() => 
        branchObjects.find((b: any) => b._id === selectedOriginId),
    [branchObjects, selectedOriginId]);

    // Handle Origin Selection
    const handleOriginSelect = (id: string) => {
        setSelectedOriginId(id);
        const origin = branchObjects.find((b: any) => b._id === id);
        // Initialize local allowed IDs from the branch data
        const initialAllowed = origin?.allowedDestinations?.map((d: any) => d._id || d.toString()) || [];
        setLocalAllowedIds(initialAllowed);
        setHasChanges(false);
    };

    // Toggle Destination
    const toggleDestination = (destId: string) => {
        if (!selectedOriginId) return;
        
        setLocalAllowedIds(prev => {
            const isCurrentlyAllowed = prev.includes(destId);
            const next = isCurrentlyAllowed 
                ? prev.filter(id => id !== destId) 
                : [...prev, destId];
            return next;
        });
        setHasChanges(true);
    };

    const handleSelectAll = () => {
        if (!selectedOriginId) return;
        const allOtherIds = branchObjects
            .filter((b: any) => b._id !== selectedOriginId)
            .map((b: any) => b._id);
        setLocalAllowedIds(allOtherIds);
        setHasChanges(true);
    };

    const handleClearAll = () => {
        if (!selectedOriginId) return;
        setLocalAllowedIds([]);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!selectedOriginId) return;
        setIsSaving(true);
        try {
            const res = await adminService.updateBranch(selectedOriginId, {
                allowedDestinations: localAllowedIds
            });
            
            if (res.error) {
                addToast(res.error.message, "error");
            } else {
                addToast("Booking routes updated successfully", "success");
                setHasChanges(false);
                refresh();
            }
        } catch (err: any) {
            addToast(err.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredDestinations = useMemo(() => {
        return branchObjects
            .filter((b: any) => b._id !== selectedOriginId)
            .filter((b: any) => 
                b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                b.branchCode.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [branchObjects, selectedOriginId, searchTerm]);

    if (loading) return <div className="p-8 text-center text-slate-500 italic">Exploring network...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Booking Route Management</h2>
                <p className="text-muted-foreground text-sm">Define which branches can send parcels to each other</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Select Origin Branch */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-premium-card border border-premium-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-muted/30 border-b border-premium-border">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Origin Branch</h3>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-2 space-y-1" data-lenis-prevent>
                            {branchObjects.map((branch: any) => (
                                <button
                                    key={branch._id}
                                    onClick={() => handleOriginSelect(branch._id)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                                        selectedOriginId === branch._id 
                                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
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
                                        <div className="truncate">
                                            <p className="font-bold whitespace-nowrap">{branch.name}</p>
                                            <p className={cn(
                                                "text-[10px] uppercase font-bold",
                                                selectedOriginId === branch._id ? "text-white/70" : "text-muted-foreground"
                                            )}>
                                                {branch.branchCode}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedOriginId === branch._id && <ArrowRight className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Configure Allowed Destinations */}
                <div className="lg:col-span-8 space-y-4">
                    {!selectedOriginId ? (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-premium-border rounded-3xl flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
                            <MapPin className="w-12 h-12 mb-4 opacity-20" />
                            <h4 className="font-bold text-lg mb-2">No Origin Selected</h4>
                            <p className="max-w-xs text-sm">Please select an origin branch from the left to manage its permitted booking destinations.</p>
                        </div>
                    ) : (
                        <div className="bg-premium-card border border-premium-border rounded-2xl flex flex-col h-full shadow-sm">
                            <div className="p-6 border-b border-premium-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">Configuring Routes For:</span>
                                    </div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        {selectedOrigin?.name}
                                        <span className="text-sm font-normal text-muted-foreground">({selectedOrigin?.branchCode})</span>
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <button
                                        disabled={!hasChanges || isSaving}
                                        onClick={handleSave}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Routes"}
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

                            <div className="p-6 pb-0">
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input 
                                        type="text"
                                        placeholder="Search destination branches..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-background border border-premium-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        {localAllowedIds.length} Destinations Allowed
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleSelectAll} className="text-[11px] font-bold text-primary hover:underline uppercase">Select All</button>
                                        <span className="w-1 h-1 bg-muted rounded-full" />
                                        <button onClick={handleClearAll} className="text-[11px] font-bold text-red-500 hover:underline uppercase">Clear All</button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 pt-0 overflow-y-auto max-h-[400px]" data-lenis-prevent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filteredDestinations.map((dest: any) => {
                                        const isAllowed = localAllowedIds.includes(dest._id);
                                        return (
                                            <button
                                                key={dest._id}
                                                onClick={() => toggleDestination(dest._id)}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                                                    isAllowed 
                                                        ? "bg-slate-900 border-slate-900 text-white shadow-md" 
                                                        : "bg-background border-premium-border text-foreground hover:border-primary/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                                                        isAllowed ? "bg-white/10" : "bg-muted"
                                                    )}>
                                                        {dest.branchCode.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold leading-tight">{dest.name}</p>
                                                        <p className={cn("text-[10px] uppercase font-black", isAllowed ? "text-white/50" : "text-muted-foreground")}>{dest.branchCode}</p>
                                                    </div>
                                                </div>
                                                {isAllowed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-opacity" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                {filteredDestinations.length === 0 && (
                                    <div className="py-20 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-premium-border">
                                        <p className="text-sm">No destination branches found matching "{searchTerm}"</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-auto p-4 bg-primary/5 border-t border-primary/10 flex items-start gap-3">
                                <div className="p-1.5 bg-primary/20 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                </div>
                                <p className="text-[11px] leading-relaxed text-primary-foreground/70 text-slate-600">
                                    <span className="font-bold text-slate-800">Rule Insight:</span> When destinations are selected, this branch will <span className="underline italic">only</span> be able to book parcels to these specific locations. If no destinations are selected, it will be able to book to <span className="font-bold">ANY</span> branch (default behavior).
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
