import { NextRequest, NextResponse } from 'next/server';

// Proxies credentials to Express backend to detect 2FA_REQUIRED before creating a NextAuth session.
// Uses BACKEND_URL directly when available; otherwise self-calls /api/auth/login which is rewritten
// to the backend via next.config.ts (avoids relying on BACKEND_URL as a runtime env var).
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Prefer direct backend call; fall back to self-call through the rewrite rule
        const backendUrl = process.env.BACKEND_URL || process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
        const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
        const loginUrl = base.endsWith('/api') ? `${base}/auth/login` : `${base}/api/auth/login`;

        const res = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
        console.error('[login-check] Failed to reach backend:', err.message);
        return NextResponse.json(
            { error: 'Login check failed', message: err.message },
            { status: 500 }
        );
    }
}
