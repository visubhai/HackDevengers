"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Booking } from "@/shared/types";
import { useBranchStore } from "@/frontend/lib/store";
import { SortField, SortOrder } from "@/frontend/hooks/useReports";
import { Ban, MessageCircle, X, Clock, CheckCircle2, Package, ArrowRight } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import { ConfirmationModal } from "@/frontend/components/common/ConfirmationModal";
import { EditBookingModal } from "./EditBookingModal";
import { CancelBookingModal } from "./CancelBookingModal";
import { useBranches } from "@/frontend/hooks/useBranches";
import { useToast } from "@/frontend/components/ui/toast";
import { parcelService } from "@/frontend/services/parcelService";
import { adminService } from "@/super-admin/services/adminService";
import { openWhatsApp } from "@/frontend/lib/whatsapp";

interface DeliveryTimelineProps {
    data: Booking[];
    isLoading?: boolean;
    currentPage: number;
    totalPages: number;
    rowsPerPage: number;
    totalItems: number;
    sortConfig: { field: SortField; order: SortOrder };
    onSort: (field: SortField) => void;
    loadMore: () => void;
    hasMore: boolean;
    mutate: () => void;
    autoOpenLr?: string | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDisplayDate(row: Booking): Date {
    const ts = (row.status === 'DELIVERED' && row.deliveredAt)
        ? row.deliveredAt
        : (row.date || (row as any).createdAt);
    return new Date(ts);
}

function formatDateHeader(d: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (d.toDateString() === today.toDateString()) return `Today — ${dateStr}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday — ${dateStr}`;
    return `${DAY_NAMES[d.getDay()]} — ${dateStr}`;
}

export function DeliveryTimeline({
    data, isLoading, totalItems, loadMore, hasMore, mutate, autoOpenLr
}: DeliveryTimelineProps) {
    const { branchObjects } = useBranches();
    const { addToast } = useToast();
    const { currentUser } = useBranchStore();

    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [hasAutoOpened, setHasAutoOpened] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (autoOpenLr && data.length > 0 && hasAutoOpened !== autoOpenLr && !isLoading) {
            const match = data.find(b => b.lrNumber === autoOpenLr);
            if (match) {
                setSelectedBooking(match);
                setEditModalOpen(true);
                setHasAutoOpened(autoOpenLr);
            }
        }
    }, [autoOpenLr, data, hasAutoOpened, isLoading]);

    const isActionAllowed = (booking: Booking) => {
        if (!currentUser) return false;
        if (currentUser.role === 'SUPER_ADMIN') return true;
        const fromBranchId = typeof booking.fromBranch === 'string'
            ? booking.fromBranch
            : ((booking.fromBranch as any)._id || (booking.fromBranch as any).id);
        const foundBranch = branchObjects.find(b => {
            const bId = (b as any)._id || (b as any).id;
            return bId === fromBranchId || (b as any).name === fromBranchId;
        });
        return fromBranchId === currentUser.branchId ||
            (!!foundBranch && ((foundBranch as any)._id || (foundBranch as any).id) === currentUser.branchId);
    };

    const isCancelAllowed = (booking: Booking) => {
        if (!currentUser) return false;
        if (currentUser.role === 'SUPER_ADMIN') return true;
        const rawDate = booking.date || (booking as any).createdAt;
        if (!rawDate) return false;
        const IST = 5.5 * 60 * 60 * 1000;
        const toIST = (d: Date) => new Date(d.getTime() + IST);
        const booked = toIST(new Date(rawDate));
        const now = toIST(new Date());
        return booked.getUTCFullYear() === now.getUTCFullYear()
            && booked.getUTCMonth() === now.getUTCMonth()
            && booked.getUTCDate() === now.getUTCDate();
    };

    const handleEditClick = (e: React.MouseEvent, booking: Booking) => {
        e.stopPropagation();
        setSelectedBooking(booking);
        setEditModalOpen(true);
    };

    const handleCancelClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setBookingToCancel(id);
        setCancelModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setBookingToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleConfirmCancel = async (remark: string) => {
        if (!bookingToCancel) return;
        const { error } = await parcelService.updateParcelStatus(bookingToCancel, 'CANCELLED', undefined, undefined, undefined, remark);
        if (error) { addToast(`Failed to cancel: ${error.message}`, "error"); return; }
        mutate();
        setBookingToCancel(null);
        setCancelModalOpen(false);
        addToast("Booking cancelled", "success");
    };

    const handleConfirmDelete = async () => {
        if (!bookingToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await adminService.deleteBooking(bookingToDelete);
            if (error) { addToast(`Failed to delete: ${error.message}`, "error"); return; }
            mutate();
            setBookingToDelete(null);
            setDeleteModalOpen(false);
            addToast("Booking permanently deleted", "success");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveEdit = async (updated: Booking) => {
        if (!selectedBooking) return;
        const { error } = await parcelService.updateBooking(selectedBooking.id, {
            sender: updated.sender,
            receiver: updated.receiver,
            parcels: updated.parcels,
            costs: updated.costs,
            paymentType: updated.paymentType,
            remarks: updated.remarks,
            deliveredRemark: updated.deliveredRemark,
            collectedBy: updated.collectedBy,
            collectedByMobile: updated.collectedByMobile,
            status: updated.status
        } as any);
        if (error) { addToast(`Failed to update: ${error.message}`, "error"); return; }
        mutate();
        setEditModalOpen(false);
        setSelectedBooking(null);
    };

    // Group by local calendar date, descending. Within each day, descending by time.
    const grouped = useMemo(() => {
        const groups: Record<string, Booking[]> = {};
        data.forEach(row => {
            const d = getDisplayDate(row);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        });
        return Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, items]) => ({
                key,
                label: formatDateHeader(getDisplayDate(items[0])),
                items: [...items].sort((a, b) => getDisplayDate(b).getTime() - getDisplayDate(a).getTime()),
            }));
    }, [data]);

    // Skeleton
    if (isLoading && data.length === 0) {
        return (
            <div className="space-y-2 pl-8">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[72px] bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (!isLoading && data.length === 0) {
        return (
            <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="font-medium">No delivered records found for this filter</p>
            </div>
        );
    }

    let globalSr = 0;

    return (
        <div className="space-y-8">
            {grouped.map(({ key, label, items }) => (
                <div key={key}>
                    {/* ── Date separator ── */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-500/20" />
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {label}
                            <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                                {items.length}
                            </span>
                        </span>
                        <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-500/20" />
                    </div>

                    {/* ── Timeline entries ── */}
                    <div className="relative pl-8">
                        {/* Vertical track */}
                        <div className="absolute left-[11px] top-0 bottom-2 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-100 to-transparent dark:from-emerald-500/50 dark:via-emerald-500/10" />

                        <div className="space-y-2.5">
                            {items.map((row) => {
                                globalSr++;
                                const d = getDisplayDate(row);
                                const isCancelled = row.status === 'CANCELLED';
                                const canEdit = !!currentUser;
                                const qty = row.parcels.reduce((s, p) => s + Number(p.quantity || 0), 0);
                                const fromName = (row.fromBranch as any)?.name || row.fromBranch || "";
                                const toName = (row.toBranch as any)?.name || row.toBranch || "";

                                return (
                                    <div key={row.id} className="relative flex items-start gap-3">
                                        {/* Dot */}
                                        <div className={cn(
                                            "absolute -left-8 mt-3 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 z-10 shadow-sm",
                                            isCancelled
                                                ? "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-500/50"
                                                : "bg-emerald-50 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-500"
                                        )}>
                                            {isCancelled
                                                ? <X className="w-2.5 h-2.5 text-red-400" />
                                                : <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                            }
                                        </div>

                                        {/* Card */}
                                        <div className={cn(
                                            "flex-1 rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden",
                                            isCancelled
                                                ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20"
                                                : "bg-white dark:bg-slate-900 border-premium-border hover:border-emerald-200 dark:hover:border-emerald-500/30"
                                        )}>
                                            <div className="flex items-stretch">
                                                {/* Time sidebar */}
                                                <div className={cn(
                                                    "flex flex-col items-center justify-center px-2.5 border-r min-w-[52px]",
                                                    isCancelled
                                                        ? "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-500/20"
                                                        : "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15"
                                                )}>
                                                    <span className="text-[11px] font-black tabular-nums text-slate-500 dark:text-slate-400 leading-none">
                                                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold mt-0.5">#{globalSr}</span>
                                                </div>

                                                {/* Main content */}
                                                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                                    {/* LR + route */}
                                                    <div className="flex-1 min-w-0 space-y-0.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <button
                                                                onClick={(e) => canEdit && handleEditClick(e, row)}
                                                                className={cn(
                                                                    "text-[15px] font-black font-mono leading-none",
                                                                    canEdit ? "text-blue-600 dark:text-blue-400 hover:underline" : "text-slate-400"
                                                                )}
                                                            >
                                                                {row.lrNumber}
                                                            </button>
                                                            <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                                                <span>{fromName}</span>
                                                                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                                                                <span className="text-emerald-600 dark:text-emerald-400">{toName}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700 dark:text-slate-300 flex-wrap">
                                                            <span className="truncate max-w-[140px]">{row.sender.name}</span>
                                                            <span className="text-slate-300 dark:text-slate-600 text-xs">→</span>
                                                            <span className="truncate max-w-[140px] text-emerald-700 dark:text-emerald-400">{row.receiver.name}</span>
                                                        </div>
                                                        {row.deliveredRemark && (
                                                            <p className="text-[9px] text-slate-400 italic truncate">"{row.deliveredRemark}"</p>
                                                        )}
                                                        {isCancelled && row.cancellationRemark && (
                                                            <span className="text-[9px] font-black text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 px-1.5 py-0.5 rounded inline-block">
                                                                Cancelled: {row.cancellationRemark}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Right: amount + tags + actions */}
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <div className="text-[16px] font-black text-slate-900 dark:text-slate-100 leading-none">
                                                                ₹{row.costs.total.toLocaleString()}
                                                            </div>
                                                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                                                <span className={cn(
                                                                    "px-1.5 py-0.5 rounded text-[9px] font-black uppercase border",
                                                                    row.paymentType === 'Paid'
                                                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                                                        : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20"
                                                                )}>
                                                                    {row.paymentType}
                                                                </span>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">×{qty}</span>
                                                            </div>
                                                        </div>

                                                        {!isCancelled && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => openWhatsApp({
                                                                        mobile: row.receiver.mobile || row.sender.mobile,
                                                                        lrNumber: row.lrNumber,
                                                                        status: row.status,
                                                                        fromBranch: row.fromBranch as string,
                                                                        toBranch: row.toBranch as string,
                                                                        senderName: row.sender.name || "-",
                                                                        receiverName: row.receiver.name || "-",
                                                                        amount: row.costs.total,
                                                                        paymentStatus: row.paymentType
                                                                    }, addToast)}
                                                                    className="p-1.5 rounded bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white border border-green-500/10 transition-all"
                                                                >
                                                                    <MessageCircle className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => canEdit && handleEditClick(e, row)}
                                                                    disabled={!canEdit}
                                                                    className={cn(
                                                                        "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border transition-all",
                                                                        canEdit
                                                                            ? "text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/10"
                                                                            : "opacity-30 cursor-not-allowed"
                                                                    )}
                                                                >
                                                                    Edit
                                                                </button>
                                                                {row.status !== 'DELIVERED' && isActionAllowed(row) && canEdit && isCancelAllowed(row) && (
                                                                    <button
                                                                        onClick={(e) => handleCancelClick(e, row.id)}
                                                                        className="p-1.5 rounded text-red-500 hover:bg-red-500 hover:text-white border border-red-500/10 transition-all"
                                                                    >
                                                                        <Ban className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                {currentUser?.role === 'SUPER_ADMIN' && (
                                                                    <button
                                                                        onClick={(e) => handleDeleteClick(e, row.id)}
                                                                        className="p-1.5 rounded text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}

            {/* Load more */}
            {hasMore && (
                <div className="py-6 flex items-center justify-center">
                    <button
                        onClick={loadMore}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-10 py-3 rounded-xl text-[13px] uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 transition-all active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                Show More Deliveries ({totalItems - data.length} left)
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            )}

            {!hasMore && data.length > 0 && (
                <div className="py-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-t border-premium-border">
                    All {totalItems} deliveries shown
                </div>
            )}

            {/* Modals */}
            <CancelBookingModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleConfirmCancel}
                lrNumber={data.find(b => b.id === bookingToCancel)?.lrNumber}
            />
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="PERMANENTLY DELETE booking"
                message="Warning: This will completely remove this LR from the system. This cannot be undone."
                confirmText="Yes, Delete Permanently"
                cancelText="No, Keep it"
                isDanger={true}
                isLoading={isDeleting}
            />
            {selectedBooking && (
                <EditBookingModal
                    booking={selectedBooking}
                    isOpen={editModalOpen}
                    availableBranches={branchObjects as any}
                    onClose={() => setEditModalOpen(false)}
                    onSave={handleSaveEdit}
                    canEdit={isActionAllowed(selectedBooking)}
                />
            )}
        </div>
    );
}
