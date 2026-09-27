'use strict';
const VERSION = "v2";
const PREFIX = 'mecanizado-tecma:' + self.registration.scope + ':';
const CACHE = PREFIX + VERSION;
const INDEX = new URL('./index.html', self.registration.scope).href;
const FILES = ['./index.html', './manifest.json', './icon.svg'];
const URLS = FILES.map(file => new URL(file, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })))
  ));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  const navigation = event.request.mode === 'navigate';
  url.search = '';
  if (!navigation && !URLS.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = navigation ? INDEX : url.href;
    const cached = await cache.match(key);
    if (cached) return cached;
    try {
      const response = await fetch(navigation ? INDEX : event.request);
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch {
      return new Response('Abre Mecanizado Tecma con internet una vez y vuelve a intentarlo.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
