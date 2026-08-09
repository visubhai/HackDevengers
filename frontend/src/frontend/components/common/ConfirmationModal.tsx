import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, TriangleAlert } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDanger = false,
    isLoading = false
}: ConfirmationModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">

                <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                    isDanger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                )}>
                    <TriangleAlert className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 mb-8">{message}</p>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            "flex-1 py-2.5 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50",
                            isDanger
                                ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                        )}
                    >
                        {isLoading ? <LoadingSpinner size={16} /> : null}
                        {isLoading ? "Processing..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
