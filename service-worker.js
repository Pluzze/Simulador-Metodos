const CACHE_NAME = 'gfi-calc-v1';

// Arquivos locais que serão cacheados no install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Install: precache do app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: remove caches antigos ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first para arquivos locais ──────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Recursos de CDN externos: network-first, sem cache obrigatório
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Arquivos locais: cache-first com atualização em background (stale-while-revalidate)
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then(networkResp => {
          if (networkResp && networkResp.status === 200) {
            cache.put(event.request, networkResp.clone());
          }
          return networkResp;
        })
        .catch(() => null);

      // Retorna o cache imediatamente (se existir), caso contrário aguarda a rede
      return cached || fetchPromise;
    })
  );
});

