import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { Search, BookOpen, MessageSquare, ShieldCheck, Zap, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

interface HelpCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

const FAQ_ITEMS = [
    {
        category: 'Getting Started',
        icon: BookOpen,
        items: [
            { q: 'How to create a new booking?', a: 'Navigate to the main dashboard. Select the destination branch, enter sender and receiver details, add parcel items, and click "Print & Save".' },
            { q: 'What is an LR Number?', a: 'LR (Lorry Receipt) Number is a unique tracking identifier generated for every shipment.' }
        ]
    },
    {
        category: 'Operations',
        icon: Zap,
        items: [
            { q: 'How to cancel a booking?', a: 'Go to Reports -> All Bookings, find the parcel, and select "Cancel". Note: Cancellations may be restricted after 24 hours.' },
            { q: 'How to track a parcel?', a: 'Use the global search bar at the top of any page and enter the LR Number.' }
        ]
    },
    {
        category: 'Support',
        icon: MessageSquare,
        items: [
            { q: 'Contact System Admin', a: 'For technical issues, contact the Super Admin at support@logiopen.com or use the contact numbers listed in System Settings.' }
        ]
    }
];

export function HelpCenter({ isOpen, onClose }: HelpCenterProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(FAQ_ITEMS[0].category);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl bg-white dark:bg-slate-900">
                <div className="p-8 bg-slate-900 dark:bg-black text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black tracking-tight mb-2">Help Center</DialogTitle>
                        </DialogHeader>
                        <p className="text-slate-400 font-medium mb-6">Search for guides or browse popular topics</p>

                        <div className="relative max-w-xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search help articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all backdrop-blur-md"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar navigation */}
                    <div className="w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-2 overflow-y-auto hidden md:block" data-lenis-prevent>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Knowledge Base</p>
                        {FAQ_ITEMS.map((cat) => (
                            <button
                                key={cat.category}
                                onClick={() => setActiveCategory(cat.category)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all",
                                    activeCategory === cat.category
                                        ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-100 dark:border-slate-700"
                                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.category}
                            </button>
                        ))}
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900" data-lenis-prevent>
                        <div className="max-w-xl mx-auto space-y-8">
                            {FAQ_ITEMS.filter(c => searchQuery === '' ? c.category === activeCategory : true).map((cat) => (
                                <div key={cat.category} className="space-y-4">
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <cat.icon className="w-3.5 h-3.5" />
                                        {cat.category}
                                    </h3>
                                    <div className="space-y-4">
                                        {cat.items.filter(i =>
                                            i.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            i.a.toLowerCase().includes(searchQuery.toLowerCase())
                                        ).map((item, idx) => (
                                            <div key={idx} className="group p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all">
                                                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                                                    {item.q}
                                                </h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                    {item.a}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-black/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Verified Documentation v1.2
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-slate-900 dark:bg-white dark:text-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                        Got it, Thanks
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
