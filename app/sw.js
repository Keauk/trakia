// Trakia service worker: cache-first for the app shell so it works offline once installed.
// Bump CACHE_VERSION whenever index.html, core.js or data.js change.
const CACHE_VERSION = 'trakia-v16';
const SHELL = ['./', './index.html', './core.js', './data.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' bypasses the browser's HTTP cache so a new version never re-caches stale files
  e.waitUntil(caches.open(CACHE_VERSION)
    .then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'reload' }).then(r => { if (r.ok) return c.put(u, r); throw new Error(u + ' ' + r.status); }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
