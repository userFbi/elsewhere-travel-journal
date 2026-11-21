/* Travel Journal service worker
   - Pages & scripts: network-first (always fresh, falls back to cache offline)
   - Images / fonts / CDN libs: cache-first with background refresh
   - Admin pages, uploads (non-GET) and API calls are never touched */
const VERSION = 'tj-v2';
const SHELL = `${VERSION}-shell`;
const MEDIA = `${VERSION}-media`;
const MAX_MEDIA = 120;
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
const STATIC_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (e) => {
  // Tolerant precache: one missing file must never stop the worker from installing
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req)) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(MEDIA);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) { cache.put(req, res.clone()); trim(MEDIA, MAX_MEDIA); }
      return res;
    })
    .catch(() => null);
  return hit || (await refresh) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('admin')) return;

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || /\.(html|js|json|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/')) {
      e.respondWith(networkFirst(req));
    } else if (req.destination === 'image' || /\.(png|jpe?g|webp|svg|gif|ico|woff2?)$/.test(url.pathname)) {
      e.respondWith(cacheFirst(req));
    }
    return;
  }

  if (req.destination === 'image' && !/tile\.openstreetmap|tiles?\./.test(url.hostname)) {
    e.respondWith(cacheFirst(req));
  } else if (STATIC_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req));
  }
});
