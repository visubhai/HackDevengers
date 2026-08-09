"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, Menu, ChevronDown, LogOut, Building2, History, Calculator, Sun, Moon, HelpCircle, TrendingUp, Settings, Truck } from "lucide-react";
import { useBranchStore } from "@/frontend/lib/store";
import { useBranches } from "@/frontend/hooks/useBranches";
import { authService } from "@/frontend/services/authService";
import { parcelService } from "@/frontend/services/parcelService";
import { useRouter } from "next/navigation";
import { cn } from "@/frontend/lib/utils";
import { useDebounce } from "../../hooks/useDebounce";
import { Booking } from "@/shared/types";
import { useToast } from "@/frontend/components/ui/toast";

const EditBookingModal = dynamic(() => import("@/frontend/components/reports/EditBookingModal").then(mod => mod.EditBookingModal), {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[4px] z-[100] flex items-center justify-center" />
});

import { HelpCenter } from "./HelpCenter";
import { LoadingSpinner } from "@/frontend/components/ui/LoadingSpinner";

export function Header() {
    const { currentUser, searchQuery, setSearchQuery, setCurrentUser, toggleMobileMenu, bookingLrNumber } = useBranchStore();
    const router = useRouter();
    const { branchObjects } = useBranches();
    const { addToast } = useToast();

    // Local state for header clock
    const [time, setTime] = useState(new Date());
    const [searchResults, setSearchResults] = useState<Booking[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);

    const debouncedSearch = useDebounce(searchQuery, 300);

    // Click outside handler for dropdowns
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearch.length < 3) {
                setSearchResults([]);
                setShowSearchResults(false);
                return;
            }

            setIsSearching(true);
            const { data, error } = await parcelService.searchGlobalByLR(debouncedSearch);
            setIsSearching(false);

            if (data) {
                setSearchResults(data);
                setShowSearchResults(true);
            }
        };

        performSearch();
    }, [debouncedSearch]);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);

            await authService.logout();
            setCurrentUser(null);
            router.refresh();
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    // Branch logic (Simplified: Show current user's branch)
    const displayBranch = currentUser?.branch || "All Branches";

    return (
        <header className="h-16 bg-premium-header border-b border-slate-800/60 flex items-center justify-between px-6 sticky top-0 z-50 print:hidden relative shadow-sm backdrop-blur-xl">
            {/* Abstract Background Patterns - Matches Sidebar and Login Page */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute top-0 left-1/4 w-[250px] h-[250px] bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2" />
            </div>

            <div className="relative z-10 flex items-center gap-3 flex-1">
                {/* Mobile Logo replacing hamburger */}
                <div className="md:hidden flex items-center shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center p-1 shadow-sm">
                        <Truck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                    </div>
                </div>

                {/* Desktop Search — visible on sm+ */}
                <div className="relative w-full max-w-md hidden sm:block" ref={searchRef}>
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 3 && setShowSearchResults(true)}
                        placeholder="Search LR number (min 3 chars)..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl text-sm font-medium outline-none focus:bg-slate-700 dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-white placeholder:text-slate-500"
                    />

                    {/* Search Results Dropdown */}
                    {showSearchResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50">
                            <div className="p-2 border-b border-slate-700 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Search Results</span>
                                <button onClick={() => setShowSearchResults(false)} className="p-1 hover:bg-slate-700 rounded text-slate-500">
                                    <Menu className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                {isSearching ? (
                                    <div className="p-8 text-center">
                                        <LoadingSpinner size={32} className="mx-auto" />
                                        <p className="text-xs text-slate-500 mt-4 font-bold uppercase tracking-widest">Searching Database...</p>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                        {searchResults.map((booking) => (
                                            <button
                                                key={booking.id || (booking as any)._id}
                                                onClick={() => {
                                                    setShowSearchResults(false);
                                                    setSelectedBookingForEdit(booking);
                                                }}
                                                className="w-full p-3 hover:bg-slate-700/50 rounded-xl flex items-start gap-4 transition-all text-left border border-transparent hover:border-slate-600 group"
                                            >
                                                <div className="h-10 w-10 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0 transition-colors">
                                                    <Search className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-white tracking-wide">{booking.lrNumber}</span>
                                                            <span className={cn(
                                                                "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                                                                booking.status === 'DELIVERED' ? "bg-green-500/20 text-green-400" :
                                                                    booking.status === 'CANCELLED' ? "bg-red-500/20 text-red-400" :
                                                                        "bg-blue-500/20 text-blue-400"
                                                            )}>{booking.status}</span>
                                                            {booking.paymentType && (
                                                                <span className={cn(
                                                                    "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                                                                    booking.paymentType === 'Paid' ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400"
                                                                )}>{booking.paymentType}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-300">₹{booking.costs?.total || 0}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                            <span className="font-medium truncate max-w-[100px] text-slate-300">{booking.sender.name}</span>
                                                            <span className="text-slate-600">→</span>
                                                            <span className="font-medium truncate max-w-[100px] text-slate-300">{booking.receiver.name}</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {new Date(booking.date || (booking as any).createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-300 mb-1">No parcels found</p>
                                        <p className="text-xs text-slate-500">Try searching with a different LR number</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Mobile full-width search bar — expands below header */}
            {mobileSearchOpen && (
                <div className="sm:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-slate-800 px-4 py-3 z-50 shadow-xl" ref={searchRef}>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.length >= 3 && setShowSearchResults(true)}
                            placeholder="Search LR number..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-slate-500"
                        />
                        {searchQuery.length > 0 && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Mobile Search Results */}
                    {showSearchResults && (
                        <div className="mt-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden max-h-72 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-6 text-center">
                                    <LoadingSpinner size={28} className="mx-auto" />
                                    <p className="text-xs text-slate-500 mt-3 font-bold uppercase">Searching...</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="divide-y divide-slate-700/50">
                                    {searchResults.map((booking) => (
                                        <button
                                            key={booking.id || (booking as any)._id}
                                            onClick={() => {
                                                setShowSearchResults(false);
                                                setMobileSearchOpen(false);
                                                setSelectedBookingForEdit(booking);
                                            }}
                                            className="w-full p-3 hover:bg-slate-700/50 transition-all text-left flex items-center gap-3"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-bold text-white">{booking.lrNumber}</span>
                                                    <span className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                                                        booking.status === 'DELIVERED' ? "bg-green-500/20 text-green-400" :
                                                            booking.status === 'CANCELLED' ? "bg-red-500/20 text-red-400" :
                                                                "bg-blue-500/20 text-blue-400"
                                                    )}>{booking.status}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 truncate">{booking.sender.name} → {booking.receiver.name}</p>
                                            </div>
                                            <span className="text-sm font-bold text-slate-300 shrink-0">₹{booking.costs?.total || 0}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center">
                                    <p className="text-sm font-bold text-slate-400">No parcels found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Centered LR Number Display */}
            {bookingLrNumber && bookingLrNumber !== "Loading..." && (
                <div className="hidden lg:flex flex-1 justify-center pointer-events-none">
                    <div className="bg-blue-600 shadow-xl border border-blue-500 text-white px-6 py-2 rounded-xl flex items-center gap-3 pointer-events-auto">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-100">LR No</span>
                        <div className="h-4 w-px bg-blue-400/50" />
                        <span className="text-sm font-black tracking-widest font-mono text-white">{bookingLrNumber}</span>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4">

                {/* Mobile Search Icon — always visible on small screens */}
                <button
                    className="sm:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 active:bg-slate-700 transition-all"
                    onClick={() => setMobileSearchOpen(v => !v)}
                    aria-label="Search LR"
                >
                    <Search className="w-5 h-5" />
                </button>

                {/* Branch Indicator */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700 dark:border-slate-800/60">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-slate-200">
                        {displayBranch}
                    </span>
                </div>

                <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-white">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={() => {
                            const { theme, setTheme } = useBranchStore.getState();
                            setTheme(theme === 'dark' ? 'light' : 'dark');
                        }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-all border border-transparent hover:border-slate-700"
                        title="Toggle Dark/Light Mode"
                    >
                        {useBranchStore(state => state.theme) === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* Help Button */}
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-all border border-transparent hover:border-slate-700 hidden lg:block"
                        title="Quick Help & Docs"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>


                    {currentUser?.role === 'SUPER_ADMIN' && (
                        <>
                            <button
                                onClick={() => router.push('/analytics')}
                                title="Analytics"
                                className="md:hidden p-2 ml-1 bg-slate-800/50 hover:bg-indigo-500/10 border border-slate-700 hover:border-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-xl transition-all shadow-sm flex items-center justify-center group"
                            >
                                <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/super-admin')}
                                title="User Management"
                                className="md:hidden p-2 ml-1 bg-slate-800/50 hover:bg-indigo-500/10 border border-slate-700 hover:border-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-xl transition-all shadow-sm flex items-center justify-center group"
                            >
                                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        title="Sign Out"
                        className="p-2 ml-1 bg-slate-800/50 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/20 text-slate-400 hover:text-red-500 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50 group"
                    >
                        {isLoggingOut ? (
                            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        )}
                    </button>
                </div>
            </div>
            {selectedBookingForEdit && (
                <EditBookingModal
                    booking={selectedBookingForEdit}
                    isOpen={!!selectedBookingForEdit}
                    onClose={() => setSelectedBookingForEdit(null)}
                    onSave={async (updated) => {
                        const bookingId = updated.id || (updated as any)._id;
                        const { error } = await parcelService.updateBooking(bookingId, updated);
                        if (!error) {
                            addToast('Booking updated successfully!', 'success');
                            setSelectedBookingForEdit(null);
                        } else {
                            addToast(error.message || 'Failed to update booking', 'error');
                        }
                    }}
                    availableBranches={branchObjects as any}
                />
            )}
            <HelpCenter isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </header>
    );
}
