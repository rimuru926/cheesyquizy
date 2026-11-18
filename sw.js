// CheesyQuizy service worker: keeps the page itself available offline.
// Only same-origin files are handled. Everything else (character data, Firebase, YouTube, AnimeThemes audio and video) goes
// straight to the network untouched, so media streaming and live data are never affected.
const CACHE = 'cheesyquizy-shell-v1';
const PRECACHE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return; // never touch partial (media) requests
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network first, so a new version of the page is always picked up when online; the saved copy is the offline fallback.
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./') : undefined)))
  );
});
