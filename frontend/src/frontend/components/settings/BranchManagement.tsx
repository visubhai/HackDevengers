import { useBranches } from "@/frontend/hooks/useBranches";
import { MapPin, Building2 } from "lucide-react";

export function BranchManagement() {
    const { branches } = useBranches();

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200 mb-8">
                <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                    <Building2 className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Branch Management</h2>
                    <p className="text-slate-500">View operating branches</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Branch List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 px-1">Active Branches ({branches.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {branches.map((branch) => (
                            <div key={branch} className="group relative bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/5 transition-all duration-300">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{branch}</h4>
                                            <p className="text-xs text-slate-400 font-medium">Active Hub</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
