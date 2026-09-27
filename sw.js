'use strict';

// Cambia VERSION cada vez que publiques cambios en los archivos.
const VERSION = 'v1';
const PREFIX = 'mecanizado-tecma-' + self.registration.scope;
const CACHE = PREFIX + VERSION;
const FILES = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES.map(path => new Request(
      new URL(path, self.registration.scope),
      { cache: 'reload' }
    )));
    // La nueva versión espera a que la persona toque el aviso.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  ) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const path = url.pathname;
    const scopePath = new URL(self.registration.scope).pathname;

    const isHome =
      event.request.mode === 'navigate' &&
      (path === scopePath || path === scopePath + 'index.html');

    const key = isHome
      ? new URL('./index.html', self.registration.scope).href
      : event.request;

    const cached = await cache.match(key);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);

      if (response.ok && response.type === 'basic') {
        try {
          await cache.put(key, response.clone());
        } catch {}
      }

      return response;
    } catch {
      return new Response(
        'Sin conexión. Abre la aplicación con internet una primera vez.',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        }
      );
    }
  })());
});
