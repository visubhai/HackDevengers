import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
    console.log(`\n🔍 NEXT_MW: ${req.method} ${req.nextUrl.pathname}`);
    const res = NextResponse.next()

    // 1. ADD SECURITY HEADERS
    // HSTS (HTTP Strict Transport Security) - Force HTTPS
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    // Prevent MIME type sniffing
    res.headers.set('X-Content-Type-Options', 'nosniff')
    // Prevent formatting (Clickjacking protection frame-ancestors is better, but this is a fallback)
    res.headers.set('X-Frame-Options', 'DENY')
    // XSS Protection (Legacy but good depth)
    res.headers.set('X-XSS-Protection', '1; mode=block')
    // Referrer Policy
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    // Content Security Policy (Basic starter)
    // Content Security Policy (Updated to allow Koyeb and local development)
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        img-src 'self' blob: data: https://*.koyeb.app https://res.cloudinary.com https://*.onrender.com;
        font-src 'self' data:;
        connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://*.koyeb.app https://*.vercel.app https://*.onrender.com;
    `.replace(/\s{2,}/g, ' ').trim();

    res.headers.set('Content-Security-Policy', cspHeader);

    // 2. AUTHENTICATION CHECK
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

    // 1. Fast-path default inference
    let token = await getToken({ req, secret });

    // 2. Fallbacks for reverse-proxy mismatch issues (e.g. Vercel Edge vs Node API)
    if (!token) {
        token = await getToken({ req, secret, secureCookie: true });
    }
    if (!token) {
        token = await getToken({ req, secret, secureCookie: false });
    }

    const isLoginPage = req.nextUrl.pathname.startsWith('/login');
    const isSuperAdminRoute = req.nextUrl.pathname.startsWith('/dashboard/super-admin');

    console.log(`\n🛡️  LOGGING PATH: ${req.nextUrl.pathname}`);
    console.log(`🛡️  TOKEN: ${!!token}`);

    // Standard Auth check: If not login page and no token -> Redirect to /login
    if (!isLoginPage && !token) {
        console.log("🛡️ BLOCKING: No valid session token. Redirecting to /login.");
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // Role-based protection: Only SUPER_ADMIN can access Super Admin routes
    if (isSuperAdminRoute && token?.role !== 'SUPER_ADMIN') {
        console.log(`🛡️ BLOCKING: Role '${token?.role}' tried to access Super Admin route. Redirecting to /.`);
        return NextResponse.redirect(new URL('/', req.url));
    }

    return res
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - images (public images folder)
         * - favicon.ico (favicon file)
         */
        '/',
        '/dashboard/:path*',
        '/reports/:path*',
        '/inbound/:path*',
        '/admin/:path*',
        '/settings/:path*',
        '/login',
        '/print/:path*'
    ],
}
