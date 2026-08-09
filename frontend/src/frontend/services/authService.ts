import { signIn, signOut, getSession } from 'next-auth/react';
import { ServiceResponse, parseError, fetchApi } from './base';
import { User } from '@/shared/types';

export const authService = {
    async login(email: string, password: string, otp?: string): Promise<ServiceResponse<any>> {
        try {
            const result = await signIn('credentials', {
                email,
                password,
                otp: otp || '',
                redirect: false
            });

            if (result?.error) {
                return { data: null, error: new Error(result.error) };
            }

            return { data: { success: true }, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(parseError(error)) };
        }
    },

    async get2FAStatus(): Promise<ServiceResponse<{ isTwoFactorEnabled: boolean }>> {
        try {
            const res = await fetchApi('/2fa/status');
            const data = await res.json();
            return { data: data.data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(parseError(error)) };
        }
    },

    async generate2FA(): Promise<ServiceResponse<{ secret: string; qrCodeUrl: string }>> {
        try {
            const res = await fetchApi('/2fa/generate', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) return { data: null, error: new Error(data.message || 'Failed to generate 2FA') };
            return { data: data.data, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(parseError(error)) };
        }
    },

    async verify2FA(token: string): Promise<ServiceResponse<null>> {
        try {
            const res = await fetchApi('/2fa/verify', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            const data = await res.json();
            if (!res.ok) return { data: null, error: new Error(data.message || 'Invalid code') };
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(parseError(error)) };
        }
    },

    async disable2FA(): Promise<ServiceResponse<null>> {
        try {
            const res = await fetchApi('/2fa/disable', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) return { data: null, error: new Error(data.message || 'Failed to disable 2FA') };
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error: new Error(parseError(error)) };
        }
    },

    async logout(): Promise<ServiceResponse<any>> {
        await signOut({ redirect: false });
        return { data: null, error: null };
    },

    async getSession() {
        const session = await getSession();
        return {
            data: { session },
            error: null
        };
    },

    async getCurrentUser(): Promise<User | null> {
        const session = await getSession();
        if (session?.user) {
            return session.user as User;
        }
        return null;
    }
};
