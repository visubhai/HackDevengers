import { TrendingUp, Package, Clock, IndianRupee } from "lucide-react";

export function StatsCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Package className="w-24 h-24 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <p className="text-slate-500 text-sm font-medium mb-1">Total Parcels Today</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-slate-800">142</span>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full mb-1 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" /> +12%
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <IndianRupee className="w-24 h-24 text-green-600" />
                </div>
                <div className="relative z-10">
                    <p className="text-slate-500 text-sm font-medium mb-1">Total Revenue</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-slate-800">₹ 45,290</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Clock className="w-24 h-24 text-orange-600" />
                </div>
                <div className="relative z-10">
                    <p className="text-slate-500 text-sm font-medium mb-1">Pending Collections</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-slate-800">18</span>
                        <span className="text-sm text-slate-400 mb-1">parcels</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
