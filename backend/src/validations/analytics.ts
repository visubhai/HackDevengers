import { z } from 'zod';

export const analyticsQuerySchema = z.object({
    query: z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
        granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
        branchIds: z.string().optional(),
    })
});
