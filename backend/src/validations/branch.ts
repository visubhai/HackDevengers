import { z } from 'zod';

export const createBranchSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        branchCode: z.string().min(2, "Branch code must be at least 2 characters"),
        state: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        username: z.string().optional(),
        isActive: z.boolean().optional(),
        whatsappNotificationsEnabled: z.boolean().optional(),
        isSuperAdmin: z.boolean().optional(),
        allowedDestinations: z.array(z.string()).optional(),
        allowedPaymentTypes: z.array(z.enum(['Paid', 'To Pay'])).min(1, "At least one payment type must be allowed").optional(),
    })
});

export const updateBranchSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID"),
    }),
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        branchCode: z.string().min(2, "Branch code must be at least 2 characters").optional(),
        state: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        username: z.string().min(2, "Username must be at least 2 characters").optional(),
        password: z.string().min(4, "Password must be at least 4 characters").optional(),
        isActive: z.boolean().optional(),
        whatsappNotificationsEnabled: z.boolean().optional(),
        isSuperAdmin: z.boolean().optional(),
        allowedDestinations: z.array(z.string()).optional(),
        allowedPaymentTypes: z.array(z.enum(['Paid', 'To Pay'])).min(1, "At least one payment type must be allowed").optional(),
    }).strict()
});

export const getBranchesSchema = z.object({
    query: z.object({
        scope: z.string().optional(),
        fromBranchId: z.string().optional(),
    })
});
