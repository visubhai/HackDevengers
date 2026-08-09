import { cn } from "@/frontend/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
    className?: string;
}

export const LoadingSpinner = ({ size = 24, className, ...props }: LoadingSpinnerProps) => {
    return (
        <div style={{ width: size, height: size }} className={cn("relative flex items-center justify-center", className)} {...props}>
            <div className="absolute inset-0 rounded-full border-[3px] border-slate-200/50"></div>
            <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-t-transparent animate-[spin_0.8s_linear_infinite] shadow-[0_0_15px_rgba(37,99,235,0.2)]"></div>
        </div>
    );
};

interface LoadingOverlayProps {
    message?: string;
    fullScreen?: boolean;
}

export const LoadingOverlay = ({ message = "Loading...", fullScreen = false }: LoadingOverlayProps) => {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center bg-white/50 backdrop-blur-md z-[9999]",
            fullScreen ? "fixed inset-0" : "absolute inset-0 rounded-xl"
        )}>
            <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                <LoadingSpinner size={48} className="text-blue-600" />
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest animate-pulse">{message}</p>
            </div>
        </div>
    );
};
