/* 旅行行程規劃 — offline cache.
   Pages: network first (always get the newest version when online), fall back to cache offline.
   Google Fonts: cache first. Bump CACHE when you want to force-clear old caches. */
const CACHE = 'trip-planner-v8';
const CORE = ['./trip-planner.html', './', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // pages / html: always ask the server for the newest copy (no stale HTTP cache); offline → cached copy
  const isPage = req.mode === 'navigate' || /\.html?$|\/$/.test(url.pathname);
  // (fetch by URL — re-wrapping a navigation Request throws on some browsers, which would break offline opening)
  const netFetch = isPage ? fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }) : fetch(req);
  e.respondWith(netFetch.then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./trip-planner.html', { ignoreSearch: true }) : undefined))));
});
