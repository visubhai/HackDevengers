"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

export type Option = {
    label: string;
    value: string;
};

interface SingleSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    searchable?: boolean;
    id?: string;
}

export function SingleSelect({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    className,
    disabled = false,
    searchable = true,
    id
}: SingleSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [activeIndex, setActiveIndex] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);

    // Close on click/touch outside
    React.useEffect(() => {
        if (!open) return;
        const handleOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        // ESC key to close
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("touchstart", handleOutside, { passive: true });
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("touchstart", handleOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    const getMatchingOptions = () => {
        const query = (search || "").toLowerCase().trim();
        if (!query) return options;

        const terms = query.split(/\s+/).filter(Boolean);
        if (terms.length === 0) return options;
        
        // Final, Permanent Fix: Every single term MUST be found in the label
        return options
            .filter(opt => {
                const label = String(opt.label || "").toLowerCase();
                return terms.every(term => label.includes(term));
            })
            .map(opt => {
                const label = String(opt.label || "").toLowerCase();
                let score = 0;
                
                // Rank priority: 
                // 1. Starts with the full query
                if (label.startsWith(query)) score = 100;
                // 2. Contains the full query as a whole
                else if (label.includes(query)) score = 50;
                // 3. Otherwise (it matched because of .every(terms))
                else score = 10;
                
                return { ...opt, score };
            })
            .sort((a, b) => {
                // Secondary sort: Relevance Score
                if (b.score !== a.score) return b.score - a.score;
                // Tertiary sort: Shorter label first
                return a.label.length - b.label.length;
            })
            .map(({ score, ...opt }) => opt);
    };

    const [dropUp, setDropUp] = React.useState(false);

    // Calculate position when opening
    React.useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If less than 300px below, flip it up
            setDropUp(spaceBelow < 300);
            
            // Focus logic: if search is empty, don't highlight anything yet
            if (!search) setActiveIndex(-1);
        }
    }, [open, search]);

    const matchingOptions = getMatchingOptions();

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (val: string) => {
        onChange(val);
        setOpen(false);
        setSearch("");
        triggerRef.current?.focus(); // Return focus to trigger
    };

    const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(prev => {
                if (matchingOptions.length === 0) return -1;
                return (prev + 1) % matchingOptions.length;
            });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(prev => {
                if (matchingOptions.length === 0) return -1;
                const next = prev - 1;
                return next < 0 ? matchingOptions.length - 1 : next;
            });
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (matchingOptions.length > 0 && activeIndex >= 0) {
                handleSelect(matchingOptions[activeIndex].value);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
        }
    };

    // Auto-scroll to active item
    React.useEffect(() => {
        if (open && activeIndex >= 0) {
            const activeElement = document.getElementById(`option-${activeIndex}`);
            activeElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex, open]);

    // Reset/Auto-focus first item only when searching
    React.useEffect(() => {
        if (search.trim()) {
            setActiveIndex(0);
        } else {
            setActiveIndex(-1);
        }
    }, [search]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                id={id}
                ref={triggerRef}
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                onKeyDown={handleTriggerKeyDown}
                className={cn(
                    "flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2 text-[16px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 font-bold text-slate-800 transition-all",
                    className
                )}
                disabled={disabled}
            >
                <span className={cn("truncate", !selectedOption && "text-slate-400 font-medium")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>

            {open && (
                <>
                    {/* Mobile backdrop – tap anywhere outside list to close */}
                    <div
                        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px] md:hidden"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            setOpen(false);
                        }}
                    />
                    <div className={cn(
                        "absolute z-[9999] left-0 w-full min-w-[300px] border border-slate-200 bg-white/95 shadow-xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl",
                        dropUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"
                    )}>
                        {searchable && (
                            <div className="flex items-center border-b border-slate-100 px-4 py-1">
                                <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                                <input
                                    className="flex h-11 w-full bg-transparent py-2 text-[16px] outline-none placeholder:text-slate-300 font-medium text-slate-700"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    autoFocus
                                />
                                {/* Mobile close button */}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="ml-2 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0 md:hidden"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar overscroll-contain" data-lenis-prevent="true">
                        {matchingOptions.length === 0 && (
                            <div className="py-6 text-center text-[13px] text-slate-400 font-medium italic">No matches.</div>
                        )}

                        {matchingOptions.map((option, index) => (
                            <div
                                id={`option-${index}`}
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "relative flex cursor-pointer select-none items-center px-4 py-1.5 text-[15px] transition-colors",
                                    value === option.value
                                        ? "bg-blue-600 text-white font-black"
                                        : index === activeIndex 
                                            ? "bg-blue-50 text-blue-700 font-black" 
                                            : "text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-bold"
                                )}
                            >
                                <span className="flex-1 truncate uppercase tracking-tight">{option.label}</span>
                                {value === option.value && (
                                    <Check className="ml-2 h-3.5 w-3.5 text-white" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                </>
            )}
        </div>
    );
}
