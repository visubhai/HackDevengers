import { Booking } from "@/shared/types";
import { useBranchStore } from "@/frontend/lib/store";
import { SortField, SortOrder } from "@/frontend/hooks/useReports";
import { TableRowSkeleton } from "../ui/Skeleton";
import { ChevronDown, ChevronUp, ChevronsUpDown, ArrowLeft, ArrowRight, Ban, MessageCircle, X } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import { ConfirmationModal } from "@/frontend/components/common/ConfirmationModal";
import { EditBookingModal } from "./EditBookingModal";
import { CancelBookingModal } from "./CancelBookingModal";
import { useBranches } from "@/frontend/hooks/useBranches";
import { useToast } from "@/frontend/components/ui/toast";
import React, { useState, useEffect } from "react";
import { List } from 'react-window';

interface ReportTableProps {
    data: Booking[];
    isLoading?: boolean;
    currentPage: number;
    totalPages: number;
    rowsPerPage: number;
    totalItems: number;
    sortConfig: { field: SortField, order: SortOrder };
    onSort: (field: SortField) => void;
    loadMore: () => void;
    hasMore: boolean;
    mutate: () => void;
    autoOpenLr?: string | null;
}

import { parcelService } from "@/frontend/services/parcelService";
import { adminService } from "@/super-admin/services/adminService";

import { useRouter } from "next/navigation";
import { openWhatsApp } from "@/frontend/lib/whatsapp";

export function ReportTable({
    data, isLoading, currentPage, totalPages, rowsPerPage, totalItems,
    sortConfig, onSort, loadMore, hasMore, mutate, autoOpenLr
}: ReportTableProps) {
    const router = useRouter();
    const { branchObjects } = useBranches();
    const { addToast } = useToast();
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [hasAutoOpened, setHasAutoOpened] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { currentUser } = useBranchStore();

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

        const userBranchId = currentUser.branchId;
        return fromBranchId === userBranchId || (foundBranch && ((foundBranch as any)._id || (foundBranch as any).id) === userBranchId);
    };

    const isCancelAllowed = (booking: Booking) => {
        if (!currentUser) return false;
        if (currentUser.role === 'SUPER_ADMIN') return true;
        const rawDate = booking.date || (booking as any).createdAt;
        if (!rawDate) return false;
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const toIST = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS);
        const bookedIST = toIST(new Date(rawDate));
        const todayIST = toIST(new Date());
        return (
            bookedIST.getUTCFullYear() === todayIST.getUTCFullYear() &&
            bookedIST.getUTCMonth() === todayIST.getUTCMonth() &&
            bookedIST.getUTCDate() === todayIST.getUTCDate()
        );
    };

    const handleEditClick = (e: React.MouseEvent, booking: Booking) => {
        e.stopPropagation();
        setSelectedBooking(booking);
        setEditModalOpen(true);
    };

    const handleConfirmCancel = async (remark: string) => {
        if (bookingToCancel) {
            const { error } = await parcelService.updateParcelStatus(bookingToCancel, 'CANCELLED', undefined, undefined, undefined, remark);
            if (error) {
                addToast(`Failed to cancel booking: ${error.message}`, "error");
                return;
            }
            mutate();
            setBookingToCancel(null);
            setCancelModalOpen(false);
            addToast("Booking cancelled successfully", "success");
        }
    };

    const handleConfirmDelete = async () => {
        if (bookingToDelete) {
            setIsDeleting(true);
            try {
                const { error } = await adminService.deleteBooking(bookingToDelete);
                if (error) {
                    addToast(`Failed to delete booking: ${error.message}`, "error");
                    return;
                }
                mutate();
                setBookingToDelete(null);
                setDeleteModalOpen(false);
                addToast("Booking permanently deleted", "success");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleSaveEdit = async (updated: Booking) => {
        if (selectedBooking) {
            const payload = {
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
            };

            const { error } = await parcelService.updateBooking(selectedBooking.id, payload as any);
            if (error) {
                addToast(`Failed to update booking: ${error.message}`, "error");
                return;
            }
            mutate();
            setEditModalOpen(false);
            setSelectedBooking(null);
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortConfig.field !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-300 opacity-50" />;
        return sortConfig.order === 'asc'
            ? <ChevronUp className="w-3 h-3 text-blue-600" />
            : <ChevronDown className="w-3 h-3 text-blue-600" />;
    };

    const HeaderCell = ({ field, label, align = 'left' }: { field: SortField, label: string, align?: 'left' | 'right' | 'center' }) => (
        <th
            className={cn(
                "px-6 py-4 bg-premium-card/50 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-premium-card transition-colors select-none",
                align === 'right' && "text-right",
                align === 'center' && "text-center"
            )}
            onClick={() => onSort(field)}
        >
            <div className={cn("flex items-center gap-2", align === 'right' && "justify-end", align === 'center' && "justify-center")}>
                {label}
                <SortIcon field={field} />
            </div>
        </th>
    );

    const isEditAllowed = (booking: Booking) => {
        return !!currentUser;
    };

    // Virtual Row Component
    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const row = data[index];
        if (!row) return null;
        const dateObj = new Date((row.status === 'DELIVERED' && row.deliveredAt) ? row.deliveredAt : (row.date || (row as any).createdAt));
        const isCancelled = row.status === 'CANCELLED';
        const canEdit = isEditAllowed(row);

        return (
            <div style={style} className="border-b border-premium-border">
                <table className="w-full text-left border-collapse table-fixed bg-white">
                    <tbody>
                        <tr className={cn(
                            "transition-all duration-200 group border-b border-premium-border/30 last:border-0",
                            isCancelled ? "bg-red-500/5 hover:bg-red-500/10" : "even:bg-slate-50/30 hover:bg-blue-500/[0.03]"
                        )}>
                            {/* LR & Date: Compact Column */}
                            <td className="px-2 py-1 align-top w-[10%]">
                                <div className="flex flex-col">
                                    <button
                                        onClick={(e) => canEdit && handleEditClick(e, row)}
                                        className={cn(
                                            "text-[16px] font-black font-mono transition-colors text-left leading-none",
                                            canEdit ? "text-blue-600 hover:text-blue-700 hover:underline" : "text-slate-400 opacity-50"
                                        )}
                                    >
                                        {row.lrNumber}
                                    </button>
                                    <div className="flex items-center gap-1 mt-1 opacity-60">
                                        <span className="text-[12px] font-bold text-slate-500">{dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                                        <span className="text-[11px] text-slate-400">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </td>

                            {/* Destination Branch */}
                            <td className="px-3 py-1 align-top w-[18%]">
                                <div className="flex items-start gap-1.5 h-full">
                                    <div className="w-1 h-full bg-purple-500/20 rounded-full shrink-0 self-stretch mt-0.5" />
                                    <div className="text-[15px] font-black text-slate-800 dark:text-slate-200 leading-none uppercase truncate pt-0.5">
                                        {(row.toBranch as any)?.name || row.toBranch || ""}
                                    </div>
                                </div>
                                {isCancelled && row.cancellationRemark && (
                                    <div className="text-[8px] font-black text-red-500 uppercase leading-none bg-red-500/5 px-1 py-0.5 rounded border border-red-500/10 inline-block w-fit mt-1 ml-4">
                                        REASON: {row.cancellationRemark}
                                    </div>
                                )}
                            </td>

                            {/* Sender */}
                            <td className="px-3 py-1 align-top w-[14%]">
                                <div className="text-[15px] font-bold text-slate-700 leading-none truncate uppercase pt-0.5">
                                    {row.sender.name}
                                </div>
                            </td>

                            {/* Receiver */}
                            <td className="px-3 py-1 align-top w-[14%] opacity-80 border-l border-slate-100">
                                <div className="text-[15px] font-bold text-slate-600 leading-none truncate uppercase pt-0.5">
                                    {row.receiver.name}
                                </div>
                            </td>

                            {/* Article Count: New Standalone Column */}
                            <td className="px-2 py-1 align-top text-center w-[5%] font-black text-slate-600 text-[16px]">
                                {row.parcels.reduce((s, p) => s + Number(p.quantity || 0), 0)}
                            </td>

                            {/* Shipment Value: Amount Only */}
                            <td className="px-2 py-1 align-top text-right w-[8%]">
                                <div className="flex flex-col items-end">
                                    <div className="text-[16px] font-black text-slate-900 leading-none">₹{row.costs.total.toLocaleString()}</div>
                                </div>
                            </td>

                            {/* Payment State */}
                            <td className="px-1 py-1 align-top text-center w-[8%]">
                                <div className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded-md text-[13px] font-black uppercase tracking-tighter border shadow-sm",
                                    row.paymentType === 'Paid'
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-500/20"
                                        : "bg-red-50 text-red-600 border-red-500/20"
                                )}>
                                    {row.paymentType}
                                </div>
                            </td>

                            {/* Current Status */}
                            <td className="px-1 py-1 align-top text-center w-[11%]">
                                <div className={cn(
                                    "inline-flex items-center px-2 py-1 rounded-md text-[13px] font-black uppercase tracking-tighter border shadow-sm transition-transform group-hover:scale-105",
                                    row.status === 'DELIVERED' && "bg-emerald-50 text-emerald-500 border-emerald-500/20",
                                    row.status === 'PENDING' && "bg-blue-50 text-blue-600 border-blue-500/20",
                                    row.status === 'BOOKED' && "bg-slate-50 text-slate-800 border-slate-500/20",
                                    row.status === 'CANCELLED' && "bg-slate-100 text-slate-400 border-slate-300"
                                )}>
                                    {row.status}
                                </div>
                            </td>

                            {/* Quick Actions */}
                            <td className="px-2 py-1 align-top text-right w-[12%]">
                                {!isCancelled && (
                                    <div className="flex items-center justify-end gap-1">
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
                                            className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-500/10"
                                        >
                                            <MessageCircle className="w-3 h-3" />
                                        </button>
                                         <button
                                            onClick={(e) => canEdit && handleEditClick(e, row)}
                                            disabled={!canEdit}
                                            className={cn(
                                                "px-2 py-1 relative rounded text-[11px] font-black uppercase tracking-tighter border transition-all shadow-sm",
                                                canEdit ? "text-blue-600 hover:bg-blue-600 hover:text-white bg-blue-50/50 border-blue-500/10" : "opacity-30 cursor-not-allowed"
                                            )}
                                        >
                                            Edit
                                        </button>
                                        {row.status !== 'DELIVERED' && isActionAllowed(row) && canEdit && isCancelAllowed(row) && (
                                            <button
                                                onClick={(e) => handleCancelClick(e, row.id)}
                                                className="p-1 rounded text-red-500 hover:bg-red-500 hover:text-white border border-red-500/10 shadow-sm transition-all"
                                            >
                                                <Ban className="w-3 h-3" />
                                            </button>
                                        )}
                                        {currentUser?.role === 'SUPER_ADMIN' && (
                                            <button
                                                onClick={(e) => handleDeleteClick(e, row.id)}
                                                className="p-1 rounded text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-premium-card rounded-xl border border-premium-border shadow-soft overflow-hidden flex flex-col bg-white dark:bg-slate-900">
            <div className="overflow-x-auto custom-scrollbar-slim animate-in fade-in duration-500 hidden lg:block">
                <table className="w-full text-left border-collapse table-fixed bg-white dark:bg-slate-900">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                         <tr className="bg-slate-900/[0.02] dark:bg-white/[0.02] border-b border-premium-border/50">
                            <th className="px-1 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[3%] text-center">SR</th>
                            <th className="px-1.5 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[6%] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('lrNumber')}>
                                <div className="flex items-center gap-1 justify-center">LR <SortIcon field="lrNumber" /></div>
                            </th>
                             <th className="px-1.5 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[8%] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('lrNumber')}>
                                <div className="flex items-center gap-1 justify-center">Date & Time <SortIcon field="lrNumber" /></div>
                            </th>
                            <th className="px-2 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[20%] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('toBranch')}>
                                <div className="flex items-center gap-1">Destination <SortIcon field="toBranch" /></div>
                            </th>
                            <th className="px-2 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[15%] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('sender')}>
                                <div className="flex items-center gap-1">Sender <SortIcon field="sender" /></div>
                            </th>
                            <th className="px-2 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[15%] border-l border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('receiver' as any)}>
                                <div className="flex items-center gap-1">Receiver <SortIcon field="sender" /></div>
                            </th>
                            <th className="px-1.5 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[4%] text-center">Art.</th>
                            <th className="px-1.5 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[8%] text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('total')}>
                                <div className="flex items-center gap-1 justify-end">Value <SortIcon field="total" /></div>
                            </th>
                            <th className="px-1 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[7%] text-center">Payment</th>
                            <th className="px-1 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[9%] text-center">Status</th>
                            <th className="px-2 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-tighter w-[8%] text-right pr-2">Act.</th>
                        </tr>
                    </thead>
                    <tbody className="relative">
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, idx) => (
                                <TableRowSkeleton key={idx} columns={11} />
                            ))
                        ) : data.length > 0 ? (() => {
                            let globalSr = 0;
                            return data.map((row) => {
                                globalSr++;
                                const dateObj = new Date((row.status === 'DELIVERED' && row.deliveredAt) ? row.deliveredAt : (row.date || (row as any).createdAt));
                                const isCancelled = row.status === 'CANCELLED';
                                const canEdit = isEditAllowed(row);
                                
                                return (
                                    <tr key={row.id} className={cn(
                                        "transition-all duration-200 group border-b border-premium-border/30 last:border-0",
                                        isCancelled ? "bg-red-500/5 hover:bg-red-500/10" : "even:bg-slate-50/10 dark:even:bg-slate-800/10 hover:bg-blue-500/[0.03] dark:hover:bg-blue-400/[0.05]"
                                    )}>
                                        {/* SR Column */}
                                        <td className="px-1 py-1 align-top w-[3%] text-center text-[11px] font-bold text-slate-400 pt-1.5">
                                            {globalSr}
                                        </td>

                                         {/* LR Column */}
                                        <td className="px-1 py-1 align-top w-[6%] text-center">
                                            <button
                                                onClick={(e) => canEdit && handleEditClick(e, row)}
                                                className={cn(
                                                    "text-[16px] font-black font-mono transition-colors leading-none",
                                                    canEdit ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline" : "text-slate-400 dark:text-slate-500 opacity-50"
                                                )}
                                            >
                                                {row.lrNumber}
                                            </button>
                                        </td>

                                        {/* Date & Time Column */}
                                        <td className="px-1 py-1 align-top w-[8%] text-center">
                                            <div className="flex flex-col items-center opacity-70">
                                                <span className="text-[12px] font-black text-slate-600 leading-none">{dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                <span className="text-[11px] font-bold text-slate-400 mt-0.5">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>

                                        {/* Destination Branch */}
                                        <td className="px-2 py-1 align-top w-[20%]">
                                            <div className="flex items-start gap-1.5 h-full">
                                                <div className="w-1 h-full bg-purple-500/20 rounded-full shrink-0 self-stretch mt-0.5" />
                                                <div className="text-[15px] font-black text-slate-800 dark:text-slate-200 leading-none uppercase truncate pt-0.5">
                                                    {(row.toBranch as any)?.name || row.toBranch || ""}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Sender */}
                                        <td className="px-2 py-1 align-top w-[15%]">
                                            <div className="text-[15px] font-bold text-slate-700 dark:text-slate-200 leading-none truncate uppercase pt-0.5">
                                                {row.sender.name}
                                            </div>
                                        </td>

                                        {/* Receiver */}
                                        <td className="px-2 py-1 align-top w-[15%] opacity-80 border-l border-slate-100 dark:border-slate-800">
                                            <div className="text-[15px] font-bold text-slate-600 dark:text-slate-300 leading-none truncate uppercase pt-0.5">
                                                {row.receiver.name}
                                            </div>
                                        </td>

                                        {/* Article Count */}
                                        <td className="px-1 py-1 align-top text-center w-[4%] font-black text-slate-600 dark:text-slate-300 text-[16px]">
                                            {row.parcels.reduce((s, p) => s + Number(p.quantity || 0), 0)}
                                        </td>

                                        {/* Shipment Value */}
                                        <td className="px-1.5 py-1 align-top text-right w-[8%]">
                                            <div className="flex flex-col items-end">
                                                <div className="text-[16px] font-black text-slate-900 dark:text-slate-100 leading-none">₹{row.costs.total.toLocaleString()}</div>
                                            </div>
                                        </td>

                                        {/* Payment State */}
                                        <td className="px-1 py-1 align-top text-center w-[7%]">
                                            <div className={cn(
                                                "inline-flex items-center px-1 py-0.5 rounded text-[11px] font-black uppercase tracking-tighter border",
                                                row.paymentType === 'Paid' ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-500/20"
                                            )}>
                                                {row.paymentType}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-1 py-1 align-top text-center w-[9%]">
                                            <div className={cn(
                                                "inline-flex items-center px-1 py-0.5 rounded text-[11px] font-black uppercase tracking-tighter border",
                                                row.status === 'DELIVERED' && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 border-emerald-500/20",
                                                row.status === 'PENDING' && "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-500/20",
                                                row.status === 'BOOKED' && "bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border-slate-500/20",
                                                row.status === 'CANCELLED' && "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700"
                                            )}>
                                                {row.status}
                                            </div>
                                        </td>

                                        {/* Quick Actions */}
                                        <td className="px-2 py-1 align-top text-right w-[8%]">
                                            {!isCancelled && (
                                                <div className="flex items-center justify-end gap-1">
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
                                                        className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-500/10"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                    </button>
                                                     <button
                                                        onClick={(e) => canEdit && handleEditClick(e, row)}
                                                        disabled={!canEdit}
                                                        className={cn(
                                                            "px-2 py-1 relative rounded text-[11px] font-black uppercase tracking-tighter border transition-all shadow-sm",
                                                            canEdit ? "text-blue-600 hover:bg-blue-600 hover:text-white bg-blue-50/50 border-blue-500/10" : "opacity-30 cursor-not-allowed"
                                                        )}
                                                    >
                                                        Edit
                                                    </button>
                                                    {row.status !== 'DELIVERED' && isActionAllowed(row) && canEdit && isCancelAllowed(row) && (
                                                        <button
                                                            onClick={(e) => handleCancelClick(e, row.id)}
                                                            className="p-1 rounded text-red-500 hover:bg-red-500 hover:text-white border border-red-500/10 shadow-sm transition-all"
                                                        >
                                                            <Ban className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {currentUser?.role === 'SUPER_ADMIN' && (
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, row.id)}
                                                            className="p-1 rounded text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            });
                        })() : (
                            <tr>
                                <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-1 bg-slate-100 rounded-full" />
                                        <p className="font-medium">No records found matching your filters</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 lg:hidden">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                        <div key={`skel-${idx}`} className="h-44 bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse" />
                    ))
                ) : data.length > 0 ? (
                    data.map((row) => {
                        const dateObj = new Date((row.status === 'DELIVERED' && row.deliveredAt) ? row.deliveredAt : (row.date || (row as any).createdAt));
                        const isCancelled = row.status === 'CANCELLED';
                        const canEdit = isEditAllowed(row);
                        
                        return (
                            <div key={row.id} className={cn(
                                "p-3.5 rounded-xl border shadow-sm flex flex-col gap-3 relative transition-all",
                                isCancelled ? "bg-red-500/5 border-red-500/20" : "bg-white dark:bg-slate-900/50 border-premium-border"
                            )}>
                                <div className="flex justify-between items-start border-b border-premium-border pb-3">
                                    <div>
                                        <button 
                                            onClick={(e) => canEdit && handleEditClick(e, row)}
                                            className={cn("text-sm font-mono font-black", canEdit ? "text-blue-600 dark:text-blue-400 underline" : "text-slate-400")}
                                        >
                                            {row.lrNumber}
                                        </button>
                                        <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">
                                            {dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {(row.toBranch as any)?.name || row.toBranch || ""}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <div className="flex gap-1.5">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                row.paymentType === 'Paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                            )}>
                                                {row.paymentType}
                                            </span>
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                row.status === 'DELIVERED' ? "bg-emerald-500/10 text-emerald-500" :
                                                row.status === 'PENDING' ? "bg-blue-500/10 text-blue-500" :
                                                row.status === 'BOOKED' ? "bg-slate-800 text-white" :
                                                "bg-slate-200 text-slate-500"
                                            )}>
                                                {row.status}
                                            </span>
                                        </div>
                                        <span className="text-sm font-black mt-0.5">₹{row.costs.total.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center text-xs">
                                    <div className="w-[45%]">
                                        <span className="text-[9px] text-muted-foreground block mb-0.5 uppercase tracking-wide">Sender</span>
                                        <span className="font-bold truncate block">{row.sender.name}</span>
                                    </div>
                                    <div className="text-center text-muted-foreground/30 px-1">→</div>
                                    <div className="w-[45%] text-right">
                                        <span className="text-[9px] text-muted-foreground block mb-0.5 uppercase tracking-wide">Receiver</span>
                                        <span className="font-bold truncate block">{row.receiver.name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-premium-border mt-auto justify-between">
                                    <div className="text-[10px] font-black text-slate-500 uppercase">
                                        Qty: {row.parcels.reduce((s, p) => s + Number(p.quantity || 0), 0)}
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
                                                className="p-1.5 rounded-md bg-green-500/10 text-green-600 active:bg-green-600 active:text-white transition-all shadow-sm border border-green-500/20"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => canEdit && handleEditClick(e, row)}
                                                disabled={!canEdit}
                                                className={cn(
                                                    "px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                                    canEdit ? "text-blue-600 active:bg-blue-600 active:text-white bg-blue-500/10 border-blue-500/20" : "opacity-30"
                                                )}
                                            >
                                                Edit
                                            </button>
                                            {row.status !== 'DELIVERED' && isActionAllowed(row) && canEdit && isCancelAllowed(row) && (
                                                <button
                                                    onClick={(e) => handleCancelClick(e, row.id)}
                                                    className="p-1.5 rounded-md text-red-500 bg-red-500/10 active:bg-red-500 active:text-white border border-red-500/20 shadow-sm"
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {currentUser?.role === 'SUPER_ADMIN' && (
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, row.id)}
                                                    className="p-1.5 rounded-md text-slate-500 bg-slate-500/10 active:bg-slate-900 active:text-white border border-slate-500/20 shadow-sm"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <p className="font-medium">No records found</p>
                    </div>
                )}
            </div>

            {/* Load More Button - Simpler for all users */}
            {hasMore && (
                <div className="py-6 flex items-center justify-center bg-slate-50/50 border-t border-premium-border">
                    <button
                        onClick={loadMore}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-3 rounded-xl text-[16px] uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isLoading ? (
                             <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Loading...
                             </>
                        ) : (
                            <>
                                Show More Data ({totalItems - data.length} Left)
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            )}
            
            {!hasMore && data.length > 0 && (
                <div className="py-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50/30">
                    Showing all {totalItems} records
                </div>
            )}
            {/* Cancel Booking Modal */}
            <CancelBookingModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleConfirmCancel}
                lrNumber={data.find(b => b.id === bookingToCancel)?.lrNumber}
            />
            {/* Delete Confirmation Modal */}
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
            {/* Edit Booking Modal */}
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
