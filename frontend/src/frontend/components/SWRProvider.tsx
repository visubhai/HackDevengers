'use client';
import { SWRConfig } from 'swr';
import { useToast } from './ui/toast';

// Fast lightweight in-memory cache provider for zero main-thread blocking
function inMemoryProvider() {
    if (typeof window !== 'undefined') {
        // Clear any old legacy 4MB cache bloat from localStorage once
        try {
            if (localStorage.getItem('parcel-cache')) {
                localStorage.removeItem('parcel-cache');
            }
        } catch (e) {}
    }
    return new Map();
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
    const { addToast } = useToast();
    return (
        <SWRConfig value={{
            provider: inMemoryProvider,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            errorRetryCount: 3,
            dedupingInterval: 10_000,      // global: don't re-fetch same key within 10s
            focusThrottleInterval: 60_000,  // max 1 revalidation/min
            keepPreviousData: true,         // show stale data while loading new — no blank flash
            onError: (error) => {
                if (error?.status !== 401 && error?.status !== 403) {
                    const message = error?.info?.message || error?.message || 'Unexpected error';
                    addToast(`Data Fetch Error: ${message}`, 'error');
                }
            }
        }}>
            {children}
        </SWRConfig>
    );
}
