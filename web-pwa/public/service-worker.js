/* Service Worker Installation and Activation */
const CACHE_NAME = 'motorready-v6';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './src/css/styles.css?v=6',
    './src/js/app.js?v=6',
    './src/modules/db.js',
    './src/modules/weather.js',
    './src/modules/gearLogic.js',
    './src/modules/parking.js',
    './public/manifest.json'
];

/* Install Event - Cache Assets */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Cache opened, caching app shell');
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('Some assets failed to cache:', err);
                // Continue even if some assets fail
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

/* Activate Event - Clean Old Caches */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

/* Fetch Event - Network First, Cache Fallback */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Let external requests (APIs, CDN, map tiles) go straight to the network
    // — do NOT intercept them, as wrapping them breaks CORS preflight
    if (url.origin !== location.origin) {
        return;
    }

    // Local JS, CSS, HTML — always fetch fresh from server, cache as offline fallback
    const isAppShell = /\.(js|css|html)$/.test(url.pathname) || url.pathname === '/';
    if (isAppShell) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Everything else local — network first, cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) =>
                    cached || new Response('Offline - Resource not available', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    })
                )
            )
    );
});

/* Message Event - Handle Messages from App */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
