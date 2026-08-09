import { Booking, Branch } from "@/shared/types";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { fetchApi, parseError } from "@/frontend/services/base";
import { useState } from "react";
import { useToast } from "@/frontend/components/ui/toast";
import { FilterState } from "@/frontend/hooks/useReports";

interface ExportButtonsProps {
    data: Booking[];
    filters: FilterState;
    onPrint?: () => void;
    isPreparingPrint?: boolean;
}

export function ExportButtons({ data, filters, onPrint, isPreparingPrint }: ExportButtonsProps) {
    const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);
    const { addToast } = useToast();

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
            return;
        }
        document.body.classList.add('print-report-only');

        
        // Use a timeout to ensure the print dialog has time to open and capture the DOM
        setTimeout(() => {
            window.print();
            
            // Clean up the class after the print dialog is closed or after a short delay
            const cleanup = () => {
                document.body.classList.remove('print-report-only');
                window.removeEventListener('afterprint', cleanup);
            };
            
            window.addEventListener('afterprint', cleanup);
            
            // Fallback cleanup in case afterprint doesn't fire
            setTimeout(cleanup, 2000);
        }, 100);
    };

    const triggerDownload = async (type: 'pdf' | 'excel' | 'csv') => {
        try {
            setExporting(type);

            // Build query params from filters
            const params = new URLSearchParams();
            params.append('export', type);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.fromBranch !== 'All') params.append('fromBranch', filters.fromBranch);
            if (filters.toBranch !== 'All') params.append('toBranch', filters.toBranch);
            if (filters.status !== 'All') params.append('status', filters.status);

            // For now default to BOOKING_REPORT, but can be dynamic later
            params.append('reportType', 'BOOKING_REPORT');

            const response = await fetchApi(`/bookings?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = parseError(errorData);
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const extension = type === 'pdf' ? 'pdf' : type === 'excel' ? 'xlsx' : 'csv';
            a.download = `parcel-report-${new Date().getTime()}.${extension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error: any) {
            console.error(`${type.toUpperCase()} Export Error:`, error);
            addToast(`Failed to export ${type.toUpperCase()}: ${error.message}`, "error");
        } finally {
            setExporting(null);
        }
    };

    const handleExportPDF = () => triggerDownload('pdf');
    const handleExportExcel = () => triggerDownload('excel');
    const handleExportCSV = () => triggerDownload('csv');

    return (
        <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 lg:gap-3 w-full lg:w-auto">
            <button
                onClick={handlePrint}
                disabled={isPreparingPrint}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
                {isPreparingPrint ? <LoadingSpinner size={16} /> : <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />} 
                <span>Print</span>
            </button>

            <button
                disabled={exporting !== null}
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
                {exporting === 'csv' ? <LoadingSpinner size={16} /> : <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                <span>CSV</span>
            </button>
            <button
                disabled={exporting !== null}
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
                {exporting === 'excel' ? <LoadingSpinner size={16} /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                <span>Excel</span>
            </button>
            <button
                disabled={exporting !== null}
                onClick={handleExportPDF}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
                {exporting === 'pdf' ? <LoadingSpinner size={16} /> : <Download className="w-4 h-4 text-white dark:text-slate-900" />}
                <span>PDF</span>
            </button>
        </div>
    );
}
