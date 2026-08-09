"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBranchStore } from "@/frontend/lib/store";
import { Booking, Parcel } from "@/shared/types";
import { Zap, MapPin, Check } from "lucide-react";

import dynamic from "next/dynamic";
import { FormCardSkeleton, ParcelListSkeleton, PaymentBoxSkeleton } from "@/frontend/components/DashboardSkeleton";
import { cn } from "@/frontend/lib/utils";
import { openWhatsApp } from "@/frontend/lib/whatsapp";
import { useBookingSession } from "@/frontend/hooks/useBookingSession";
import { useBranches } from "@/frontend/hooks/useBranches";

import { BookingForm } from "@/frontend/components/booking/BookingForm";
import { ParcelList } from "@/frontend/components/booking/ParcelList";
import { PaymentBox } from "@/frontend/components/booking/PaymentBox";
import { SingleSelect } from "@/frontend/components/ui/single-select-dropdown";
import { PrintBuilty } from "@/frontend/components/booking/PrintBuilty";


const ReportsPage = dynamic(() => import("./reports/page"), { ssr: false });
import { Suspense } from "react";

export default function BookingDashboard() {
  const { currentUser } = useBranchStore();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const { state, actions } = useBookingSession();

  const {
    lrNumber, isLocked, isSubmitting, isInitializing, fromBranch, toBranch,
    sender, receiver, parcels, costs, paymentType, remarks, branchObjects: filteredBranches, systemSettings,
    allowedPaymentTypes
  } = state;

  const toPayAllowed = allowedPaymentTypes.includes('To Pay');
  const paidAllowed = allowedPaymentTypes.includes('Paid');
  
  // Explicitly fetch all branch objects (unfiltered) to ensure PrintBuilty can resolve any ID
  const { branchObjects: allBranches } = useBranches("all");
  
  const {
    setFromBranch, setToBranch, setSender, setReceiver, handleReset, handleSave,
    handleAddParcel, handleRemoveParcel, handleParcelChange,
    setPaymentType, setRemarks, setCosts,
    handleSenderChange, handleReceiverChange, handleCostsChange
  } = actions;

  const focusReceiver = useCallback(() => document.getElementById('receiver-name')?.focus(), []);
  const focusParcelType = useCallback(() => {
    const el = document.getElementById('parcel-type-0');
    if (el) {
      el.focus();
      setTimeout(() => el.click(), 50);
    }
  }, []);
  const focusSaveButton = useCallback(() => document.getElementById('save-booking-button')?.focus(), []);

  const senderNameRef = useRef<HTMLInputElement>(null);

  // Auto-focus Destination on Mount
  useEffect(() => {
    document.getElementById('destination-select')?.focus();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isLocked && !isSubmitting && !isInitializing) handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        if (isLocked) handleReset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, isSubmitting, isInitializing, handleSave, handleReset]);

  const handleWhatsApp = useCallback(() => {
    const fromBranchName = allBranches.find(b => b._id === fromBranch)?.name || "";
    const toBranchName = allBranches.find(b => b._id === toBranch)?.name || "";

    openWhatsApp({
      mobile: sender.mobile,
      lrNumber,
      status: "Booked & Outbound",
      fromBranch: fromBranchName,
      toBranch: toBranchName,
      senderName: sender.name,
      receiverName: receiver.name,
      amount: costs.total,
      paymentStatus: paymentType
    }, (msg: string, type: any) => console.log(msg, type));
  }, [allBranches, fromBranch, toBranch, sender, receiver, lrNumber, costs.total, paymentType]);

  // Sequential Loading: Wait for dashboard mount before triggering reports fetch
  const [shouldLoadReports, setShouldLoadReports] = useState(false);
  useEffect(() => {
    // Small delay to ensure dashboard UI is responsive first
    const timer = setTimeout(() => setShouldLoadReports(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="bg-slate-100 dark:bg-slate-950 font-sans">

        {/* ... existing dashboard ... */}
        {/* Simple Solid Header */}
        <div className="bg-slate-900 py-2 mb-2 shadow-md relative -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 print:hidden">
          <div className="max-w-full mx-auto flex items-center justify-between relative z-10">
            <h1 className="text-xl font-medium text-white tracking-tight">
              New Parcel <span className="text-primary">Booking</span>
            </h1>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              <span className="text-[12px] font-medium text-white tracking-widest leading-none">Operator Mode</span>
            </div>
          </div>
        </div>

        {/* Main Grid Workspace - Optimized for PC Operator Tabbing */}
        <main className="max-w-full mx-auto px-4 pb-4">
          <div className="flex flex-col gap-2 print:hidden">

            {/* ROW 1: Routing & Payment Mode */}
            <div className="grid gap-2 items-start grid-cols-1 lg:grid-cols-2">

              {/* SELECT DESTINATION CARD */}
              <div className="relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm z-20 overflow-visible">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-t-lg mb-2">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <label className="text-[13px] font-medium text-slate-800 dark:text-slate-200 tracking-wider leading-none">Select Destination</label>
                </div>
                <div className="px-3 pb-2">
                  <SingleSelect
                    id="destination-select"
                    value={toBranch}
                    disabled={isLocked}
                    placeholder="Select Destination Branch..."
                    options={filteredBranches
                      .filter((b: any) => b._id !== fromBranch)
                      .map((b: any) => ({ label: b.name, value: b._id }))
                    }
                    onChange={(val) => {
                      setToBranch(val);
                      // Focus move to payment type for quick keyboard selection
                      setTimeout(() => document.getElementById('payment-topay')?.focus(), 100);
                    }}
                    className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[18px] font-black text-slate-900 dark:text-slate-100 rounded-md shadow-none"
                  />
                </div>
              </div>

              {/* PAYMENT TYPE CARD */}
              <div className="relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-visible">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-t-lg mb-2">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <label className="text-[13px] font-medium text-slate-800 dark:text-slate-200 tracking-wider leading-none">Payment Type</label>
                </div>
                <div className="px-3 pb-1 text-[13px] font-medium text-blue-700 dark:text-blue-400 tracking-tight pl-1">
                  {toPayAllowed && paidAllowed ? "Select Mode" : "Fixed Mode"}
                </div>
                <div className="px-3 pb-2">
                  <div className={cn("gap-3", toPayAllowed && paidAllowed ? "grid grid-cols-2" : "flex")}>

                    {/* TO PAY — only rendered when allowed */}
                    {toPayAllowed && (
                      <button
                        id="payment-topay"
                        onClick={() => setPaymentType("To Pay")}
                        disabled={isLocked}
                        className={cn(
                          "flex items-center gap-3 px-4 h-12 rounded-xl border-2 transition-all duration-200",
                          !paidAllowed && "flex-1",
                          paymentType === "To Pay"
                            ? "bg-red-50/50 border-red-500 shadow-sm"
                            : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowRight' && paidAllowed) {
                            e.preventDefault();
                            setPaymentType("Paid");
                            document.getElementById('payment-paid')?.focus();
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            senderNameRef.current?.focus();
                          }
                        }}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          paymentType === "To Pay" ? "border-red-500 bg-red-500" : "border-slate-300 dark:border-slate-600"
                        )}>
                          {paymentType === "To Pay" && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <span className={cn(
                          "text-[13px] font-black uppercase tracking-widest",
                          paymentType === "To Pay" ? "text-red-700 dark:text-red-400" : "text-slate-400"
                        )}>To Pay</span>
                      </button>
                    )}

                    {/* PAID — only rendered when allowed */}
                    {paidAllowed && (
                      <button
                        id="payment-paid"
                        onClick={() => setPaymentType("Paid")}
                        disabled={isLocked}
                        className={cn(
                          "flex items-center gap-3 px-4 h-12 rounded-xl border-2 transition-all duration-200",
                          !toPayAllowed && "flex-1",
                          paymentType === "Paid"
                            ? "bg-emerald-50/50 border-emerald-500 shadow-sm"
                            : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowLeft' && toPayAllowed) {
                            e.preventDefault();
                            setPaymentType("To Pay");
                            document.getElementById('payment-topay')?.focus();
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            senderNameRef.current?.focus();
                          }
                        }}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          paymentType === "Paid" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"
                        )}>
                          {paymentType === "Paid" && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                        <span className={cn(
                          "text-[13px] font-black uppercase tracking-widest",
                          paymentType === "Paid" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
                        )}>PAID</span>
                      </button>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Sender & Receiver */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
              {/* SENDER DETAILS CARD */}
              <BookingForm
                title="Sender Details"
                type="sender"
                values={sender}
                onChange={handleSenderChange}
                onNext={focusReceiver}
                disabled={isLocked}
                inputRef={senderNameRef}
              />

              {/* RECEIVER DETAILS CARD */}
              <BookingForm
                title="Receiver Details"
                type="receiver"
                values={receiver}
                onChange={handleReceiverChange}
                onNext={focusParcelType}
                disabled={isLocked}
              />
            </div>

            {/* ROW 3: Parcels & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
              {/* PARCEL INFO CARD - Compact Look */}
              <ParcelList
                parcels={parcels}
                onAdd={handleAddParcel}
                onRemove={handleRemoveParcel}
                onChange={handleParcelChange}
                onNext={focusSaveButton}
                disabled={isLocked}
                remarks={remarks}
                onRemarksChange={setRemarks}
              />

              {/* PAYMENT SUMMARY CARD */}
              <PaymentBox
                costs={costs}
                onChange={handleCostsChange}
                onSave={handleSave}
                isLocked={isLocked}
                isSubmitting={isSubmitting}
                onWhatsApp={handleWhatsApp}
                onReset={handleReset}
                saveLabel="PRINT & SAVE (Ctrl+S)"
              />
            </div>

          </div>

          <hr className="my-8 border-slate-300 dark:border-slate-800 border-2 rounded-full print:hidden" />
          
          {shouldLoadReports && (
            <Suspense fallback={<div className="h-64 flex items-center justify-center font-bold text-slate-400 italic">Preparing Daily Reports...</div>}>
              <ReportsPage />
            </Suspense>
          )}

        </main>

      </div>

      {/* Hidden Print Receipt Component - Rendered only after booking is created, never during init */}
      {typeof document !== 'undefined' && (isLocked || (isSubmitting && !isInitializing)) && createPortal(
        <PrintBuilty
          booking={{
            id: '',
            lrNumber: lrNumber,
            fromBranch,
            toBranch,
            date: new Date().toISOString(),
            sender,
            receiver,
            parcels,
            costs,
            paymentType: paymentType as any,
            status: 'Booked',
            remarks
          } as any}
          branches={allBranches}
          systemSettings={systemSettings}
        />,
        document.body
      )}
    </>
  );
}
