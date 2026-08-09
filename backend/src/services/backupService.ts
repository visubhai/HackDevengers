import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import Branch from '../models/Branch';
import Booking from '../models/Booking';
import Transaction from '../models/Transaction';
import AuditLog from '../models/AuditLog';

export const runDatabaseBackup = async () => {
    try {
        console.log('[BACKUP] Starting automated daily backup...');
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `savan-backup-${dateStr}.xlsx`;
        const filePath = path.join(backupDir, fileName);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'System Cron';
        workbook.created = new Date();

        // Sheet 1: Branches
        const branches = await Branch.find().lean();
        const branchSheet = workbook.addWorksheet('Branches');
        if (branches.length > 0) {
            branchSheet.columns = [
                { header: 'ID', key: '_id', width: 25 },
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Code', key: 'branchCode', width: 15 },
                { header: 'State', key: 'state', width: 20 },
                { header: 'Contact', key: 'contactNumber', width: 15 },
                { header: 'Active', key: 'isActive', width: 10 },
            ];
            branchSheet.addRows(branches.map(b => ({ ...b, _id: b._id?.toString() })));
            branchSheet.getRow(1).font = { bold: true };
        }

        // Sheet 2: Recent Bookings (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const bookings = await Booking.find({ createdAt: { $gte: thirtyDaysAgo } })
            .populate('fromBranch', 'name')
            .populate('toBranch', 'name')
            .lean();

        const bookingSheet = workbook.addWorksheet('Bookings (Last 30 Days)');
        if (bookings.length > 0) {
            bookingSheet.columns = [
                { header: 'LR No.', key: 'lrNumber', width: 15 },
                { header: 'Date', key: 'createdAt', width: 20 },
                { header: 'From', key: 'fromBranchName', width: 20 },
                { header: 'To', key: 'toBranchName', width: 20 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Payment', key: 'paymentType', width: 10 },
                { header: 'Total Rs', key: 'total', width: 10 },
            ];
            const bookingRows = bookings.map((b: any) => ({
                lrNumber: b.lrNumber,
                createdAt: b.createdAt?.toISOString(),
                fromBranchName: b.fromBranch?.name || b.fromBranch?.toString(),
                toBranchName: b.toBranch?.name || b.toBranch?.toString(),
                status: b.status,
                paymentType: b.paymentType,
                total: b.costs?.total || 0,
            }));
            bookingSheet.addRows(bookingRows);
            bookingSheet.getRow(1).font = { bold: true };
        }

        await workbook.xlsx.writeFile(filePath);
        console.log(`[BACKUP] Backup successfully saved to ${filePath}`);

        // Cleanup old backups (keep last 7 days)
        cleanupOldBackups(backupDir, 7);
    } catch (error) {
        console.error('[BACKUP ERROR] Failed to run automated backup:', error);
    }
};

const cleanupOldBackups = (dir: string, daysToKeep: number) => {
    fs.readdir(dir, (err, files) => {
        if (err) return;

        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;

        files.forEach(file => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;

                // If file is older than daysToKeep, delete it
                if (now - stats.mtime.getTime() > daysToKeep * msPerDay) {
                    fs.unlink(filePath, err => {
                        if (!err) console.log(`[BACKUP] Deleted old backup: ${file}`);
                    });
                }
            });
        });
    });
};
