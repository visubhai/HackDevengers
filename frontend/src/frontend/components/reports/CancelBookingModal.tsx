import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TriangleAlert } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface CancelBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (remark: string) => Promise<void>;
    lrNumber?: string;
}

export function CancelBookingModal({ isOpen, onClose, onConfirm, lrNumber }: CancelBookingModalProps) {
    const [remark, setRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!remark.trim()) {
            setError('Please provide a reason for cancelling this booking.');
            return;
        }

        if (remark.trim().length < 5) {
            setError('Please provide a more detailed reason (minimum 5 characters).');
            return;
        }

        setError('');
        setIsSubmitting(true);
        try {
            await onConfirm(remark.trim());
            setRemark(''); // Reset on success
            onClose();     // Close only on success
        } catch (err: any) {
            setError(err.message || 'Failed to cancel booking.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
                    <div className="flex items-center gap-2">
                        <TriangleAlert className="w-5 h-5 text-red-600" />
                        <h2 className="text-lg font-bold text-red-900">Cancel Booking {lrNumber ? `#${lrNumber}` : ''}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-100 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-sm text-slate-600 mb-4">
                        You are about to cancel this booking. This action will update the status and notify the relevant parties.
                    </p>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                            Cancellation Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={remark}
                            onChange={(e) => {
                                setRemark(e.target.value);
                                if (error) setError('');
                            }}
                            disabled={isSubmitting}
                            placeholder="Please explain why this booking is being cancelled..."
                            className="w-full text-sm rounded-xl border-slate-200 bg-slate-50 border p-3 min-h-[100px] focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none disabled:opacity-50 disabled:bg-slate-100"
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-500 text-xs mt-1.5 font-medium animate-in fade-in slide-in-from-top-1">
                                {error}
                            </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1.5 text-right">
                            {remark.length}/250
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                            Keep Booking
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow shadow-red-600/20 transition-all flex items-center justify-center min-w-[120px] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <LoadingSpinner size={16} className="mr-2" />
                                    Cancelling...
                                </>
                            ) : (
                                'Confirm Cancel'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
