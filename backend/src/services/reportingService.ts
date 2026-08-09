import Booking from '../models/Booking';
import Branch from '../models/Branch';
import Transaction from '../models/Transaction';
import { getISTStartOfDay, getISTEndOfDay } from '../utils/dateUtils';

export const reportingService = {
    async generateDailySummary() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const startOfYesterday = getISTStartOfDay(yesterday);
        const endOfYesterday = getISTEndOfDay(yesterday);


        const summary = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
                    status: { $ne: 'CANCELLED' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$costs.total" },
                    totalParcels: { $sum: 1 },
                    paidAmount: {
                        $sum: { $cond: [{ $eq: ["$paymentType", "Paid"] }, "$costs.total", 0] }
                    },
                    toPayAmount: {
                        $sum: { $cond: [{ $eq: ["$paymentType", "To Pay"] }, "$costs.total", 0] }
                    }
                }
            }
        ]);

        const result = summary[0] || { totalRevenue: 0, totalParcels: 0, paidAmount: 0, toPayAmount: 0 };

        console.log(`[DAILY REPORT] ${startOfYesterday.toDateString()}`);
        console.log(`- Total Parcels: ${result.totalParcels}`);
        console.log(`- Total Revenue: ₹${result.totalRevenue}`);
        console.log(`- Paid: ₹${result.paidAmount} | To Pay: ₹${result.toPayAmount}`);

        return result;
    },

    async checkDataConsistency() {
        const inconsistencies = [];

        // 1. Check for Bookings without Transactions (for Paid)
        const missingTransactions = await Booking.find({
            paymentType: 'Paid',
            status: { $ne: 'CANCELLED' }
        }).lean();

        for (const b of missingTransactions) {
            const tx = await Transaction.findOne({ referenceId: b._id });
            if (!tx) inconsistencies.push(`Booking ${b.lrNumber} (Paid) is missing a Transaction entry.`);
        }

        if (inconsistencies.length > 0) {
            console.warn('[CONSISTENCY ALERT]', inconsistencies.join(' | '));
        }

        return inconsistencies;
    }
};
