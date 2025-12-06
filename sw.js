const CACHE_NAME = 'eto-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/images/001.png', '/images/002.png', '/images/003.png', '/images/004.png',
    '/images/005.png', '/images/006.png', '/images/007.png', '/images/008.png',
    '/images/009.png', '/images/010.png', '/images/011.png', '/images/012.png',
    '/images/icon-192.png', '/images/icon-512.png', '/images/icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
