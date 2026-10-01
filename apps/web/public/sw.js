// PaperSync service worker. Pages always load from the network, so signed-in
// content is never cached; the worker only stores a fallback page shown when
// the installed app opens without a connection.
const offlineCache = 'papersync-offline-v1';
const offlinePage = '/offline.html';

globalThis.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(offlineCache)
      .then((cache) => cache.add(new Request(offlinePage, { cache: 'reload' })))
      .then(() => globalThis.skipWaiting()),
  );
});

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== offlineCache)
          .map((name) => caches.delete(name)),
      );
      // Preloading starts the page request while the worker boots.
      await globalThis.registration.navigationPreload?.enable();
      await globalThis.clients.claim();
    })(),
  );
});

const loadPage = async (event) => {
  try {
    return (await event.preloadResponse) ?? (await fetch(event.request));
  } catch {
    const cache = await caches.open(offlineCache);
    return (await cache.match(offlinePage)) ?? Response.error();
  }
};

globalThis.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(loadPage(event));
  }
});
