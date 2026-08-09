"use client";

import { useState, memo, useEffect, useRef, useCallback } from "react";
import { User, Loader2 } from "lucide-react";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { parcelService } from "@/frontend/services/parcelService";

interface ContactFormProps {
    title: string;
    type: "sender" | "receiver";
    values: { name: string; mobile: string; email?: string };
    onChange: (field: string, value: string) => void;
    onNext?: () => void;
    disabled?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
}

export const BookingForm = memo(({
    title,
    type,
    values,
    onChange,
    onNext,
    disabled,
    inputRef,
}: ContactFormProps) => {
    const [isSearchingName, setIsSearchingName] = useState(false);
    const [isSearchingMobile, setIsSearchingMobile] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [activeField, setActiveField] = useState<"name" | "mobile" | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Separate timers so name and mobile debounces never cancel each other
    const nameSearchTimeout = useRef<NodeJS.Timeout | null>(null);
    const mobileSearchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Per-field version counters — incremented on each new search to discard stale API responses
    const nameRequestVersion = useRef(0);
    const mobileRequestVersion = useRef(0);

    const isMounted = useRef(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (nameSearchTimeout.current) clearTimeout(nameSearchTimeout.current);
            if (mobileSearchTimeout.current) clearTimeout(mobileSearchTimeout.current);
        };
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setActiveField(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll active suggestion into view
    useEffect(() => {
        if (focusedIndex >= 0) {
            const el = document.getElementById(`suggestion-${type}-${focusedIndex}`);
            if (el) {
                el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }, [focusedIndex, type]);

    const blurTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleBlur = () => {
        if (blurTimeout.current) clearTimeout(blurTimeout.current);
        blurTimeout.current = setTimeout(() => {
            if (isMounted.current) {
                setActiveField(null);
            }
        }, 150);
    };

    const handleFocus = (field: "name" | "mobile") => {
        if (blurTimeout.current) clearTimeout(blurTimeout.current);
        if (suggestions.length > 0) {
            setActiveField(field);
        }
    };

    const fetchSuggestions = useCallback(async (query: string, field: "name" | "mobile") => {
        if (query.length < 2) {
            if (!isMounted.current) return;
            setSuggestions([]);
            setActiveField(null);
            return;
        }

        // Stamp this request; any older in-flight response for the same field will be discarded
        const versionRef = field === "name" ? nameRequestVersion : mobileRequestVersion;
        const version = ++versionRef.current;

        if (field === "name") setIsSearchingName(true);
        else setIsSearchingMobile(true);

        const { data, error } = await parcelService.searchContact(query, field);

        // Ignore if component unmounted or a newer request for this field already fired
        if (!isMounted.current || version !== versionRef.current) {
            if (field === "name") setIsSearchingName(false);
            else setIsSearchingMobile(false);
            return;
        }

        if (!error && data) {
            setSuggestions(data);
            // Only set active field and open suggestions popup if the user is STILL focused on this input
            const activeEl = document.activeElement;
            const inputId = `${type === 'sender' ? 'sender' : 'receiver'}-${field}`;
            if (activeEl && activeEl.id === inputId && data.length > 0) {
                setActiveField(field);
            } else {
                setActiveField(null);
            }
            setFocusedIndex(-1);
        }

        if (field === "name") setIsSearchingName(false);
        else setIsSearchingMobile(false);
    }, [type]);

    const handleNameChange = (val: string) => {
        onChange("name", val);
        if (nameSearchTimeout.current) clearTimeout(nameSearchTimeout.current);
        nameSearchTimeout.current = setTimeout(() => fetchSuggestions(val, "name"), 250);
    };

    const handleMobileChange = (val: string) => {
        let numericVal = val.replace(/\D/g, "");

        // Strip leading country code "91" when user pastes a 12-digit number
        if (numericVal.length > 10 && numericVal.startsWith("91")) {
            numericVal = numericVal.slice(2);
        }

        if (numericVal.length <= 10) {
            onChange("mobile", numericVal);
            if (mobileSearchTimeout.current) clearTimeout(mobileSearchTimeout.current);
            mobileSearchTimeout.current = setTimeout(() => fetchSuggestions(numericVal, "mobile"), 250);
        }
    };

    const selectSuggestion = (suggestion: any) => {
        if (blurTimeout.current) clearTimeout(blurTimeout.current);
        if (nameSearchTimeout.current) clearTimeout(nameSearchTimeout.current);
        if (mobileSearchTimeout.current) clearTimeout(mobileSearchTimeout.current);

        if (activeField === "name") {
            if (suggestion.name) onChange("name", suggestion.name);
            if (suggestion.mobile) onChange("mobile", suggestion.mobile);
            const mobileInput = document.getElementById(`${type}-mobile`) as HTMLInputElement;
            mobileInput?.focus();
        } else if (activeField === "mobile") {
            if (suggestion.mobile) onChange("mobile", suggestion.mobile);
            if (suggestion.name) onChange("name", suggestion.name);
            onNext?.();
        }
        setActiveField(null);
        setFocusedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent, field: "name" | "mobile") => {
        if (activeField === field && suggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
                return;
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                return;
            } else if (e.key === "Enter" && focusedIndex >= 0) {
                e.preventDefault();
                selectSuggestion(suggestions[focusedIndex]);
                return;
            } else if (e.key === "Escape") {
                setActiveField(null);
                setFocusedIndex(-1);
                return;
            }
        }

        // Default enter key behavior if no suggestion is highlighted
        if (e.key === "Enter") {
            e.preventDefault();
            if (nameSearchTimeout.current) clearTimeout(nameSearchTimeout.current);
            if (mobileSearchTimeout.current) clearTimeout(mobileSearchTimeout.current);
            setActiveField(null);

            if (field === "name") {
                const mobileInput = document.getElementById(`${type}-mobile`) as HTMLInputElement;
                mobileInput?.focus();
                mobileInput?.select();
            } else if (field === "mobile") {
                onNext?.();
            }
        }
    };

    return (
        <div
            className="relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-visible"
            ref={containerRef}
        >
            <div className="flex bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-[13px] font-medium text-slate-800 dark:text-slate-200 tracking-wider leading-none">
                    {title}
                </h3>
            </div>

            <div className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Name Input */}
                    <div className="space-y-0.5 flex-1 relative">
                        <Label className="text-[15px] font-medium text-blue-700 dark:text-blue-400 tracking-tight">
                            {type === 'sender' ? 'Sender Name' : 'Receiver Name'}
                        </Label>
                        <div className="relative">
                            <Input
                                type="text"
                                id={`${type === 'sender' ? 'sender' : 'receiver'}-name`}
                                ref={inputRef}
                                value={values.name}
                                disabled={disabled}
                                onChange={(e) => handleNameChange(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, "name")}
                                onFocus={() => handleFocus("name")}
                                onBlur={handleBlur}
                                className="h-11 text-[18px] font-black text-black dark:text-white border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md shadow-none placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-10"
                                placeholder="Enter Name"
                                autoComplete="off"
                            />
                            {isSearchingName && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                </div>
                            )}
                        </div>

                        {/* Name Suggestions */}
                        {activeField === "name" && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden">
                                <ul className="max-h-48 overflow-y-auto py-1" data-lenis-prevent>
                                    {suggestions.map((s, idx) => (
                                        <li
                                            key={idx}
                                            id={`suggestion-${type}-${idx}`}
                                            onClick={() => selectSuggestion(s)}
                                            onMouseEnter={() => setFocusedIndex(idx)}
                                            className={`px-3 py-2 cursor-pointer flex flex-col transition-colors ${focusedIndex === idx ? 'bg-blue-100 dark:bg-slate-700' : 'hover:bg-blue-50 dark:hover:bg-slate-700/50'}`}
                                        >
                                            {s.name && <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200">{s.name}</span>}
                                            {s.mobile && <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200">{s.mobile}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Mobile Input */}
                    <div className="space-y-0.5 flex-1 relative">
                        <Label className="text-[15px] font-medium text-blue-700 dark:text-blue-400 tracking-tight">Mobile Number</Label>
                        <div className="relative">
                            <Input
                                type="tel"
                                id={`${type === 'sender' ? 'sender' : 'receiver'}-mobile`}
                                value={values.mobile}
                                disabled={disabled}
                                onKeyDown={(e) => handleKeyDown(e, "mobile")}
                                onChange={(e) => handleMobileChange(e.target.value)}
                                onFocus={() => handleFocus("mobile")}
                                onBlur={handleBlur}
                                className="h-11 text-[18px] font-black text-black dark:text-white border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md shadow-none placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-10"
                                placeholder="10-digit Mobile"
                                autoComplete="off"
                            />
                            {isSearchingMobile && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                </div>
                            )}
                        </div>

                        {/* Mobile Suggestions */}
                        {activeField === "mobile" && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden">
                                <ul className="max-h-48 overflow-y-auto py-1" data-lenis-prevent>
                                    {suggestions.map((s, idx) => (
                                        <li
                                            key={idx}
                                            id={`suggestion-${type}-${idx}`}
                                            onClick={() => selectSuggestion(s)}
                                            onMouseEnter={() => setFocusedIndex(idx)}
                                            className={`px-3 py-2 cursor-pointer flex flex-col transition-colors ${focusedIndex === idx ? 'bg-blue-100 dark:bg-slate-700' : 'hover:bg-blue-50 dark:hover:bg-slate-700/50'}`}
                                        >
                                            {s.name && <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200">{s.name}</span>}
                                            {s.mobile && <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200">{s.mobile}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

BookingForm.displayName = "BookingForm";
