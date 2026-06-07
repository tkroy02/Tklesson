// ═══════════════════════════════════════════
//  TKLESSON SERVICE WORKER
// ═══════════════════════════════════════════

const CACHE_NAME = 'tklesson-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/header.html',
    '/footer.html',
    '/manifest.json',
    '/Tklesson1-192x192.png',
    '/Tklesson1-512x512.png',
    '/Tklesson3.png'
];

// Install — cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip Firebase/Firestore API calls — let them go to network
    if (event.request.url.includes('firestore') ||
        event.request.url.includes('gstatic') ||
        event.request.url.includes('cloudfunctions')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((response) => {
                // Don't cache API calls or dynamic content
                if (event.request.url.includes('/api/') ||
                    event.request.url.includes('school-')) {
                    return response;
                }
                // Cache static assets for offline use
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            });
        })
    );
});
