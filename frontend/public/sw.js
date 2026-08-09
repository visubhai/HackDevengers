const CACHE_NAME = 'savan-parcel-v3';
const STATIC_ASSETS = [
    '/manifest.json',
    '/images/savan-logo.png',
    '/icon.png'
];

// Install: cache only truly static assets (not the app shell)
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
                )
            );
        })
    );
});

// Activate: delete ALL old caches immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: NETWORK FIRST strategy
// Always try the network first. Only use cache if network fails (offline support).
// Never cache Next.js JS chunks, HTML pages, or API calls.
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests and API/auth calls entirely (no caching)
    if (event.request.method !== 'GET') return;
    if (url.pathname.startsWith('/api/')) return;
    if (url.hostname !== self.location.hostname) return;

    // For Next.js JS chunks: always network, no cache
    if (url.pathname.startsWith('/_next/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For static assets (images, manifest): network first, cache fallback
    if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse.ok) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // For HTML pages: always network, never cache
    event.respondWith(fetch(event.request));
});
