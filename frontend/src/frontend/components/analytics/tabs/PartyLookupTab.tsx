"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Search, Users, Package, IndianRupee, Wallet, MapPin, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import KPICard from "../KPICard";
import { advancedAnalyticsService, PartySearchResult, PartyHistoryData } from "@/frontend/services/advancedAnalyticsService";
import { useDebounce } from "@/frontend/hooks/useDebounce";
import { cn } from "@/frontend/lib/utils";

export default function PartyLookupTab() {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 400);
    const [suggestions, setSuggestions] = useState<PartySearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [history, setHistory] = useState<PartyHistoryData | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

    useEffect(() => {
        if (debouncedQuery.trim().length < 2) {
            setSuggestions([]);
            return;
        }
        setSearching(true);
        advancedAnalyticsService.searchParties(debouncedQuery.trim()).then(({ data, error: err }) => {
            setSearching(false);
            if (err) { setError(err.message); return; }
            setSuggestions(data || []);
        });
    }, [debouncedQuery]);

    const loadHistory = useCallback((name: string) => {
        setSelectedName(name);
        setLoadingHistory(true);
        setError(null);
        setExpandedBooking(null);
        advancedAnalyticsService.getPartyHistory(name).then(({ data, error: err }) => {
            setLoadingHistory(false);
            if (err) { setError(err.message); return; }
            setHistory(data);
        });
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-premium-card p-5 rounded-2xl border border-premium-border shadow-sm">
                <h3 className="text-[10px] font-black text-muted-foreground tracking-[0.15em] uppercase mb-3">Search Party by Sender or Receiver Name</h3>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Type a sender or receiver name (min 2 characters)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-background border border-premium-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 text-foreground"
                    />
                </div>

                {searching && <p className="text-xs text-muted-foreground mt-3">Searching...</p>}

                {!searching && suggestions.length > 0 && (
                    <div className="mt-3 divide-y divide-premium-border border border-premium-border rounded-lg overflow-hidden max-w-2xl">
                        {suggestions.map((p) => (
                            <button
                                key={p.name}
                                onClick={() => loadHistory(p.name)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                            >
                                <div>
                                    <p className="font-bold text-foreground text-sm">{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{p.mobile}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-foreground">{p.bookingCount} bookings</p>
                                    <p className="text-[10px] text-muted-foreground">₹{p.totalRevenue.toLocaleString('en-IN')}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {!searching && debouncedQuery.trim().length >= 2 && suggestions.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-3">No parties found matching "{debouncedQuery}"</p>
                )}
            </div>

            {error && <div className="bg-red-50 dark:bg-red-950/20 text-red-600 p-4 rounded-xl border border-red-200 dark:border-red-800 text-sm">{error}</div>}

            {loadingHistory && (
                <div className="flex flex-col items-center justify-center min-h-[20vh] text-muted-foreground">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-bold tracking-widest uppercase text-xs">Loading history for {selectedName}...</p>
                </div>
            )}

            {!loadingHistory && history?.stats && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <KPICard
                            title="Total Bookings"
                            subtitle={`${history.stats.name} • ${history.stats.asSenderCount} as sender, ${history.stats.asReceiverCount} as receiver`}
                            value={history.stats.totalBookings}
                            icon={Package}
                            color="blue"
                        />
                        <KPICard title="Total Revenue" value={history.stats.totalRevenue} prefix="₹" icon={IndianRupee} color="emerald" />
                        <KPICard title="Paid" value={history.stats.paidAmount} prefix="₹" icon={Wallet} color="emerald" />
                        <KPICard title="To Pay" value={history.stats.toPayAmount} prefix="₹" icon={Wallet} color="amber" />
                        <KPICard title="Cancelled" value={history.stats.cancelledCount} icon={Users} color="red" />
                    </div>

                    <div className="bg-premium-card p-5 rounded-2xl border border-premium-border shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <h3 className="text-[10px] font-black text-muted-foreground tracking-[0.15em] uppercase">Branches Used</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {history.stats.branchesUsed.map((b) => (
                                <span key={b} className="text-xs font-bold bg-muted/50 px-2.5 py-1 rounded-lg text-foreground">{b}</span>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3">
                            First booking: {new Date(history.stats.firstBooking).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' • '}
                            Last booking: {new Date(history.stats.lastBooking).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="bg-premium-card rounded-2xl border border-premium-border shadow-sm overflow-hidden">
                        <h3 className="text-[10px] font-black text-muted-foreground tracking-[0.15em] uppercase px-5 pt-5 pb-3">
                            Full Booking History ({history.bookings.length}) — click a row for full parcel details
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-premium-border">
                                        <th className="px-4 py-2 text-left">LR No</th>
                                        <th className="px-4 py-2 text-left">Date</th>
                                        <th className="px-4 py-2 text-left">Role</th>
                                        <th className="px-4 py-2 text-left">From → To</th>
                                        <th className="px-4 py-2 text-left">Counterparty</th>
                                        <th className="px-4 py-2 text-left">Amount</th>
                                        <th className="px-4 py-2 text-left">Payment</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.bookings.map((b) => {
                                        const isExpanded = expandedBooking === b.id;
                                        return (
                                            <Fragment key={b.id}>
                                                <tr
                                                    className={cn("border-b border-premium-border/30 hover:bg-muted/20 transition-colors cursor-pointer", isExpanded && "bg-muted/10")}
                                                    onClick={() => setExpandedBooking(isExpanded ? null : b.id)}
                                                >
                                                    <td className="px-4 py-2.5 font-mono font-bold text-foreground">{b.lrNumber}</td>
                                                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                                        {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={cn(
                                                            "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider w-fit",
                                                            b.role === 'sender' ? "bg-blue-500/20 text-blue-400" : "bg-violet-500/20 text-violet-400"
                                                        )}>
                                                            {b.role === 'sender' ? <ArrowUpFromLine className="w-2.5 h-2.5" /> : <ArrowDownToLine className="w-2.5 h-2.5" />}
                                                            {b.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-bold text-foreground">{b.fromBranch} → {b.toBranch}</td>
                                                    <td className="px-4 py-2.5">
                                                        <p className="font-bold text-foreground text-xs">{b.counterparty.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{b.counterparty.mobile}</p>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-black text-foreground">₹{b.costs.total.toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-2.5 text-xs font-bold">{b.paymentType}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={
                                                            b.status === 'DELIVERED' ? "text-[10px] font-black px-2 py-0.5 rounded uppercase bg-emerald-500/20 text-emerald-400" :
                                                            b.status === 'CANCELLED' ? "text-[10px] font-black px-2 py-0.5 rounded uppercase bg-red-500/20 text-red-400" :
                                                            "text-[10px] font-black px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-400"
                                                        }>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-muted/5 border-b border-premium-border/30 animate-in fade-in duration-200">
                                                        <td colSpan={8} className="px-6 py-5">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">Parcel Items</p>
                                                                    {b.parcels.length > 0 ? (
                                                                        <div className="space-y-1.5">
                                                                            {b.parcels.map((p, i) => (
                                                                                <div key={i} className="text-xs flex items-center justify-between gap-3 bg-muted/30 px-2 py-1.5 rounded">
                                                                                    <span className="font-bold text-foreground">{p.quantity}x {p.itemType}</span>
                                                                                    <span className="text-muted-foreground">₹{p.rate}/unit</span>
                                                                                </div>
                                                                            ))}
                                                                            {b.parcels.some(p => p.remarks) && (
                                                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                                                    {b.parcels.filter(p => p.remarks).map(p => p.remarks).join(', ')}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-muted-foreground">No parcel item data</p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">Cost Breakdown</p>
                                                                    <div className="space-y-1 text-xs">
                                                                        <div className="flex justify-between"><span className="text-muted-foreground">Freight</span><span className="font-bold text-foreground">₹{b.costs.freight.toLocaleString('en-IN')}</span></div>
                                                                        <div className="flex justify-between"><span className="text-muted-foreground">Handling</span><span className="font-bold text-foreground">₹{b.costs.handling.toLocaleString('en-IN')}</span></div>
                                                                        <div className="flex justify-between"><span className="text-muted-foreground">Hamali</span><span className="font-bold text-foreground">₹{b.costs.hamali.toLocaleString('en-IN')}</span></div>
                                                                        <div className="flex justify-between border-t border-premium-border pt-1 mt-1"><span className="text-muted-foreground font-bold">Total</span><span className="font-black text-foreground">₹{b.costs.total.toLocaleString('en-IN')}</span></div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">Status & Remarks</p>
                                                                    <div className="space-y-1.5 text-xs">
                                                                        {b.deliveredAt && (
                                                                            <p><span className="text-muted-foreground">Delivered:</span> <span className="font-bold text-foreground">{new Date(b.deliveredAt).toLocaleString('en-IN')}</span></p>
                                                                        )}
                                                                        {b.collectedBy && (
                                                                            <p><span className="text-muted-foreground">Collected by:</span> <span className="font-bold text-foreground">{b.collectedBy} ({b.collectedByMobile})</span></p>
                                                                        )}
                                                                        {b.remarks && <p><span className="text-muted-foreground">Remarks:</span> <span className="font-bold text-foreground">{b.remarks}</span></p>}
                                                                        {b.deliveredRemark && <p><span className="text-muted-foreground">Delivery note:</span> <span className="font-bold text-foreground">{b.deliveredRemark}</span></p>}
                                                                        {b.cancellationRemark && <p><span className="text-muted-foreground">Cancellation reason:</span> <span className="font-bold text-red-400">{b.cancellationRemark}</span></p>}
                                                                        {!b.collectedBy && !b.remarks && !b.deliveredRemark && !b.cancellationRemark && !b.deliveredAt && (
                                                                            <p className="text-muted-foreground">No additional notes</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
