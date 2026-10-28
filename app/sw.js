// Trakia service worker: cache-first for the app shell so it works offline once installed.
// CACHE_VERSION is a hash of the SHELL files, written by tools/stamp_cache.py (npm run build); never edit it by hand (D-032).
const CACHE_VERSION = 'trakia-298486adce70';
const AUDIO = 'trakia-audio';   // spoken clips (D-005): named by their text, so they never change and outlive every version
const SHELL = ['./', './index.html', './core.js', './ui.js', './data.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
  './fonts/golos-text-latin.woff2', './fonts/golos-text-cyrillic.woff2', './fonts/pt-serif-700-cyrillic.woff2', './fonts/ibm-plex-mono-400-latin.woff2', './fonts/ibm-plex-mono-500-latin.woff2',
  './speak-test.html', './speak-test.js'];   // the speech test (D-033 phase 0): listed so a new version is never served stale

self.addEventListener('install', e => {
  // cache: 'reload' bypasses the browser's HTTP cache so a new version never re-caches stale files
  e.waitUntil(caches.open(CACHE_VERSION)
    .then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'reload' }).then(r => { if (r.ok) return c.put(u, r); throw new Error(u + ' ' + r.status); }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION && k !== AUDIO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.includes('/audio/')) {   // kept in their own cache, fetched once
    e.respondWith(caches.open(AUDIO).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.status === 200) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
