import { Skeleton } from "./ui/Skeleton";

export function DashboardHeaderSkeleton() {
    return (
        <div className="bg-slate-900 border-b border-slate-800 py-4 mb-6 shadow-md -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-48 bg-slate-800" />
                <Skeleton className="h-8 w-32 bg-slate-800" />
            </div>
        </div>
    );
}

export function FormCardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-9 w-full" />
                </div>
            </div>
        </div>
    );
}

export function ParcelListSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm h-full backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-9 w-16" />
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                ))}
                <Skeleton className="h-9 w-full mt-4" />
            </div>
        </div>
    );
}

export function PaymentBoxSkeleton() {
    return (
        <div className="bg-slate-950 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-800 dark:border-slate-800/60 shadow-xl h-full backdrop-blur-sm">
            <div className="space-y-4">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-slate-800" />
                    <Skeleton className="h-4 w-16 bg-slate-800" />
                </div>
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-slate-800" />
                    <Skeleton className="h-4 w-16 bg-slate-800" />
                </div>
                <div className="h-px bg-slate-800 my-2" />
                <div className="flex justify-between">
                    <Skeleton className="h-6 w-32 bg-slate-800" />
                    <Skeleton className="h-6 w-24 bg-slate-800" />
                </div>
                <Skeleton className="h-12 w-full bg-blue-600/20 mt-6" />
            </div>
        </div>
    );
}
