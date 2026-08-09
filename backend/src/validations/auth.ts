import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        username: z.string().min(2, "Username or email is required"),
        password: z.string().min(4, "Password must be at least 4 characters"),
        branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID").optional(),
        otp: z.string().length(6, "OTP must be exactly 6 digits").optional(),
    })
});

export const refreshSchema = z.object({
    cookies: z.object({
        jwt: z.string().min(1, "Refresh token is missing")
    })
});

export const verify2FASchema = z.object({
    body: z.object({
        token: z.string().length(6, "2FA token must be 6 digits")
    })
});
