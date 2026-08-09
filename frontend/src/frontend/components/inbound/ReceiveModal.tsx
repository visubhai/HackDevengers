"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, IndianRupee, User, Phone, Package, Calendar, MapPin, Truck, AlertCircle, Info } from "lucide-react";
import { IncomingParcel } from "@/shared/types";
import { cn } from "@/frontend/lib/utils";

interface ReceiveModalProps {
    parcel: IncomingParcel;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (remark?: string, collectedBy?: string, collectedByMobile?: string) => void;
}

export function ReceiveModal({ parcel, isOpen, onClose, onConfirm }: ReceiveModalProps) {
    const [remark, setRemark] = useState("");
    const [collectedBy, setCollectedBy] = useState("");
    const [collectedByMobile, setCollectedByMobile] = useState("");

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const isToPay = parcel.paymentStatus === "To Pay";
    const finalAmount = parcel.totalAmount;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 text-foreground rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 dark:border-slate-800">

                {/* Header Section with Gradient */}
                <div className={cn(
                    "px-8 py-6 flex items-center justify-between text-white relative overflow-hidden shrink-0",
                    isToPay ? "bg-gradient-to-r from-red-600 to-rose-500" : "bg-gradient-to-r from-emerald-600 to-teal-500"
                )}>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <Truck className="w-6 h-6" />
                            CONFIRM DELIVERY
                        </h3>
                        <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">Order Fulfillment</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    {/* Decorative Background Icon */}
                    <Truck className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                </div>

                <div className="flex-1 min-h-0 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* Primary Info: LR & Amount */}
                    <div className="flex items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                                <Package className="w-3 h-3" /> LR NUMBER & DATE
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-2xl font-mono font-black text-primary">{parcel.lrNumber}</p>
                                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-500 uppercase leading-none mb-0.5">Booked On</span>
                                    <span className="text-xs font-bold text-foreground">{parcel.date ? new Date(parcel.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                                </div>
                            </div>
                        </div>
                        {isToPay && (
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                                    <AlertCircle className="w-3 h-3" /> COLLECT PAYMENT
                                </div>
                                <p className="text-3xl font-black text-red-600 flex items-center justify-end">
                                    <IndianRupee className="w-5 h-5 mr-1" />{finalAmount.toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sender & Receiver Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3">Sender</span>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate leading-tight uppercase">{parcel.senderName}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{parcel.senderMobile}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3">Receiver</span>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate leading-tight uppercase">{parcel.receiverName}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{parcel.receiverMobile}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Parcel Details Section */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Parcel Specifications</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                    <Package className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Item Description</p>
                                    <p className="text-xs font-black uppercase text-foreground">{parcel.itemType || "General Goods"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                                    <Truck className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Quantity (ART)</p>
                                    <p className="text-xs font-black uppercase text-foreground">{parcel.quantity} Pieces</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Form Inputs */}
                    <div className="space-y-5 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <User className="w-3 h-3" /> Collected By
                                </label>
                                <input
                                    type="text"
                                    value={collectedBy}
                                    onChange={(e) => setCollectedBy(e.target.value)}
                                    placeholder="Person Name"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    value={collectedByMobile}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                        setCollectedByMobile(val);
                                    }}
                                    placeholder="10-digit Mobile"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <Info className="w-3 h-3" /> Delivery Remarks
                            </label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Any additional notes (e.g. ID proof, partial delivery, etc.)"
                                className="w-full h-24 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(remark, collectedBy, collectedByMobile)}
                        disabled={!collectedBy.trim() || !collectedByMobile.trim()}
                        className={cn(
                            "flex-[2] py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
                            isToPay ? "bg-red-600 shadow-red-600/20 hover:bg-red-700" : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
                        )}
                    >
                        {isToPay ? "Collect & Deliver" : "Complete Delivery"}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
