import { useState, useEffect } from "react";
import { useBranches } from "@/frontend/hooks/useBranches";
import { adminService } from "@/super-admin/services/adminService";
import { Activity, Landmark, Users, TrendingUp, Package, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useSWR from 'swr';

export function AdminOverview() {
    const { branchObjects } = useBranches();
    const [stats, setStats] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        activeBranches: 0,
        totalUsers: 0, // dynamic later if user count becomes available
    });
    const [latestLRs, setLatestLRs] = useState<Record<string, string>>({});
    const [branchData, setBranchData] = useState<any[]>([]);

    const { data: serverData, error: swrError, isLoading } = useSWR(
        'global-stats',
        async () => {
            const { data, error } = await adminService.getDashboardStats();
            if (error) throw error;
            return data;
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 seconds
            keepPreviousData: true
        }
    );

    useEffect(() => {
        if (serverData) {
            setStats(serverData.stats);
            setLatestLRs(serverData.latestLRs);

            // Keep only top 5 branches for chart
            const chartData = (serverData.branchData || []).slice(0, 5);
            setBranchData(chartData.length > 0 ? chartData : branchObjects.map((b: any) => ({ name: b.name, bookings: 0 })));
        }
    }, [serverData, branchObjects]);

    const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

    return (
        <div className="space-y-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Global Bookings"
                    value={stats.totalBookings.toLocaleString()}
                    trend="Real-Time"
                    icon={<Package className="text-blue-500" />}
                    color="bg-blue-500/10"
                />
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString()}`}
                    trend="Real-Time"
                    icon={<IndianRupee className="text-emerald-500" />}
                    color="bg-emerald-500/10"
                />
                <StatCard
                    title="Active Branches"
                    value={stats.activeBranches.toString()}
                    trend="Operating"
                    icon={<Landmark className="text-indigo-500" />}
                    color="bg-indigo-500/10"
                />
                <StatCard
                    title="Staff Estimate"
                    value={stats.totalUsers.toString()}
                    trend="Approximated"
                    icon={<Users className="text-amber-500" />}
                    color="bg-amber-500/10"
                />
            </div>

            <div className="w-full">
                {/* Chart Section */}
                <div className="bg-premium-card border border-premium-border rounded-[32px] p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">Booking Distribution</h3>
                            <p className="text-muted-foreground text-sm">LR generation across different branches</p>
                        </div>
                        <Activity className="text-muted-foreground/30 w-8 h-8" />
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                />
                                <YAxis
                                    hide
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="bookings" radius={[8, 8, 8, 8]} barSize={40}>
                                    {branchData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, icon, color }: { title: string, value: string, trend: string, icon: any, color: string }) {
    return (
        <div className="bg-premium-card border border-premium-border p-6 rounded-[28px] shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group">
            <div className="flex justify-between items-center mb-4">
                <div className={`p-3 rounded-2xl ${color} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend.includes('+') ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                    {trend}
                </span>
            </div>
            <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">{title}</div>
            <div className="text-2xl font-black text-foreground tracking-tight">{value}</div>
        </div>
    );
}
