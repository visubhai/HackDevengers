import { getSession, signOut } from 'next-auth/react';

let _cachedSession: any = null;
let _sessionCachedAt = 0;
const getCachedSession = async () => {
    if (_cachedSession && Date.now() - _sessionCachedAt < 30_000) return _cachedSession;
    _cachedSession = await getSession();
    _sessionCachedAt = Date.now();
    return _cachedSession;
};
export const clearSessionCache = () => { _cachedSession = null; };

export type ServiceResponse<T> = {
    data: T | null;
    error: Error | null;
};

const getBaseUrl = () => {
    // If on server, use internal absolute URL
    if (typeof window === 'undefined') {
        const base = process.env.INTERNAL_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:3001';
        return base.endsWith('/api') ? base : `${base}/api`;
    }
    // If on client, use relative URL (proxied by Next.js) or env var
    let clientBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    // Remove trailing slash if present
    if (clientBase.endsWith('/')) clientBase = clientBase.slice(0, -1);

    return clientBase.endsWith('/api') ? clientBase : `${clientBase}/api`;
};

export const API_URL = getBaseUrl();

export const fetchApi = async (endpoint: string, options: RequestInit = {}, retried = false): Promise<Response> => {
    const session = await getCachedSession();
    const token = (session as any)?.accessToken;

    const url = `${API_URL}${endpoint}`;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn(`🌐 [fetchApi] Missing token for request: ${endpoint}`);
    }

    try {
        const fetchOptions: RequestInit = {
            credentials: 'include',
            cache: 'no-store', // Default behavior, can be overridden by options
            ...options,
            headers
        };

        const res = await fetch(url, fetchOptions);

        if (!res.ok) {
            console.warn(`🌐 [fetchApi] Request failed [${res.status}]: ${url}`);
        }

        // If 401 and we haven't retried yet, attempt session refresh
        if (res.status === 401 && !retried) {
            console.log(`🌐 [fetchApi] 401 detected. Attempting session refresh...`);
            _cachedSession = null; // Invalidate cache before refresh
            await fetch('/api/auth/session', { cache: 'no-store' });
            return fetchApi(endpoint, options, true);
        }

        // If 401 persists after retry — session is truly expired, force re-login
        if (res.status === 401 && retried) {
            console.warn('🌐 [fetchApi] Session expired. Redirecting to /login...');
            await signOut({ redirect: false });
            if (typeof window !== 'undefined') {
                window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
            }
        }

        return res;
    } catch (err: any) {
        console.error(`🌐 [fetchApi] CRITICAL Error at ${url}:`, err.message);
        throw err;
    }
};

export const parseError = (data: any): string => {
    if (!data) return 'An unknown error occurred (Empty response)';

    // Check for specific authentication failure messages from fetchApi
    if (typeof data === 'string' && data.startsWith('Authentication failed:')) {
        return data;
    }
    if (data.message && typeof data.message === 'string' && data.message.startsWith('Authentication failed:')) {
        return data.message;
    }

    // 1. Zod Validation Errors (our backend puts field-level errors in `data.data` when status='fail')
    if (data.status === 'fail' && Array.isArray(data.data)) {
        return data.data.map((err: any) => err.message).join(', ');
    }

    // Fallback for legacy format just in case
    if (Array.isArray(data.errors)) {
        return data.errors.map((err: any) => err.message).join(', ');
    }

    // 2. Auth Errors or Standard Error key
    if (data.error && typeof data.error === 'string') {
        return data.error;
    }

    // 3. Standard Message key
    if (typeof data.message === 'string') {
        return data.message;
    }

    // 4. Message as array (legacy Zod)
    if (Array.isArray(data.message)) {
        return data.message.map((err: any) => err.message || JSON.stringify(err)).join(', ');
    }

    // 5. Fallback - check for common keys
    const fallback = data.message || data.error || data.statusText;
    if (fallback) return String(fallback);

    return 'An unknown error occurred (Check browser console)';
};
