import { z } from 'zod';

export const createBranchPermissionsSchema = z.object({
    body: z.object({
        branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID"),
        allowedReports: z.array(z.string()).min(1, "At least one report must be allowed"),
    })
});

export const updateBranchPermissionsSchema = z.object({
    params: z.object({
        branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID"),
    }),
    body: z.object({
        allowedReports: z.array(z.string()),
    })
});

export const getBranchPermissionsSchema = z.object({
    params: z.object({
        branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID"),
    })
});

export const getAuditLogsSchema = z.object({
    query: z.object({
        limit: z.string().optional(),
        page: z.string().optional(),
        entityType: z.string().optional(),
        action: z.string().optional(),
        search: z.string().optional(),
    }).optional()
});
