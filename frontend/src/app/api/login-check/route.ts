import { NextRequest, NextResponse } from 'next/server';

// Proxies credentials to Express backend to detect 2FA_REQUIRED before creating a NextAuth session.
// Uses BACKEND_URL directly when available; otherwise self-calls /api/auth/login which is rewritten
// to the backend via next.config.ts (avoids relying on BACKEND_URL as a runtime env var).
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Prefer direct backend call; fall back to self-call through the rewrite rule
        const backendUrl = process.env.BACKEND_URL || process.env.INTERNAL_API_URL;

        let loginUrl: string;
        if (backendUrl) {
            const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
            loginUrl = `${base}/api/auth/login`;
        } else {
            // Self-call: next.config.ts rewrites /api/auth/login → backend
            const origin = request.nextUrl.origin;
            loginUrl = `${origin}/api/auth/login`;
        }

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
