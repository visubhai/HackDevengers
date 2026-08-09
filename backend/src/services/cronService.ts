import cron from 'node-cron';
import { runDatabaseBackup } from './backupService';
import { reportingService } from './reportingService';

export const initCronJobs = () => {
    // Automated Daily Database Backup at 02:00 AM IST
    cron.schedule('0 2 * * *', async () => {
        await runDatabaseBackup();
    }, {
        timezone: "Asia/Kolkata"
    });

    // Requirement: Automated Daily Summary Report at 05:00 AM IST
    cron.schedule('0 5 * * *', async () => {
        try {
            await reportingService.generateDailySummary();
        } catch (error) {
            console.error('[CRON REPORT ERROR]', error);
        }
    }, {
        timezone: "Asia/Kolkata"
    });


    console.log('✅ Background Schedulers Initialized');
};
