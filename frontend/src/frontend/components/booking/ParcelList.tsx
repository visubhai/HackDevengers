"use client";

import { Package, Plus, Trash2, Layers, ShoppingBag } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Parcel } from "@/shared/types";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { SingleSelect } from "@/frontend/components/ui/single-select-dropdown";
import { useState, useEffect, memo } from "react";
import { adminService } from "@/super-admin/services/adminService";

interface ParcelListProps {
    parcels: Parcel[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    onChange: (id: string, field: keyof Parcel, value: any) => void;
    onNext?: () => void;
    disabled?: boolean;
    remarks?: string;
    onRemarksChange?: (val: string) => void;
    variant?: 'default' | 'enterprise' | 'fintech' | 'modern';
}

const ITEM_CATEGORIES = [
    "BLACK PARCEL", "WHITE PARCEL", "RED PARCEL", "GREEN PARCEL", "KHAKHI PARCEL", "COLORING PARCEL", "YELLOW PARCEL",
    "KHAKHI BOX", "WHITE BOX", "BLACK BOX", "WHITE KANTAN BOX", "GREEN KANTAN BOX", "COLORING BOX",
    "WHITE KANTAN", "BLACK KANTAN", "KHAKHI KANTAN", "YELLOW KANTAN", "RED KANTAN", "GREEN KANTAN", "COLORING KANTAN",
    "KHAKHI COVER", "WHITE COVER", "GREEN COVER", "COLORING COVER",
    "THELI", "COLORING THELI", "WHITE THELI",
    "ROLL", "DABBA", "PETI", "ACTIVA", "BIKE", "PAIPE", "OTHER"
];

const ITEM_CATEGORY_OPTIONS = ITEM_CATEGORIES.map(cat => ({ label: cat, value: cat }));

export const ParcelList = memo(({
    parcels,
    onAdd,
    onRemove,
    onChange,
    onNext,
    disabled,
    remarks,
    onRemarksChange,
    variant = 'default'
}: ParcelListProps) => {
    const [customCategories, setCustomCategories] = useState<{label: string, value: string}[]>([]);

    useEffect(() => {
        let mounted = true;
        adminService.getSystemSettings().then(res => {
            if (mounted && res.data) {
                const typesSetting = res.data.find((s: any) => s.key === 'PARCEL_ITEM_TYPES');
                if (typesSetting && typesSetting.value) {
                    const cats = typesSetting.value.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                    setCustomCategories(cats.map((cat: string) => ({ label: cat, value: cat })));
                }
            }
        }).catch(() => {});
        return () => { mounted = false; };
    }, []);

    const currentOptions = customCategories.length > 0 ? customCategories : ITEM_CATEGORY_OPTIONS;

    const handleKeyDown = (e: React.KeyboardEvent, field: string, index: number = 0) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (field === "itemType") {
                document.getElementById(`parcel-qty-${index}`)?.focus();
            } else if (field === "quantity") {
                document.getElementById(`parcel-rate-${index}`)?.focus();
            } else if (field === "rate") {
                document.getElementById(`parcel-remarks-${index}`)?.focus();
            } else if (field === "remarks") {
                if (index < parcels.length - 1) {
                    document.getElementById(`parcel-type-${index + 1}`)?.focus();
                } else {
                    onNext?.();
                }
            }
        }
    };

    return (
        <div className="relative bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col overflow-visible">
            {/* Header - Refined Soft Slate Style */}
            <div className="flex bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-[13px] font-medium text-slate-800 dark:text-slate-200 tracking-wider leading-none">
                        Parcel Info
                    </h3>
                </div>
                <Button
                    onClick={onAdd}
                    disabled={disabled}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-black text-blue-600 hover:bg-blue-50 ml-auto"
                >
                    <Plus className="w-3 h-3 mr-1" /> ADD PARCEL
                </Button>
            </div>

            <div className="p-3 space-y-3">
                {parcels.map((parcel, index) => {
                    const parcelId = parcel.id || (parcel as any)._id || `default-${index}`;
                    return (
                        <div key={parcelId} className="space-y-2 relative pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                            {/* Row 1: Item Description */}
                            <div className="space-y-0.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[15px] font-medium text-blue-700 dark:text-blue-400 tracking-tight">Item Description</Label>
                                    {parcels.length > 1 && (
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => onRemove(parcelId)}
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 -mr-1 rounded-md transition-colors"
                                            title="Delete Parcel"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <SingleSelect
                                    id={`parcel-type-${index}`}
                                    value={parcel.itemType}
                                    options={currentOptions}
                                    onChange={(val) => {
                                        onChange(parcelId, "itemType", val);
                                        // Smoother: Auto-focus quantity after choosing item
                                        setTimeout(() => {
                                            const qtyInput = document.getElementById(`parcel-qty-${index}`) as HTMLInputElement;
                                            qtyInput?.focus();
                                            qtyInput?.select();
                                        }, 10);
                                    }}
                                    disabled={disabled}
                                    placeholder="Select Item..."
                                    className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[18px] font-black text-slate-900 dark:text-slate-100 rounded-md shadow-none"
                                />
                            </div>

                            {/* Row 2: Qty & Rate */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <Label className="text-[15px] font-medium text-blue-700 dark:text-blue-400 tracking-tight">Quantity</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        id={`parcel-qty-${index}`}
                                        value={parcel.quantity}
                                        disabled={disabled}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            onChange(parcelId, "quantity", val === "" ? "" : parseInt(val) || 0);
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, "quantity", index)}
                                        className="h-11 text-[20px] font-black text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md shadow-none"
                                        placeholder="Qty"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-[15px] font-medium text-blue-700 dark:text-blue-400 tracking-tight">Rate (₹)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        id={`parcel-rate-${index}`}
                                        value={parcel.rate}
                                        disabled={disabled}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            onChange(parcelId, "rate", val === "" ? "" : parseFloat(val) || 0);
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                        className="h-11 text-[20px] font-black text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md shadow-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Remarks */}
                            <div className="space-y-0.5">
                                <Label className="text-[15px] font-medium text-blue-700 dark:text-blue-400 tracking-tight">Remarks / Notes</Label>
                                <Input
                                    type="text"
                                    id={`parcel-remarks-${index}`}
                                    value={parcel.remarks || ''}
                                    disabled={disabled}
                                    onChange={(e) => onChange(parcelId, "remarks", e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, "remarks", index)}
                                    className="h-11 text-[18px] font-black text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md shadow-none"
                                    placeholder="Optional remarks..."
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            
        </div>
    );
});

ParcelList.displayName = "ParcelList";
