import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Response } from 'express';

export const exportService = {
    async generatePDF(res: Response, data: any[], metadata: { branchName: string, reportType: string, dateRange: string, generatedBy: string, branding: { name: string, tagline?: string } }) {
        const doc = new jsPDF({ orientation: 'landscape' });
        const timestamp = new Date().toLocaleString();
        const companyName = metadata.branding?.name || 'SAVAN TRAVELS';

        // Filter out cancelled bookings for the report
        const filteredData = data.filter(r => r.status !== 'CANCELLED');

        // Sort data by LR number
        const sortedData = [...filteredData].sort((a: any, b: any) => {
            const numA = parseInt(a.lrNumber);
            const numB = parseInt(b.lrNumber);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return (a.lrNumber || "").localeCompare(b.lrNumber || "");
        });

        // Calculate Totals
        let totalAmount = 0;
        let totalParcels = 0;
        let onlinePaid = 0;
        let onlineToPay = 0;

        sortedData.forEach(row => {
            totalAmount += (row.costs?.total || 0);
            const rowQty = row.parcels?.reduce((pSum: number, p: any) => pSum + Number(p.quantity || 0), 0) || 0;
            totalParcels += rowQty;

            if (row.paymentType === 'Paid') {
                onlinePaid += (row.costs?.total || 0);
            } else if (row.paymentType === 'To Pay') {
                onlineToPay += (row.costs?.total || 0);
            }
        });

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, 14, 15);
        
        doc.setFontSize(10);
        doc.text(`Daily Manifest Report | ${metadata.branchName}`, 14, 22);

        doc.setFontSize(14);
        doc.text(`Manifest Date: ${metadata.dateRange}`, 14, 32);

        // Main Table
        const tableColumn = ["SR", "LR NO.", "DATE/TIME", "DESTINATION", "SENDER", "RECEIVER", "MOBILE", "ART", "DESCRIPTION", "PAY", "RATE"];
        const tableRows: any[] = [];

        sortedData.forEach((row, index) => {
            const dateObj = new Date(row.date || row.createdAt);
            const dateTimeStr = `${dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}\n${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            const totalQty = row.parcels?.reduce((sum: number, p: any) => sum + Number(p.quantity || 0), 0) || 0;
            const artType = row.parcels?.[0]?.itemType || "-";
            
            const destinationName = (() => {
                const name = (row.toBranch as any)?.name || row.toBranch || "";
                const match = name.match(/\(([^)]+)\)/);
                return (match ? match[1] : name).toUpperCase();
            })();

            tableRows.push([
                index + 1,
                row.lrNumber,
                dateTimeStr,
                destinationName,
                (row.sender?.name || '-').toUpperCase(),
                (row.receiver?.name || '-').toUpperCase(),
                row.receiver?.mobile || '-',
                totalQty,
                artType.toUpperCase(),
                row.paymentType === 'Paid' ? 'PAID' : 'TO PAY',
                row.costs?.total || 0
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 38,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10 }, // SR
                1: { cellWidth: 25, fontStyle: 'bold' }, // LR
                2: { cellWidth: 20 }, // Date
                3: { cellWidth: 35 }, // Dest
                10: { cellWidth: 20, fontStyle: 'bold', halign: 'right' } // Rate
            },
            foot: [
                [{ content: 'Total Parcels:', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalParcels.toString(), colSpan: 4, styles: { fontStyle: 'bold', fontSize: 10 } }]
            ],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
        });

        // Summary Table
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        
        autoTable(doc, {
            head: [['TYPE', 'PAID', 'TO PAY', 'PARCELS', 'TOTAL']],
            body: [[
                'Grand Total',
                `Rs. ${onlinePaid.toLocaleString()}`,
                `Rs. ${onlineToPay.toLocaleString()}`,
                totalParcels.toString(),
                `Rs. ${totalAmount.toLocaleString()}`
            ]],
            startY: finalY,
            theme: 'grid',
            styles: { fontSize: 10, fontStyle: 'bold' },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            margin: { left: 140 } // Align to the right
        });

        const pdfBuffer = doc.output('arraybuffer');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${Date.now()}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    },

    async generateExcel(res: Response, data: any[], metadata: { branchName: string, reportType: string, dateRange: string, generatedBy: string, branding: { name: string, tagline?: string } }) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');
        const companyName = metadata.branding?.name || 'SAVAN TRAVELS';

        // Styles
        const headerStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 14 },
            alignment: { horizontal: 'center' }
        };

        // Title & Metadata
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = `${companyName} - ${metadata.reportType}`;
        worksheet.getCell('A1').style = headerStyle;

        worksheet.addRow(['Branch:', metadata.branchName]);
        worksheet.addRow(['Date Range:', metadata.dateRange]);
        worksheet.addRow(['Generated By:', metadata.generatedBy]);
        worksheet.addRow(['Timestamp:', new Date().toLocaleString()]);
        worksheet.addRow([]); // Spacer

        // Table Header
        worksheet.addRow(["LR Number", "Sender", "Receiver", "From", "To", "Amount", "Status"]);
        worksheet.getRow(7).font = { bold: true };

        // Data
        data.forEach(item => {
            worksheet.addRow([
                item.lrNumber,
                item.sender?.name || '-',
                item.receiver?.name || '-',
                item.fromBranch?.name || item.fromBranch || '-',
                item.toBranch?.name || item.toBranch || '-',
                item.costs?.total || 0,
                item.status
            ]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    },

    async generateCSV(res: Response, data: any[], metadata: { reportType: string }) {
        let csv = 'LR Number,Sender,Receiver,From,To,Amount,Status\n';

        data.forEach(item => {
            csv += `${item.lrNumber},"${item.sender?.name || '-'}","${item.receiver?.name || '-'}","${item.fromBranch?.name || item.fromBranch || '-'}","${item.toBranch?.name || item.toBranch || '-'}",${item.costs?.total || 0},${item.status}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${metadata.reportType.replace(/\s+/g, '_')}_${Date.now()}.csv`);
        res.send(csv);
    }
};
