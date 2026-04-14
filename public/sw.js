/**
 * Legion Commander — Service Worker
 *
 * Strategy:
 *  - Cache the app shell (HTML, JS, CSS, sprites, icons) on install.
 *  - Cache-first for static assets (sprites, icons, manifest, fonts).
 *  - Network-first with cache fallback for the HTML document (so updates ship fast).
 *  - Never cache Supabase API calls.
 *
 * Cache bust: change CACHE_VERSION on every release.
 */

const CACHE_VERSION = 'legion-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.png',
  // Spritesheets
  '/sprites/player.png',
  '/sprites/swordsman.png',
  '/sprites/spearman.png',
  '/sprites/archer.png',
  '/sprites/mage.png',
  '/sprites/priest.png',
  '/sprites/grunt.png',
  '/sprites/charger.png',
  '/sprites/sniper.png',
  '/sprites/shielder.png',
  '/sprites/bomber.png',
  '/sprites/boss.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Precache but don't fail install if any single file is missing
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((e) => console.warn('[SW] Precache miss:', url, e))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip: Supabase REST, external analytics, cross-origin (except fonts)
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('vercel-insights.com')) return;

  // Skip: Vite HMR / dev client
  if (url.pathname.startsWith('/@vite') || url.pathname.includes('/@fs/')) return;

  // HTML: network-first (so updates deploy immediately)
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Only cache successful same-origin or cors responses
        if (res.ok && (url.origin === self.location.origin || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
