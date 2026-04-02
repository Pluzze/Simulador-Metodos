// Network-first: sempre busca da rede, sem cache local
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  // Limpa todos os caches ao ativar
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  // Sempre busca da rede, sem fallback de cache
  event.respondWith(fetch(event.request));
});
