const CACHE_NAME = 'inventory-app-v1';
const URLs_TO_CACHE = [
  './',
  './index.html',
  './AddProducts.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
          .then(cache => cache.addAll(URLs_TO_CACHE))
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request)
          .then(resp => resp || fetch(evt.request))
  );
});
