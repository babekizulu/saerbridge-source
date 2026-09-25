/* global self, caches */
const CACHE = 'saerbridge-__VERSION__';
const ASSETS = __PRECACHE__;
self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('saerbridge-') && key !== CACHE).map((key) => caches.delete(key)))));
});
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
    // No API responses, generated files, photographs or email addresses are cached.
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then((cache) => cache.match('/index.html'))));
    } else if (ASSETS.includes(url.pathname)) {
        event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(url.pathname)) || fetch(event.request)));
    }
});
