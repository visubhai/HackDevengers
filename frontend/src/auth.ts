import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth }: any = NextAuth({
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                otp: { label: "OTP", type: "text" }
            },
            async authorize(credentials) {
                try {
                    // Resolve absolute API URL for server-side fetch in NextAuth
                    let API_URL = process.env.BACKEND_URL ||
                        process.env.INTERNAL_API_URL;

                    if (!API_URL) {
                        const nextPublicApi = process.env.NEXT_PUBLIC_API_URL;
                        if (nextPublicApi && !nextPublicApi.startsWith('/')) {
                            API_URL = nextPublicApi;
                        } else if (process.env.VERCEL_URL) {
                            API_URL = `https://${process.env.VERCEL_URL}/api`;
                        } else {
                            API_URL = 'http://localhost:3001/api';
                        }
                    }

                    if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1);
                    if (!API_URL.endsWith('/api')) API_URL = `${API_URL}/api`;

                    console.log("🚀 AUTH SERVICE: Attempting login at:", `${API_URL}/auth/login`);
                    console.log("📦 AUTH DATA:", { username: credentials.email });

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                    const loginBody: Record<string, any> = {
                        username: credentials.email,
                        password: credentials.password,
                    };
                    if (credentials.otp) {
                        loginBody.otp = credentials.otp;
                    }

                    const res = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify(loginBody),
                        headers: { "Content-Type": "application/json" },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    let data;
                    try {
                        data = await res.json();
                    } catch (e) {
                        console.error("Failed to parse JSON response from auth endpoint");
                    }

                    if (res.status === 403 && data?.error === '2FA_REQUIRED') {
                        throw new Error('2FA_REQUIRED');
                    }

                    if (!res.ok) {
                        console.error("🚀 AUTH SERVICE: Login failed:", res.status, data);
                        return null;
                    }

                    // Backend returns standardized { status: 'success', data: { accessToken, user: { ... } } }
                    // Support both old and new formats for transition safety
                    const payload = data.data || data;
                    const user = payload.user;
                    const accessToken = payload.accessToken || payload.token;

                    if (!user || !accessToken) {
                        console.error("🚀 AUTH SERVICE: Missing user or token in response", data);
                        return null;
                    }

                    return {
                        ...user,
                        accessToken: accessToken
                    };

                } catch (error: any) {
                    console.error("Auth Authorize Error:", error.message);
                    return null; // Return null on network or system errors during auth
                }
            }
        })
    ],
    debug: process.env.NODE_ENV === 'development' || true, // Keep enabled for now to debug production bounce
    callbacks: {
        async jwt({ token, user, account }: any) {
            // Initial sign in - populate token with user data and backend token
            if (user && account) {
                token.role = user.role;
                token.id = user.id; // Explicitly map ID
                token.branchId = user.branchId;
                token.branchName = user.branchName;
                token.username = user.username;
                token.accessToken = user.accessToken;
                token.allowedBranches = user.allowedBranches || [];
                token.email = user.email || `${user.branchName?.toLowerCase().replace(/\s+/g, '') || 'user'}@logiopen.com`;
                
                // Add a timestamp for when the token was created
                token.accessTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days (Sync with backend)
            }

            // If the access token has not expired yet, return it
            if (token.accessToken && Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            // If the access token has expired or is missing, try to refresh it
            // Note: In NextAuth v5, this happens on the server side
            try {
                let API_URL = process.env.BACKEND_URL || process.env.INTERNAL_API_URL || 'http://localhost:3001/api';
                if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1);
                if (!API_URL.endsWith('/api')) API_URL = `${API_URL}/api`;

                console.log("🔄 AUTH: Attempting background token refresh...");
                
                // We rely on the 'jwt' HTTP-only cookie being sent to the backend
                // However, 'fetch' in Node.js won't automatically send browser cookies!
                // THIS is the common missing link. 
                // But in NextAuth callbacks, we don't have direct access to the browser's response cookies to send them.
                
                // Workaround: We return the token as is, and let 'fetchApi' in base.ts handle the 401 
                // by calling /api/auth/session which triggers a client-side update if possible.
                
                return token;
            } catch (error) {
                console.error("Error refreshing access token", error);
                return { ...token, error: "RefreshAccessTokenError" };
            }
        },
        async session({ session, token }: any) {
            if (token) {
                session.user.id = token.id || token.sub; // Map ID to session
                session.user.role = token.role;
                session.user.branchId = token.branchId;
                session.user.branchName = token.branchName;
                session.user.branch = token.branchName;
                session.user.name = token.name;
                session.user.username = token.username;
                session.user.accessToken = token.accessToken;
                session.user.allowedBranches = token.allowedBranches || [];
                session.accessToken = token.accessToken;
                session.error = token.error;
                
                if (token.email) session.user.email = token.email as string;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt'
    }
});
