import React from 'react';
import { Booking, Branch } from "@/shared/types";

interface SystemSetting {
    key: string;
    value: any;
}

interface PrintBuiltyProps {
    booking: Booking;
    branches: any[];
    systemSettings?: SystemSetting[];
}

export const PrintBuilty = ({ booking, branches, systemSettings }: PrintBuiltyProps) => {
    const getSetting = (key: string, defaultValue: any) => {
        const found = systemSettings?.find((s: SystemSetting) => s.key === key);
        return found ? found.value : defaultValue;
    };

    const printHeader = getSetting('PRINT_HEADER', false);
    const companyName = getSetting('COMPANY_NAME', 'SAVAN TRAVELS');
    const tagline = getSetting('COMPANY_TAGLINE', 'Express Parcel Service');
    const contact = getSetting('COMPANY_CONTACT', '');


    // Unified robust helper to resolve a full branch object from any identifier (ID, Name, or thin Object)
    const resolveBranch = (val: any) => {
        if (!val) return null;
        
        // 1. Identify the search key (ID, Name, or thin object)
        const searchKey = typeof val === 'string' ? val : (val._id || val.id || val.name);
        
        // 2. Always check the master 'branches' prop first to get the complete record (with Address, Phone, State, etc.)
        const masterMatch = branches?.find(b => {
            if (!b) return false;
            const bObj = b as any;
            if (bObj._id === searchKey || bObj.id === searchKey) return true;
            
            if (typeof searchKey === 'string' && searchKey.length > 0) {
                const lowerKey = searchKey.toLowerCase();
                return bObj.name?.toLowerCase() === lowerKey || 
                       bObj.branchCode?.toLowerCase() === lowerKey;
            }
            return false;
        });

        if (masterMatch) return masterMatch;

        // 3. Fallback to the original object if it has some data (but it's likely missing Address)
        if (typeof val === 'object' && val.name) return val;

        return null;
    };

    const fromDetail = resolveBranch(booking.fromBranch);
    const toDetail = resolveBranch(booking.toBranch);

    const fName = fromDetail?.name || (typeof booking.fromBranch === 'string' && booking.fromBranch.length > 20 ? "Branch Name Not Found" : (typeof booking.fromBranch === 'object' ? (booking.fromBranch as any).name : booking.fromBranch));
    const tName = toDetail?.name || (typeof booking.toBranch === 'string' && booking.toBranch.length > 20 ? "Branch Name Not Found" : (typeof booking.toBranch === 'object' ? (booking.toBranch as any).name : booking.toBranch));
    
    // Explicitly pull address, state and phone from the resolved master branch object
    const fPhone = fromDetail?.phone || (typeof booking.fromBranch === 'object' ? (booking.fromBranch as any).phone : "");
    const fAddress = fromDetail?.address || (typeof booking.fromBranch === 'object' ? (booking.fromBranch as any).address : "");
    const fState = fromDetail?.state || (typeof booking.fromBranch === 'object' ? (booking.fromBranch as any).state : "");

    const tPhone = toDetail?.phone || (typeof booking.toBranch === 'object' ? (booking.toBranch as any).phone : "");
    const tAddress = toDetail?.address || (typeof booking.toBranch === 'object' ? (booking.toBranch as any).address : "");
    const tState = toDetail?.state || (typeof booking.toBranch === 'object' ? (booking.toBranch as any).state : "");

    return (
        <div className="hidden print:flex fixed inset-0 bg-white z-[9999] overflow-hidden text-black font-sans box-border items-start justify-start print-builty-container">
            <div
                className="relative flex flex-col"
                style={{
                    marginTop: "2.2cm",
                    fontFamily: "Arial, sans-serif",
                    width: "21cm",
                    height: "7cm",
                    padding: "0.2cm 0.5cm",
                    boxSizing: "border-box"
                }}
            >
                {/* Dynamic Header */}
                {printHeader && (
                    <div className="flex flex-col items-center mb-1">
                        <h1 className="text-[18px] font-black leading-none">{companyName}</h1>
                        <p className="text-[9px] font-bold uppercase tracking-widest">{tagline}</p>
                        {contact && <p className="text-[8px] font-medium opacity-70">{contact}</p>}
                    </div>
                )}

                {/* GLOBAL BORDER WRAPPER FOR PROFESSIONAL LOOK */}
                <div className="border-[2px] border-black border-solid w-full h-full flex flex-col bg-white overflow-hidden">

                    {/* ROW 1: HEADER (LR, DATE, PAYMENT) */}
                    <div className="flex border-b-[2px] border-black border-solid items-center h-[18%] shrink-0 px-2 bg-gray-50/50">
                        <div className="w-[35%] flex flex-col justify-center text-left">
                            <span className="text-[8px] font-black uppercase leading-tight">Booking Date</span>
                            <span className="text-[11px] font-bold leading-none mt-0.5">
                                {new Date(booking.date || (booking as any).createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                        </div>
                        <div className="w-[35%] flex flex-col justify-center items-center text-center">
                            <span className="text-[8px] font-black uppercase leading-tight">L.R. Number</span>
                            <span className="text-xl font-black tracking-widest leading-none mt-0.5">{booking.lrNumber}</span>
                        </div>
                        <div className="w-[30%] flex justify-end items-center">
                            <span className="text-[12px] font-black uppercase border-[2px] border-black border-solid px-3 py-0.5 rounded-sm tracking-widest bg-white">
                                {booking.paymentType}
                            </span>
                        </div>
                    </div>

                    {/* ROW 2: PARTIES & ROUTING */}
                    <div className="flex flex-col border-b-[2px] border-black border-solid h-[42%] shrink-0">

                        {/* TOP HALF: SENDER & RECEIVER (THIN ROW) */}
                        <div className="flex border-b-[1px] border-black border-dotted h-[35%] shrink-0 min-h-0">
                            {/* SENDER */}
                            <div className="w-[50%] px-2 flex flex-col justify-center border-r-[2px] border-black border-solid overflow-hidden bg-white">
                                <div className="flex items-start overflow-hidden">
                                    <span className="text-[8px] font-black uppercase opacity-70 shrink-0 mt-[2px] mr-1">SENDER:</span>
                                    <div className="flex items-center justify-between flex-1 overflow-hidden">
                                        <span className="text-[12px] font-black uppercase truncate leading-none">{booking.sender.name}</span>
                                        <span className="text-[14px] font-bold font-mono tracking-tight shrink-0 ml-1 italic">✆ {booking.sender.mobile}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* RECEIVER */}
                            <div className="w-[50%] px-2 flex flex-col justify-center overflow-hidden bg-white">
                                <div className="flex items-start overflow-hidden">
                                    <span className="text-[8px] font-black uppercase opacity-70 shrink-0 mt-[2px] mr-1">RECEIVER:</span>
                                    <div className="flex items-center justify-between flex-1 overflow-hidden">
                                        <span className="text-[12px] font-black uppercase truncate leading-none">{booking.receiver.name}</span>
                                        <span className="text-[14px] font-bold font-mono tracking-tight shrink-0 ml-1 italic">✆ {booking.receiver.mobile}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM HALF: FROM & TO */}
                        <div className="flex flex-1 min-h-0">
                            {/* FROM */}
                            <div className="w-[50%] p-1 px-2 flex flex-col justify-center border-r-[2px] border-black border-solid bg-white overflow-hidden">
                                <div className="flex items-start">
                                    <span className="text-[8px] font-black uppercase opacity-70 shrink-0 mt-[1px] mr-1">FROM:</span>
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <div className="flex items-center justify-between gap-1 overflow-hidden mb-1">
                                            <span className="text-[16px] font-black uppercase truncate leading-none">{fName?.replace("Branch", "").trim()}</span>
                                            {fPhone && (
                                                <span className="font-bold text-black text-[14px] whitespace-nowrap shrink-0 italic">
                                                    ✆ {fPhone}
                                                </span>
                                            )}
                                        </div>
                                        {fAddress && (
                                            <span className="text-[11px] font-black text-gray-900 line-clamp-3 leading-tight uppercase">
                                                {fAddress}{fState ? `, ${fState}` : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* TO */}
                            <div className="w-[50%] p-1 px-2 flex flex-col justify-center overflow-hidden bg-white">
                                <div className="flex items-start">
                                    <span className="text-[8px] font-black uppercase opacity-70 shrink-0 mt-[1px] mr-1">TO:</span>
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <div className="flex items-center justify-between gap-1 overflow-hidden mb-1">
                                            <span className="text-[16px] font-black uppercase truncate leading-none">{tName?.replace("Branch", "").trim()}</span>
                                            {tPhone && (
                                                <span className="font-bold text-black text-[14px] whitespace-nowrap shrink-0 italic">
                                                    ✆ {tPhone}
                                                </span>
                                            )}
                                        </div>
                                        {tAddress && (
                                            <span className="text-[11px] font-black text-gray-900 line-clamp-3 leading-tight uppercase">
                                                {tAddress}{tState ? `, ${tState}` : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ROW 3: ITEMS AND FINANCIALS */}
                    <div className="flex flex-1 min-h-0 bg-white">

                        {/* PARCELS */}
                        <div className="w-[60%] border-r-[2px] border-black border-solid flex flex-col relative overflow-hidden">
                            <div className="flex border-b-[2px] border-black border-solid text-[8px] font-black bg-gray-100">
                                <div className="w-10 text-center border-r-[1px] border-black border-solid py-0.5">QTY</div>
                                <div className="flex-1 px-2 py-0.5">DESCRIPTION (ITEM DETAILS)</div>
                            </div>
                            <div className="flex-1 overflow-hidden px-1 py-0.5">
                                {booking.parcels.slice(0, 4).map((p: any, i: number) => (
                                    <div key={i} className="flex items-center py-0.5 border-b border-black/5 last:border-0">
                                        <div className="w-10 text-center font-black pr-1 text-[18px] shrink-0">{p.quantity}</div>
                                        <div className="flex-1 px-2 flex items-baseline truncate">
                                            <span className="font-black font-mono tracking-tight uppercase text-[18px] mr-1 shrink-0">{p.itemType}</span>
                                            {p.remarks && (
                                                <span className="text-[10px] font-bold text-gray-800 italic truncate">
                                                    ({p.remarks})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {booking.remarks && (
                                <div className="text-[9px] border-t border-black border-dashed p-1 truncate flex items-center shrink-0 font-bold bg-gray-50/50">
                                    <span className="mr-1 underline">Remarks:</span> {booking.remarks}
                                </div>
                            )}
                        </div>

                        {/* FINANCIALS */}
                        <div className="w-[40%] flex flex-col text-[10px] font-bold p-1 shrink-0 bg-gray-50/30">
                            <div className="flex justify-between items-center px-1 mb-0.5">
                                <span className="opacity-70 text-[8px]">FREIGHT:</span> 
                                <span className="font-mono">{(booking.costs.freight || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center px-1 mb-0.5">
                                <span className="opacity-70 text-[8px]">HANDLING:</span> 
                                <span className="font-mono">{(booking.costs.handling || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="opacity-70 text-[8px]">HAMALI:</span> 
                                <span className="font-mono">{(booking.costs.hamali || 0).toFixed(2)}</span>
                            </div>

                            <div className="mt-auto border-t-[2px] border-black border-solid p-1.5 flex flex-col items-start bg-gray-100">
                                <span className="text-[7px] font-black uppercase mb-0.5 tracking-tighter">RATE</span>
                                <div className="flex items-baseline justify-start">
                                    <span className="text-[18px] font-black leading-none">{booking.costs.total || 0}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
