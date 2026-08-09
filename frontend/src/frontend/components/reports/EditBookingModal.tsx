"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Booking, Parcel, Branch } from "@/shared/types";
import { useBranchStore } from "@/frontend/lib/store";
import { ParcelList } from "@/frontend/components/booking/ParcelList";
import {
    X, Save, Printer, History, Plus, Phone, User, MapPin, 
    ArrowDown, FileText, CheckCircle2, Check, Clock, Ban, Wallet, 
    CreditCard, LayoutDashboard, Package
} from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import { PrintBuilty } from "@/frontend/components/booking/PrintBuilty";
import { useBranches } from "@/frontend/hooks/useBranches";
import { openWhatsApp } from "@/frontend/lib/whatsapp";
import { useToast } from "@/frontend/components/ui/toast";
import { LoadingSpinner } from "@/frontend/components/ui/LoadingSpinner";

interface EditBookingModalProps {
    booking: Booking;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedBooking: Booking) => Promise<void>;
    availableBranches: Branch[];
    canEdit?: boolean;
}

export function EditBookingModal({ booking, isOpen, onClose, onSave, availableBranches, canEdit = true }: EditBookingModalProps) {
    const { currentUser } = useBranchStore();
    const { addToast } = useToast();
    
    const [sender, setSender] = useState(booking.sender);
    const [receiver, setReceiver] = useState(booking.receiver);
    const [parcels, setParcels] = useState<Parcel[]>(booking.parcels);
    const [costs, setCosts] = useState(booking.costs);
    const [paymentType, setPaymentType] = useState(booking.paymentType);
    const [status, setStatus] = useState(booking.status);
    const [remarks, setRemarks] = useState(booking.remarks || "");
    const [deliveredRemark, setDeliveredRemark] = useState(booking.deliveredRemark || "");
    const [collectedBy, setCollectedBy] = useState(booking.collectedBy || "");
    const [collectedByMobile, setCollectedByMobile] = useState(booking.collectedByMobile || "");
    const [isSaving, setIsSaving] = useState(false);
    const [systemSettings, setSystemSettings] = useState<any[]>([]);
    const { branchObjects: allBranches } = useBranches("all");
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        import("@/super-admin/services/adminService").then(({ adminService }) => {
            adminService.getSystemSettings().then(res => {
                if (res.data) setSystemSettings(res.data);
            });
        });
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            
            // Sync initial state
            setSender(booking.sender);
            setReceiver(booking.receiver);
            setParcels(booking.parcels);
            setCosts(booking.costs);
            setPaymentType(booking.paymentType);
            setStatus(booking.status);
            setRemarks(booking.remarks || "");
            setDeliveredRemark(booking.deliveredRemark || "");
            setCollectedBy(booking.collectedBy || "");
            setCollectedByMobile(booking.collectedByMobile || "");
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, booking]);

    // Handle click outside to close
    const handleBackdropClick = (e: React.MouseEvent) => {
        // If clicking exactly the backdrop div and not its children
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    useEffect(() => {
        const totalFreight = parcels.reduce((sum, p) => sum + (Number(p.quantity || 0) * Number(p.rate || 0)), 0);
        setCosts(prev => ({
            ...prev,
            freight: totalFreight,
            total: (totalFreight + prev.handling + prev.hamali)
        }));
    }, [parcels]);

    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    // Derive allowed payment types for the booking's source branch.
    // Superadmin can always switch to either type; branch users are restricted.
    const fromBranchObj = allBranches.find((b: any) => {
        const id = b._id || b.id;
        const fromVal = typeof booking.fromBranch === 'string'
            ? booking.fromBranch
            : ((booking.fromBranch as any)?._id || (booking.fromBranch as any)?.id);
        return id === fromVal;
    });
    const editAllowedPaymentTypes: string[] = isSuperAdmin
        ? ['Paid', 'To Pay']
        : (fromBranchObj?.allowedPaymentTypes?.length ? fromBranchObj.allowedPaymentTypes : ['Paid', 'To Pay']);
    const editToPayAllowed = editAllowedPaymentTypes.includes('To Pay');
    const editPaidAllowed = editAllowedPaymentTypes.includes('Paid');

    const createdDate = new Date(booking.date || (booking as any).createdAt);
    const today = new Date();
    const isSameDay = createdDate.getFullYear() === today.getFullYear() &&
                     createdDate.getMonth() === today.getMonth() &&
                     createdDate.getDate() === today.getDate();
    
    // Requirement: Logistics and financial fields are locked after the day of creation for branch users
    const isLocked = !isSameDay && !isSuperAdmin;
    const isReadOnly = !canEdit;


    const getBranchName = (branchVal: any) => {
        if (!branchVal) return 'Unknown';
        if (typeof branchVal === 'object' && branchVal.name) return branchVal.name;
        const lookup = typeof branchVal === 'string' ? branchVal : (branchVal._id || branchVal.id);
        const found = availableBranches.find(b => (b as any)._id === lookup || (b as any).id === lookup || (b as any).name === lookup) as any;
        return found ? found.name : String(lookup);
    };

    const handlePrint = () => {
        document.body.classList.add('print-builty-only');
        window.print();
        document.body.classList.remove('print-builty-only');
    };

    const handleSaveAndPrint = async () => {
        if (status === 'DELIVERED' && (!collectedBy.trim() || !collectedByMobile.trim())) {
            addToast("Name and Mobile Number are required for delivery", "error");
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                ...booking, sender, receiver, parcels, costs, paymentType, status,
                remarks, deliveredRemark, collectedBy, collectedByMobile
            });

            // Trigger print after successful save
            handlePrint();
            
            addToast("Booking updated and print triggered", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to update booking", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleWhatsApp = () => {
        openWhatsApp({
            mobile: sender.mobile,
            lrNumber: booking.lrNumber,
            status: status,
            fromBranch: getBranchName(booking.fromBranch),
            toBranch: getBranchName(booking.toBranch),
            senderName: sender.name,
            receiverName: receiver.name,
            amount: costs.total,
            paymentStatus: paymentType
        }, addToast);
    };

    if (!isOpen) return null;

    // Premium UI styles (SaaS look: clean, minimal borders, subtle focus rings)
    const InputUI = "w-full bg-transparent border-b border-slate-200 py-2 text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-300";
    const LabelUI = "text-[10px] font-bold text-slate-400 uppercase tracking-widest";
    const BlockLabel = "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1";

    return createPortal(
        <>
            <div 
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-[4px] print:hidden animate-in fade-in duration-300 pointer-events-auto"
                onClick={handleBackdropClick}
            >
                <div 
                    ref={modalRef}
                    className="bg-white w-full max-w-6xl max-h-[95vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden m-4 border border-slate-100 ring-1 ring-black/5 animate-in zoom-in-[0.98] slide-in-from-bottom-4 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    
                    {/* Header Zone */}
                    <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 bg-white z-10 gap-3 md:gap-0">
                        <div className="flex items-center justify-between w-full md:w-auto">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                                    <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                                        {booking.lrNumber}
                                    </h2>
                                    <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        {new Date(booking.date || (booking as any).createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric'})} &bull; {new Date(booking.date || (booking as any).createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 md:hidden hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors shrink-0">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        {/* Interactive Status Tracker (Middle of Header) */}
                        <div className="flex md:flex md:items-center overflow-x-auto w-full md:w-auto gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-full custom-scrollbar-slim pb-1 md:pb-1">
                            {[
                                { id: 'BOOKED', label: 'Booked', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
                                { id: 'PENDING', label: 'In Transit', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
                                { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                                { id: 'CANCELLED', label: 'Cancel', icon: Ban, color: 'text-red-600', bg: 'bg-red-100' }
                            ].map(s => {
                                const isActive = status === s.id;
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => !isReadOnly && isSuperAdmin && setStatus(s.id as any)}
                                        disabled={isReadOnly || !isSuperAdmin}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                                            isActive ? `${s.bg} ${s.color} shadow-sm ring-1 ring-black/5` : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/50",
                                            (isReadOnly || !isSuperAdmin) && isActive ? "" : (isReadOnly || !isSuperAdmin) ? "opacity-50 cursor-not-allowed" : ""
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="hidden md:flex items-center gap-2">
                             <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>

                    {/* Editor Canvas */}
                    <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row bg-[#F8FAFC]">

                        {/* LEFT PANEL: Logistics Core (30% width) */}
                        <div className="w-full md:w-[320px] bg-white border-b md:border-b-0 md:border-r border-slate-100 flex flex-col min-h-0 md:overflow-y-auto custom-scrollbar shrink-0">
                            
                            {/* Origin Block */}
                            <div className="p-6 relative">
                                <span className={LabelUI}>Origin Station</span>
                                <div className="text-sm font-black text-slate-800 mt-1 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    {getBranchName(booking.fromBranch)}
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                        <input value={sender.name} onChange={e => !isReadOnly && setSender({...sender, name: e.target.value})} readOnly={isReadOnly} className={cn(InputUI, "pl-7", isReadOnly && "cursor-default text-slate-500")} placeholder="Consignor Name" />
                                    </div>
                                    <div className="relative group">
                                        <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                        <input value={sender.mobile} onChange={e => !isReadOnly && setSender({...sender, mobile: e.target.value})} readOnly={isReadOnly} className={cn(InputUI, "pl-7", isReadOnly && "cursor-default text-slate-500")} placeholder="Contact Mobile" />
                                    </div>

                                </div>

                                {/* Flow Connective Line */}
                                <div className="absolute left-[34px] bottom-[-24px] w-px h-12 bg-gradient-to-b from-slate-200 to-transparent z-0"></div>
                                <div className="absolute right-8 -bottom-4 z-10 w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400">
                                    <ArrowDown className="w-4 h-4" />
                                </div>
                            </div>
                            
                            <hr className="border-slate-100 border-dashed" />

                            {/* Destination Block */}
                            <div className="p-6">
                                <span className={LabelUI}>Destination Station</span>
                                <div className="text-sm font-black text-slate-800 mt-1 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    {getBranchName(booking.toBranch)}
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                        <input value={receiver.name} onChange={e => !isReadOnly && setReceiver({...receiver, name: e.target.value})} readOnly={isReadOnly} className={cn(InputUI, "pl-7", "focus:border-emerald-500", isReadOnly && "cursor-default text-slate-500")} placeholder="Consignee Name" />
                                    </div>
                                    <div className="relative group">
                                        <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                        <input value={receiver.mobile} onChange={e => !isReadOnly && setReceiver({...receiver, mobile: e.target.value})} readOnly={isReadOnly} className={cn(InputUI, "pl-7", "focus:border-emerald-500", isReadOnly && "cursor-default text-slate-500")} placeholder="Contact Mobile" />
                                    </div>

                                </div>
                            </div>

                            {/* Payment Configuration inline */}
                            <div className="p-6 bg-slate-50/50 mt-auto border-t border-slate-100">
                                <span className={BlockLabel}>Payment Terms</span>
                                <div className={cn("gap-3 mt-2", editToPayAllowed && editPaidAllowed ? "grid grid-cols-2" : "flex")}>

                                    {editPaidAllowed && (
                                        <button
                                            onClick={() => !(isLocked || isReadOnly) && setPaymentType('Paid')}
                                            disabled={isLocked || isReadOnly}
                                            className={cn("flex items-center gap-3 px-4 h-11 rounded-xl border-2 transition-all duration-200",
                                            !editToPayAllowed && "flex-1",
                                            paymentType === 'Paid' ? "bg-emerald-50/50 border-emerald-500 shadow-sm" : "bg-white border-slate-100 dark:border-slate-800 text-slate-400",
                                            (isLocked || isReadOnly) && "cursor-not-allowed")}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                                paymentType === "Paid" ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                                            )}>
                                                {paymentType === "Paid" && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
                                            </div>
                                            <span className={cn("text-[11px] font-black uppercase tracking-wider", paymentType === 'Paid' ? "text-emerald-700" : "text-slate-400")}>PAID</span>
                                        </button>
                                    )}

                                    {editToPayAllowed && (
                                        <button
                                            onClick={() => !(isLocked || isReadOnly) && setPaymentType('To Pay')}
                                            disabled={isLocked || isReadOnly}
                                            className={cn("flex items-center gap-3 px-4 h-11 rounded-xl border-2 transition-all duration-200",
                                            !editPaidAllowed && "flex-1",
                                            paymentType === 'To Pay' ? "bg-red-50/50 border-red-500 shadow-sm" : "bg-white border-slate-100 dark:border-slate-800 text-slate-400",
                                            (isLocked || isReadOnly) && "cursor-not-allowed")}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                                paymentType === "To Pay" ? "border-red-500 bg-red-500" : "border-slate-300"
                                            )}>
                                                {paymentType === "To Pay" && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
                                            </div>
                                            <span className={cn("text-[11px] font-black uppercase tracking-wider", paymentType === 'To Pay' ? "text-red-700" : "text-slate-400")}>TO PAY</span>
                                        </button>
                                    )}

                                </div>
                            </div>

                        </div>

                        {/* RIGHT PANEL: Data & Financials (70% width) */}
                        <div className="flex-1 min-h-0 flex flex-col md:overflow-hidden p-4 md:p-6 gap-6">

                            {/* Parcel Inventory Table (Takes available vertical space) */}
                            <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="text-[12px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-4 h-4 text-slate-400" />
                                        Consignment Inventory
                                    </h3>
                                    {!isLocked && !isReadOnly && (
                                        <button 
                                            onClick={() => setParcels([...parcels, { id: Math.random().toString(), quantity: '', itemType: '', rate: '' }])}
                                            className="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Row
                                        </button>
                                    )}

                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
                                    <ParcelList
                                        parcels={parcels}
                                        onAdd={() => {}}
                                        onRemove={(id) => !(isLocked || isReadOnly) && setParcels(parcels.filter(p => p.id !== id))}
                                        onChange={(id, field, val) => !(isLocked || isReadOnly) && setParcels(parcels.map(p => p.id === id ? { ...p, [field]: val } : p))}
                                        disabled={isLocked || isReadOnly}

                                        remarks={remarks}
                                        onRemarksChange={setRemarks}
                                    />
                                </div>
                            </div>

                            {/* Meta & Finances Footer Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end shrink-0">
                                
                                {/* Annotations & Delivery Proof (Col Span 7) */}
                                <div className="md:col-span-7 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="hidden sm:block invisible h-0 w-0 overflow-hidden">
                                            <label className={BlockLabel}>Public LR Remarks</label>
                                            <input value={remarks} onChange={e => !isReadOnly && setRemarks(e.target.value)} readOnly={isReadOnly} className={cn(InputUI, "text-xs", isReadOnly && "cursor-default text-slate-500")} placeholder="e.g. Handle with care..." />
                                        </div>
                                        <div className="col-span-1">
                                            <label className={BlockLabel}>Internal Secure Notes</label>
                                            <input value={deliveredRemark} onChange={e => !isReadOnly && setDeliveredRemark(e.target.value)} readOnly={isReadOnly} className={cn(InputUI, "text-xs text-amber-700 focus:border-amber-500", isReadOnly && "cursor-default")} placeholder="Staff communication..." />
                                        </div>
                                    </div>
                                    
                                    {status === 'DELIVERED' && (
                                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 animate-in slide-in-from-left-2 space-y-3">
                                            {booking.deliveredAt && (
                                                <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Delivered At</span>
                                                    <span className="text-[12px] font-black text-emerald-700 ml-auto">
                                                        {new Date(booking.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        {' · '}
                                                        {new Date(booking.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={BlockLabel}>Received By Signatory</label>
                                                    <input value={collectedBy} onChange={e => !isReadOnly && setCollectedBy(e.target.value)} readOnly={isReadOnly} className={cn(InputUI, "bg-transparent border-emerald-200 focus:border-emerald-500 text-xs", isReadOnly && "cursor-default")} placeholder="Receiver Name" />
                                                </div>
                                                <div>
                                                    <label className={BlockLabel}>Signatory Mobile</label>
                                                    <input value={collectedByMobile} onChange={e => !isReadOnly && setCollectedByMobile(e.target.value)} readOnly={isReadOnly} className={cn(InputUI, "bg-transparent border-emerald-200 focus:border-emerald-500 text-xs", isReadOnly && "cursor-default")} placeholder="Contact Number" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Financial Ledger (Col Span 5) */}
                                <div className="md:col-span-5 bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group">
                                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                                        <CreditCard className="w-32 h-32" />
                                    </div>
                                    
                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center justify-between text-slate-300 text-xs font-medium border-b border-white/10 pb-2">
                                            <span>Base Freight Charge</span>
                                            <span className="font-mono tracking-tight text-white">₹{costs.freight.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300 text-xs font-medium border-b border-white/10 pb-2 group/input">
                                            <span>Handling / Dok</span>
                                            <div className="flex items-center">
                                                <span className="text-slate-500 mr-1">₹</span>
                                                <input type="number" 
                                                    value={costs.handling} 
                                                    readOnly={isLocked || isReadOnly}
                                                    onChange={e => {
                                                        if (isLocked || isReadOnly) return;
                                                        const val = parseFloat(e.target.value)||0;
                                                        setCosts(c => ({...c, handling: val, total: (c.freight + val + c.hamali)}));
                                                    }} className={cn("w-16 bg-transparent text-right font-mono text-white outline-none border-b border-transparent focus:border-white/30 transition-colors", (isLocked || isReadOnly) && "cursor-not-allowed opacity-50")} />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300 text-xs font-medium border-b border-white/10 pb-2 group/input">
                                            <span>Hamali (Labor)</span>
                                            <div className="flex items-center">
                                                <span className="text-slate-500 mr-1">₹</span>
                                                <input type="number" 
                                                    value={costs.hamali} 
                                                    readOnly={isLocked || isReadOnly}
                                                    onChange={e => {
                                                        if (isLocked || isReadOnly) return;
                                                        const val = parseFloat(e.target.value)||0;
                                                        setCosts(c => ({...c, hamali: val, total: (c.freight + c.handling + val)}));
                                                    }} className={cn("w-16 bg-transparent text-right font-mono text-white outline-none border-b border-transparent focus:border-white/30 transition-colors", (isLocked || isReadOnly) && "cursor-not-allowed opacity-50")} />
                                            </div>
                                        </div>


                                        <div className="flex items-end justify-between pt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Net Payable</span>
                                                <span className="text-[10px] uppercase font-bold text-white/50 bg-white/10 rounded px-1.5 py-0.5 mt-0.5 inline-block w-max">{paymentType}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-slate-400 font-medium">₹</span>
                                                <span className="text-3xl font-black tracking-tighter text-white">{costs.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Master Actions Bar */}
                    <div className="bg-white border-t border-slate-100 px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between z-10 shrink-0 gap-4 md:gap-0">
                        {/* Audit Log Peek */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {isSuperAdmin && booking.editHistory && booking.editHistory.length > 0 && (
                                <div className="flex-1 md:flex-none flex items-center justify-center md:inline-flex gap-2 text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 cursor-help" title={booking.editHistory.map(h => `${new Date(h.editedAt).toLocaleString()}: ${h.newRemark}`).join('\n')}>
                                    <History className="w-3.5 h-3.5" />
                                    {booking.editHistory.length} Edits Logged
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center w-full md:w-auto gap-3">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button onClick={handleWhatsApp} className="flex-1 sm:flex-none justify-center px-4 md:px-5 py-3 md:py-2.5 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:border-[#25D366] hover:bg-[#25D366]/20 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 md:shadow-sm">
                                    WhatsApp
                                </button>
                                {isReadOnly && (
                                    <button onClick={handlePrint} className="flex-1 sm:flex-none justify-center px-4 md:px-5 py-3 md:py-2.5 bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 md:shadow-sm">
                                        <Printer className="w-4 h-4" /> Print
                                    </button>
                                )}
                            </div>
                            {!isReadOnly && (
                                <button 
                                    onClick={handleSaveAndPrint} 
                                    disabled={isSaving}
                                    className="w-full sm:w-auto justify-center px-6 md:px-8 py-3 md:py-2.5 bg-slate-900 text-white hover:bg-black rounded-xl text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <LoadingSpinner size={16} /> : (
                                        <>
                                            <Printer className="w-4 h-4" />
                                            <Save className="w-4 h-4" />
                                        </>
                                    )}
                                    {isSaving ? 'Updating & Printing...' : 'Print & Update Booking'}
                                </button>
                            )}
                            {isReadOnly && (
                                <div className="w-full sm:w-auto px-6 py-3 md:py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 text-center">
                                    View-Only Mode
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {isSaving && (
                <PrintBuilty
                    booking={{
                        ...booking, sender, receiver, parcels, costs, paymentType, remarks, status
                    }}
                    branches={allBranches}
                    systemSettings={systemSettings}
                />
            )}
        </>,
        document.body
    );
}
