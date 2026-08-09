import { Booking } from "@/shared/types";

interface PrintReportTableProps {
    data: Booking[];
    dateRange?: string; // e.g. "27-01-2026 - 27-01-2026"
}

export default function SafePrintReportTable(props: any) {
    const rawData = props?.data;
    const dateRange = props?.dateRange;

    // Manual filter to avoid any .filter issues
    const data: any[] = [];
    if (Array.isArray(rawData)) {
        for (let i = 0; i < rawData.length; i++) {
            const r = rawData[i];
            if (r && r.status !== 'CANCELLED') {
                data.push(r);
            }
        }
    }









    // Calculate Summary Stats
    const totalAmount = data.reduce((sum, row) => sum + (row.costs?.total || 0), 0);
    const grandTotalParcels = data.reduce((sum: number, row: any) => {
        const rowQty = row.parcels?.reduce((pSum: number, p: any) => pSum + Number(p.quantity || 0), 0) || 0;
        return sum + rowQty;
    }, 0);


    // Calculate "Online" vs "Manual" using manual loops for safety
    let onlinePaid = 0;
    let onlineToPay = 0;
    
    for (let i = 0; i < data.length; i++) {
        const r = data[i];
        if (r.paymentType === 'Paid') {
            onlinePaid += (r.costs?.total || 0);
        } else if (r.paymentType === 'To Pay') {
            onlineToPay += (r.costs?.total || 0);
        }
    }

    const onlineTotal = onlinePaid + onlineToPay;

    // Sort data by LR number (numerical sorting)
    const sortedData = [...data].sort((a: any, b: any) => {
        const numA = parseInt(a.lrNumber);
        const numB = parseInt(b.lrNumber);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return (a.lrNumber || "").localeCompare(b.lrNumber || "");
    });

    // For numbering
    let globalIndex = 0;

    return (
        <div className="w-full text-black font-sans leading-tight tracking-tight print:[zoom:0.38] print:mt-[2.2cm] px-2">
            {/* Report Header Date Line */}
            <div className="mb-0.5 font-black text-4xl border-b-8 border-black pb-0.5 uppercase">
                Manifest Date: {dateRange || new Date().toLocaleDateString()}
            </div>

            <table className="w-full border-collapse border-2 border-black table-fixed">
                <thead>
                    <tr className="bg-gray-200 font-black">
                        <th className="border-2 border-black px-0.5 py-0 text-center w-[40px] text-[24px] uppercase">SR.</th>
                        <th className="border-2 border-black px-0.5 py-0 text-left w-[170px] text-[24px] uppercase">LR NO.</th>
                        <th className="border-2 border-black px-0.5 py-0 text-center w-[100px] text-[24px] uppercase">DATE / TIME</th>
                        <th className="border-2 border-black px-0.5 py-0 text-left w-[190px] text-[24px] uppercase">DESTINATION</th>
                        <th className="border-2 border-black px-0.5 py-0 text-left w-[210px] text-[24px] uppercase">SENDER</th>
                        <th className="border-2 border-black px-0.5 py-0 text-left w-[210px] text-[24px] uppercase">RECEIVER</th>
                        <th className="border-2 border-black px-0.5 py-0 text-left w-[180px] text-[24px] uppercase">MOBILE</th>
                        <th className="border-2 border-black px-0.5 py-0 text-center w-[70px] text-[24px] uppercase">ART.</th>
                        <th className="border-2 border-black px-0.5 py-0 text-left w-[200px] text-[24px] uppercase">ITEM DESCRIPTION</th>
                        <th className="border-2 border-black px-0.5 py-0 text-center w-[110px] text-[24px] uppercase">PAY</th>
                        <th className="border-2 border-black px-0.5 py-0 text-left w-[160px] text-[24px] uppercase">RATE</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row: any) => {
                        globalIndex++;
                        const currentIndex = globalIndex;
                        
                        const totalQty = row.parcels?.reduce((sum: number, p: any) => sum + Number(p.quantity || 0), 0) || 0;
                        const artType = row.parcels?.[0]?.itemType || "-";

                        const destinationName = (() => {
                            const name = (row.toBranch as any)?.name || row.toBranch || "";
                            const match = name.match(/\(([^)]+)\)/);
                            return (match ? match[1] : name).toUpperCase();
                        })();

                        const isLongDestination = destinationName.length > 14;
                        const isLongSender = (row.sender.name || "").length > 14;
                        const isLongReceiver = (row.receiver.name || "").length > 14;
                        const isLongItem = artType.length > 14;
                        const isLongRow = isLongDestination || isLongSender || isLongReceiver || isLongItem;
                        const cellPadding = isLongRow ? "py-3" : "py-0.5";

                        const displayDateObj = new Date(
                            (row.status === 'DELIVERED' && row.deliveredAt)
                                ? row.deliveredAt
                                : (row.date || row.createdAt)
                        );

                        return (
                            <tr key={row.id} className={`border-b-2 border-black ${isLongRow ? 'leading-none' : 'leading-tight'}`}>
                                <td className={`border-2 border-black px-0.5 py-0 text-center font-black text-[30px]`}>{currentIndex}</td>
                                <td className={`border-2 border-black px-0.5 py-0 whitespace-nowrap font-black text-[42px] tracking-tighter`}>{row.lrNumber}</td>
                                <td className={`border-2 border-black px-0 py-0 text-center`}>
                                    <div className="flex flex-col items-center justify-center font-black leading-none">
                                        <div className="text-[26px]">{displayDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</div>
                                        <div className="text-[20px] opacity-70">{displayDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                </td>
                                <td className={`border-2 border-black px-0.5 py-0`}>
                                    <div className={`font-black uppercase text-[32px] leading-[0.9] ${isLongDestination ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>
                                        {destinationName}
                                    </div>
                                </td>
                                <td className={`border-2 border-black px-0.5 py-0`}>
                                    <div className={`text-[29px] uppercase font-black tracking-tighter leading-[0.9] ${isLongSender ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>
                                        {row.sender.name}
                                    </div>
                                </td>
                                <td className={`border-2 border-black px-0.5 py-0 uppercase font-black tracking-tighter leading-[0.9] ${isLongReceiver ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>
                                    <div className="text-[29px]">{row.receiver.name}</div>
                                </td>
                                <td className={`border-2 border-black px-0.5 py-0 whitespace-nowrap font-black text-[30px]`}>{row.receiver.mobile}</td>
                                <td className={`border-2 border-black px-0 py-0 text-center font-black text-[52px] leading-none`}>{totalQty}</td>
                                <td className={`border-2 border-black px-0.5 py-0 uppercase text-[26px] font-black tracking-tighter leading-[0.9] ${isLongItem ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>
                                    {artType}
                                </td>
                                <td className={`border-2 border-black px-0.5 py-0 text-center font-black text-[30px]`}>
                                    {row.paymentType === 'Paid' ? 'PAID' : 'TO PAY'}
                                </td>
                                <td className={`border-2 border-black px-0.5 py-0 font-black text-left whitespace-nowrap text-[48px] leading-none`}>{row.costs?.total || 0}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                     <tr className="bg-gray-200 font-black">
                        <td colSpan={7} className="border-2 border-black px-2 py-1 text-right uppercase text-[30px]">Total Parcels :</td>
                        <td colSpan={4} className="border-2 border-black px-1 py-1 text-left text-[54px] leading-none whitespace-nowrap pr-2">{grandTotalParcels}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Summary Table */}
             <div className="w-full max-w-[1000px] mt-4">
                 <div className="flex gap-4 items-start">
                    <table className="w-full border-collapse border-4 border-black text-[24px] font-black leading-tight tracking-tight">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border-2 border-black px-2 py-1 text-left uppercase">TYPE</th>
                                <th className="border-2 border-black px-2 py-1 text-right uppercase">PAID</th>
                                <th className="border-2 border-black px-2 py-1 text-right uppercase">TO PAY</th>
                                <th className="border-2 border-black px-2 py-1 text-right uppercase">PARCELS</th>
                                <th className="border-2 border-black px-2 py-1 text-right uppercase">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-gray-200 font-black">
                                <td className="border-2 border-black px-2 py-4 text-[32px] uppercase whitespace-nowrap">Grand Total</td>
                                <td className="border-2 border-black px-2 py-4 text-right text-[32px] whitespace-nowrap">₹{onlinePaid.toLocaleString()}</td>
                                <td className="border-2 border-black px-2 py-4 text-right text-[32px] whitespace-nowrap">₹{onlineToPay.toLocaleString()}</td>
                                <td className="border-2 border-black px-2 py-4 text-right text-[32px] whitespace-nowrap">{grandTotalParcels}</td>
                                <td className="border-2 border-black px-2 py-4 text-right text-[32px] whitespace-nowrap">₹{totalAmount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    
                 </div>
            </div>
        </div>
    );
}


