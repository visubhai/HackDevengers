'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CircleCheck, CircleAlert, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 5000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full sm:w-auto print:hidden">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            flex items-start gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 fade-in duration-500
                            ${toast.type === 'success' ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200' : ''}
                            ${toast.type === 'error' ? 'bg-rose-50/90 text-rose-900 border-rose-200' : ''}
                            ${toast.type === 'info' ? 'bg-blue-50/90 text-blue-900 border-blue-200' : ''}
                        `}
                    >
                        <div className="mt-0.5">
                            {toast.type === 'success' && <CircleCheck className="w-5 h-5 text-emerald-600" />}
                            {toast.type === 'error' && <CircleAlert className="w-5 h-5 text-rose-600" />}
                            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 mt-0.5 p-1 rounded-full hover:bg-black/5 transition-colors"
                        >
                            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
