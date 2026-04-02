const CACHE_NAME = 'gfi-calc-v3';

// Base path relativo ao local do service worker (funciona em localhost E GitHub Pages)
const BASE = self.registration.scope;

// Arquivos locais que serão cacheados no install
const APP_SHELL = [
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'apple-touch-icon.png',
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

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Recursos externos (CDN): network-first sem cache obrigatório
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Requisições de navegação (HTML): network-first → fallback para cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  // Outros assets locais: cache-first, atualiza em background
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then(resp => {
          if (resp && resp.status === 200) cache.put(event.request, resp.clone());
          return resp;
        })
        .catch(() => null);
      return cached || fetchPromise;
    })
  );
});


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

