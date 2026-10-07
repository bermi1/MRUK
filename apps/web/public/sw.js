/* Mr UK and Skywood: offline shell service worker.
 * - Precaches the offline page, logos and icons.
 * - Navigations: network first, then the cached copy of that page, then /offline.
 * - Static assets (/_next/static, /brand, /img, /icons): cache first.
 * - Never caches /api, /admin, /azania (bank mini app), server actions or any non-GET request.
 * Bump VERSION to invalidate old caches; they are deleted on activate. */
const VERSION = 'v1';
const SHELL = `bt-shell-${VERSION}`;
const PAGES = `bt-pages-${VERSION}`;
const STATIC = `bt-static-${VERSION}`;
const KEEP = [SHELL, PAGES, STATIC];
const OFFLINE_URL = '/offline';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/brand/mruk.png',
  '/brand/mruk-white.png',
  '/brand/skywood.png',
  '/brand/skywood-white.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
];
const MAX_PAGES = 30;
const MAX_STATIC = 200;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('bt-') && !KEEP.includes(k)).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => undefined);
      await self.clients.claim();
    })(),
  );
});

const NEVER = /^\/(api|admin|azania)(\/|$)/;
const PERSONAL = /\/(account|order|orders|pay|checkout|track|login)(\/|$)/;
const STATIC_PATH = /^\/(_next\/static|brand|img|icons)\//;

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function networkFirstPage(event) {
  const req = event.request;
  try {
    const preloaded = await event.preloadResponse;
    const res = preloaded || (await fetch(req));
    // Keep a copy of successful pages for offline use, except personal ones (orders, account, checkout).
    if (res.ok && res.type === 'basic' && !PERSONAL.test(new URL(req.url).pathname)) {
      const copy = res.clone();
      caches.open(PAGES).then((c) => c.put(req, copy).then(() => trim(PAGES, MAX_PAGES)));
    }
    return res;
  } catch {
    const cached = (await caches.match(req, { ignoreVary: true })) || (await caches.match(OFFLINE_URL));
    return cached || new Response('You are offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(STATIC).then((c) => c.put(req, copy).then(() => trim(STATIC, MAX_STATIC)));
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST (server actions, forms) always go to the network.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.test(url.pathname)) return;
  if (req.headers.get('Next-Action') || req.headers.get('RSC') || url.searchParams.has('_rsc')) return; // RSC payloads are per-request.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstPage(event));
    return;
  }
  if (STATIC_PATH.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  }
});
