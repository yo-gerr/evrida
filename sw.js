/* Evrida service worker — offline app shell.
 *
 * Scope: static app files only (HTML, manifest, icons). This cache never
 * touches user data: habits, journal entries, intentions, and settings live
 * in localStorage, and nothing here reads or transmits them. There are no
 * cross-origin requests to intercept.
 *
 * Navigations are network-first so a redeployed version is picked up
 * promptly, with the cache as the offline fallback. Static assets are
 * cache-first, refreshed in the background.
 */
const CACHE = 'evrida-shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
