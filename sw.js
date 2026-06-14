/* Vestiq service worker — app-shell cache only.
   NOTE: we deliberately do NOT cache the CLIP model or the CDN script here.
   Transformers.js manages its own model cache, and the model (~150-250 MB)
   should never go through this cache. We only precache the lightweight shell
   so the app opens fast and counts as installable. */

const CACHE = 'vestiq-v1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin GETs. Cross-origin (jsdelivr CDN, Hugging Face
  // model files) passes straight through to the network untouched.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
