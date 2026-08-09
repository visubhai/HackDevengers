"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/frontend/components/layout/Sidebar";
import { Header } from "@/frontend/components/layout/Header";
import { MobileNav } from "@/frontend/components/layout/MobileNav";
import { useBranchStore } from "@/frontend/lib/store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // Added
import { GlobalErrorBoundary } from "@/frontend/components/GlobalErrorBoundary";
import { ToastProvider } from "@/frontend/components/ui/toast";
import { SessionProvider } from "next-auth/react"; // Ideally wrap with this
import { WebVitals } from "./vitals";
import { Inter } from "next/font/google";
import { SWRProvider } from "@/frontend/components/SWRProvider";
import { SmoothScrollMain } from "@/frontend/components/SmoothScrollMain";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { currentUser, checkSession } = useBranchStore(); // Added checkSession
  const pathname = usePathname(); // Get current path
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch & Check Session
  useEffect(() => {
    setMounted(true);
    checkSession(); // Hydrate session on mount

    // Apply Theme
    const theme = useBranchStore.getState().theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [checkSession]);

  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LogiOpen Parcel" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = 'light';
                const store = localStorage.getItem('parcel-system-storage');
                if (store) {
                  theme = JSON.parse(store).state?.theme || 'light';
                }
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}

              // Only register service worker in production
              // In development, unregister any existing SW to avoid stale cache issues
              if ('serviceWorker' in navigator) {
                if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                  // Development: unregister any existing service workers
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (let registration of registrations) {
                      registration.unregister();
                    }
                  });
                } else {
                  // Production: register the service worker
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(registration) {
                      console.log('SW registered: ', registration);
                    }, function(err) {
                      console.log('SW registration failed: ', err);
                    });
                  });
                }
              }
            `,
          }}
        />

      </head>
      <body
        suppressHydrationWarning={true}
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <GlobalErrorBoundary>
          <WebVitals />
          <ToastProvider>
            <SWRProvider>
              <SessionProvider>
                {!mounted ? null : (
                  isAuthPage ? (
                    // Render children directly for auth pages (no sidebar/header)
                    <main className="h-screen w-full">
                      {children}
                    </main>
                  ) : (
                    // Render dashboard layout for other pages
                    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
                      <Sidebar />
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <Header />
                        {/* SmoothScrollMain attaches Lenis directly to this element */}
                        <SmoothScrollMain className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 overscroll-y-none touch-pan-y">
                          {children}
                        </SmoothScrollMain>
                        <MobileNav />
                      </div>
                    </div>
                  )
                )}
              </SessionProvider>
            </SWRProvider>
          </ToastProvider>
        </GlobalErrorBoundary>
      </body>
    </html >
  );
}
