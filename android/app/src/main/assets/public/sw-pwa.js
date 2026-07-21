const CACHE_NAME = 'college-date-v2.3';
const STATIC_ASSETS = ['/favicon-64.png', '/manifest.webmanifest'];

// 1. Installation: Cache the basic app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// 2. Activation: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((k) => k !== CACHE_NAME && caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

// 3. Fetch Interception: High-Performance Routing
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and Supabase API calls (let SWR handle data)
    if (request.method !== 'GET' || url.hostname.includes('supabase.co')) return;

    // STRATEGY: Network-first for the app shell so deploys do not leave users on old JS.
    if (
        url.origin === self.location.origin &&
        (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html')
    ) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // STRATEGY: Network-first for JS/CSS so old deploy chunks do not crash lazy routes.
    if (url.origin === self.location.origin && ['script', 'style', 'worker'].includes(request.destination)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => cache.match(request).then((cachedResponse) => cachedResponse || Response.error()));
            })
        );
        return;
    }

    // STRATEGY: Cache-first for stable same-origin assets such as images/icons.
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    const fetchedResponse = fetch(request).then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                    return cachedResponse || fetchedResponse;
                });
            })
        );
        return;
    }
    // STRATEGY: Cache-First for Fonts and static third-party scripts
    else if (request.destination === 'font' || request.url.includes('google-fonts')) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                });
            })
        );
    }
});
