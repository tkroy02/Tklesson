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

// ═══════════════════════════════════════════
//  INSTALL — CACHE ESSENTIAL ASSETS
// ═══════════════════════════════════════════
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// ═══════════════════════════════════════════
//  ACTIVATE — CLEAN UP OLD CACHES
// ═══════════════════════════════════════════
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

// ═══════════════════════════════════════════
//  FETCH — SERVE FROM CACHE, FALL BACK TO NETWORK
// ═══════════════════════════════════════════
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

// ═══════════════════════════════════════════
//  PERIODIC BACKGROUND SYNC
// ═══════════════════════════════════════════
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-notifications') {
        event.waitUntil(checkForUpdates());
    }
});

async function checkForUpdates() {
    try {
        const response = await fetch('/api/updates');
        const data = await response.json();
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'background-update',
                data: data
            });
        });
    } catch (error) {
        console.log('Background sync failed:', error);
    }
}

// ═══════════════════════════════════════════
//  BACKGROUND SYNC — DEFER TASKS UNTIL ONLINE
// ═══════════════════════════════════════════
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-grades') {
        event.waitUntil(syncGradeData());
    }
    if (event.tag === 'sync-assignments') {
        event.waitUntil(syncAssignmentData());
    }
});

async function syncGradeData() {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'grades-synced' });
        });
    } catch (error) {
        console.log('Grade sync failed:', error);
    }
}

async function syncAssignmentData() {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'assignments-synced' });
        });
    } catch (error) {
        console.log('Assignment sync failed:', error);
    }
}

// ═══════════════════════════════════════════
//  PUSH NOTIFICATIONS
// ═══════════════════════════════════════════
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'You have a new update from Tklesson',
        icon: '/Tklesson1-192x192.png',
        badge: '/Tklesson1-192x192.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Tklesson', options)
    );
});

// ═══════════════════════════════════════════
//  NOTIFICATION CLICK HANDLER
// ═══════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
