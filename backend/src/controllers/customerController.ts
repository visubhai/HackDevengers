import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Customer from '../models/Customer';
import { catchAsync } from '../middleware/errorHandler';
import { successResponse } from '../utils/responseHandler';

// In-memory cache for ultra-fast autocomplete without hitting database indexes unnecessarily
let cachedCustomers: { name: string, mobile: string }[] = [];
let lastCacheUpdate = 0;

const getCachedCustomers = async () => {
    const now = Date.now();
    // Refresh cache every 10 minutes
    if (cachedCustomers.length === 0 || now - lastCacheUpdate > 600000) {
        const customers = await Customer.find().select('name mobile -_id').lean();
        cachedCustomers = customers as { name: string, mobile: string }[];
        lastCacheUpdate = now;
    }
    return cachedCustomers;
};

export const searchCustomers = catchAsync(async (req: AuthRequest, res: Response) => {
    const { query, type } = req.query;
    if (!query || typeof query !== 'string') {
        return successResponse(res, []);
    }

    const searchStr = query.toLowerCase().trim();
    if (searchStr.length < 2) {
        return successResponse(res, []);
    }

    const allCustomers = await getCachedCustomers();
    let matches: { name: string, mobile: string }[] = [];

    if (type === 'mobile') {
        matches = allCustomers.filter(c => c.mobile.startsWith(searchStr));
    } else if (type === 'name') {
        matches = allCustomers.filter(c => c.name && c.name.toLowerCase().includes(searchStr));
        matches.sort((a, b) => {
            const aStartsWith = a.name.toLowerCase().startsWith(searchStr) ? 1 : 0;
            const bStartsWith = b.name.toLowerCase().startsWith(searchStr) ? 1 : 0;
            if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
            return a.name.localeCompare(b.name);
        });
    } else {
        const isNumeric = /^\d+$/.test(searchStr);
        if (isNumeric) {
            matches = allCustomers.filter(c => c.mobile.startsWith(searchStr));
        } else {
            matches = allCustomers.filter(c => c.name && c.name.toLowerCase().includes(searchStr));
        }
    }

    // Deduplicate by mobile + name pair and return top 10 unique entries
    const seen = new Set<string>();
    const uniqueResults: { name: string, mobile: string }[] = [];

    for (const item of matches) {
        const key = `${item.name.trim().toLowerCase()}_${item.mobile}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push({ name: item.name, mobile: item.mobile });
            if (uniqueResults.length >= 10) break;
        }
    }

    return successResponse(res, uniqueResults);
});
