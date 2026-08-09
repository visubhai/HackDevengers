"use client";

import { memo } from "react";
import { Wallet, Save, CheckCircle2, MessageSquare, RefreshCcw } from "lucide-react";
import { PaymentStatus } from "@/shared/types";

interface PaymentBoxProps {
    costs: {
        freight: number;
        handling: number;
        hamali: number;
        discount?: number;
        total: number;
    };
    paymentType?: PaymentStatus;
    onChange?: (field: string, value: any) => void;
    onSave: () => void;
    isLocked: boolean;
    isSubmitting?: boolean;
    onWhatsApp?: () => void;
    onReset?: () => void;
    saveLabel?: string;
    onPrint?: () => void;
    currentStatus?: string;
}

export const PaymentBox = memo(({
    costs,
    onSave,
    isLocked,
    isSubmitting,
    onWhatsApp,
    onReset,
    saveLabel
}: PaymentBoxProps) => {
    return (
        <div className="relative bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col overflow-visible">
            {/* Header - Refined Soft Slate Style */}
            <div className="flex bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-[13px] font-medium text-slate-800 dark:text-slate-200 tracking-wider leading-none">
                    Payment Summary
                </h3>
            </div>

            <div className="p-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                    {/* Itemized Charges */}
                    <div className="space-y-1.5 px-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[17px] text-black dark:text-white font-medium tracking-tight">Freight Charges</span>
                            <span className="text-[28px] text-slate-900 dark:text-slate-100 font-black">₹ {costs.freight}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[17px] text-black dark:text-white font-medium tracking-tight">LR Charge</span>
                            <span className="text-[28px] text-slate-900 dark:text-slate-100 font-black">₹ {costs.handling}</span>
                        </div>
                        {costs.hamali > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-[17px] text-black dark:text-white font-medium tracking-tight">Hamalia / Labor</span>
                                <span className="text-[28px] text-slate-900 dark:text-slate-100 font-black">₹ {costs.hamali}</span>
                            </div>
                        )}
                    </div>

                    {/* Integrated Grand Total Row */}
                    <div className="bg-blue-50/50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/50 mt-1">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[16px] font-medium text-black dark:text-white">Grand Total</span>
                            <span className="text-[40px] font-black text-blue-600 dark:text-blue-400 leading-none">₹{costs.total}</span>
                        </div>
                    </div>
                </div>

                {/* Main Action Button */}
                <div className="mt-4">
                    {!isLocked ? (
                        <button
                            onClick={onSave}
                            id="save-booking-button"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-[20px] uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    SAVING...
                                </>
                            ) : (
                                <>
                                    <Save className="w-6 h-6" />
                                    {saveLabel}
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-xl flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                <div>
                                    <p className="text-emerald-900 dark:text-emerald-100 font-black text-sm uppercase tracking-tight leading-none mb-1">Booking Saved Successfully</p>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">LR Number: {costs.total > 0 ? 'Generated' : 'Pending'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={onWhatsApp}
                                    className="bg-white dark:bg-slate-900 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-black py-2.5 rounded-xl text-[14px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" /> WhatsApp
                                </button>
                                <button
                                    onClick={onReset}
                                    className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black py-2.5 rounded-xl text-[14px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCcw className="w-4 h-4" /> New (Ctrl+N)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

PaymentBox.displayName = "PaymentBox";
