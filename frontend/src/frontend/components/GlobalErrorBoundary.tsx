'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TriangleAlert, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        // Ideally log this to Audit Logs here if possible, 
        // but triggered from client side it requires careful API handling.
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
                        <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <TriangleAlert className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
                        <p className="text-slate-500 mb-6">
                            We've encountered an unexpected error. Our team has been notified.
                        </p>

                        <div className="bg-slate-100 rounded-lg p-4 mb-6 text-left overflow-auto max-h-32">
                            <p className="text-xs font-mono text-slate-600 break-all">
                                {this.state.error?.toString()}
                            </p>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
