"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, X, Search, ChevronDown } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

export type Option = {
    label: string;
    value: string;
};

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    className,
    disabled = false
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [isMobile, setIsMobile] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setMounted(true);
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const closeDropdown = React.useCallback(() => {
        setOpen(false);
        setSearch("");
    }, []);

    // Desktop only: close on outside click
    React.useEffect(() => {
        if (!open || isMobile) return;
        const handleOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                closeDropdown();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeDropdown();
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("touchstart", handleOutside, { passive: true });
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("touchstart", handleOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open, isMobile, closeDropdown]);

    // Lock body scroll when mobile sheet is open
    React.useEffect(() => {
        if (!isMobile) return;
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [open, isMobile]);

    const handleUnselect = (item: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        onChange(selected.filter((i) => i !== item));
    };

    const toggleSelectAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map((opt) => opt.value));
        }
    };

    const toggleOption = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((i) => i !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const filteredOptions = options.filter((opt) =>
        (opt.label || "").toLowerCase().includes((search || "").toLowerCase())
    );

    // Shared option list content
    const OptionList = ({ autoFocusSearch }: { autoFocusSearch?: boolean }) => (
        <>
            {/* Search */}
            <div className="flex items-center border-b border-premium-border px-3 bg-muted/20 shrink-0">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground/60" />
                <input
                    className="flex h-11 w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground/40 font-medium text-foreground"
                    placeholder="Search branches..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus={autoFocusSearch}
                />
                {search.length > 0 && (
                    <button
                        type="button"
                        onPointerDown={(e) => { e.preventDefault(); setSearch(""); }}
                        className="ml-1 p-1 rounded-md hover:bg-muted/50 text-muted-foreground/60"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-1.5 py-1" data-lenis-prevent="true">
                {filteredOptions.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">No branches found.</div>
                )}

                {filteredOptions.length > 0 && (
                    <div
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={toggleSelectAll}
                        className={cn(
                            "flex cursor-pointer select-none items-center rounded-lg px-3 py-2 font-semibold outline-none transition-colors",
                            selected.length === options.length
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <div className={cn(
                            "mr-2.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            selected.length === options.length
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-slate-300 dark:border-slate-600"
                        )}>
                            <Check className={cn("h-2.5 w-2.5", selected.length === options.length ? "opacity-100" : "opacity-0")} />
                        </div>
                        <span className="text-sm">All Branches</span>
                        <span className="ml-auto text-xs font-normal text-muted-foreground/60">({options.length})</span>
                    </div>
                )}

                {filteredOptions.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                        <div
                            key={option.value}
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => toggleOption(option.value)}
                            className={cn(
                                "flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors",
                                isSelected
                                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                                    : "text-foreground hover:bg-muted/50"
                            )}
                        >
                            <div className={cn(
                                "mr-2.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                                isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-slate-300 dark:border-slate-600"
                            )}>
                                <Check className={cn("h-2.5 w-2.5", isSelected ? "opacity-100" : "opacity-0")} />
                            </div>
                            <span>{option.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-premium-border bg-background p-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground pl-1">
                    {selected.length > 0 ? `${selected.length} selected` : "Showing all"}
                </span>
                <div className="flex items-center gap-2">
                    {selected.length > 0 && (
                        <button
                            type="button"
                            onPointerDown={(e) => { e.preventDefault(); onChange([]); }}
                            className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                    )}
                    <button
                        type="button"
                        onPointerDown={(e) => { e.preventDefault(); closeDropdown(); }}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Done
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger button */}
            <div
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setOpen(!open)}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen(!open);
                    }
                }}
                className={cn(
                    "flex min-h-[42px] w-full items-center justify-between rounded-xl border border-premium-border bg-background px-3 py-1.5 text-sm ring-offset-background hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm cursor-pointer",
                    open && "border-primary/50 ring-2 ring-primary/10",
                    className
                )}
            >
                <div className="flex flex-row flex-wrap gap-1.5 flex-1 items-center py-1 max-w-[calc(100%-40px)]">
                    {selected.length === 0 && (
                        <span className="text-muted-foreground/50 font-medium px-1 text-xs">{placeholder}</span>
                    )}
                    {selected.map((item) => {
                        const option = options.find((o) => o.value === item);
                        return (
                            <div
                                key={item}
                                className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 rounded-lg px-2 py-0.5 transition-all"
                            >
                                <span className="text-[11px] font-semibold text-primary whitespace-nowrap leading-none">
                                    {option?.label || item}
                                </span>
                                <div
                                    className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer transition-colors"
                                    onClick={(e) => handleUnselect(item, e)}
                                >
                                    <X className="h-3 w-3 text-primary/40 hover:text-red-500" />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center self-stretch ml-auto pl-2 gap-1 border-l border-slate-100 dark:border-slate-800 my-1 min-w-[40px] justify-end">
                    {selected.length > 0 && (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
                            title="Clear All"
                        >
                            <X className="w-3.5 h-3.5 text-slate-300 hover:text-red-500" />
                        </div>
                    )}
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 mr-0.5 transition-transform duration-200", open && "rotate-180")} />
                </div>
            </div>

            {/* Desktop: absolute dropdown */}
            {open && !isMobile && (
                <div className="absolute z-50 mt-2 w-full min-w-[220px] rounded-xl border border-premium-border bg-background shadow-2xl shadow-black/8 animate-in fade-in zoom-in-95 flex flex-col overflow-hidden backdrop-blur-xl max-h-[420px]">
                    <OptionList autoFocusSearch />
                </div>
            )}

            {/* Mobile: bottom sheet via portal */}
            {open && isMobile && mounted && createPortal(
                <>
                    {/* Backdrop — only explicit tap here closes the sheet */}
                    <div
                        className="fixed inset-0 z-[999] bg-black/50"
                        onPointerDown={(e) => { e.preventDefault(); closeDropdown(); }}
                    />
                    {/* Sheet */}
                    <div
                        className="fixed bottom-0 left-0 right-0 z-[1000] flex flex-col rounded-t-2xl border-t border-premium-border bg-background shadow-2xl"
                        style={{ maxHeight: "78vh" }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2 shrink-0">
                            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        </div>
                        {/* Sheet header */}
                        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
                            <span className="text-sm font-black text-foreground uppercase tracking-wider">
                                Select Branch
                            </span>
                            <button
                                type="button"
                                onPointerDown={(e) => { e.preventDefault(); closeDropdown(); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <OptionList autoFocusSearch={false} />
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
