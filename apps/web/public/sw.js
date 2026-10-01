// PaperSync service worker. Pages always load from the network, so signed-in
// content is never cached; the worker only stores a fallback page shown when
// the installed app opens without a connection. It also receives photos
// shared to PaperSync and opens Scan from analysis notifications.
const offlineCache = 'papersync-offline-v1';
const offlinePage = '/offline.html';
const scanPage = '/scan';
const shareTarget = '/share-target';
// Keep in sync with src/features/scanner/hooks/scan-draft-store.ts.
const draftDatabase = 'papersync';
const draftDatabaseVersion = 1;
const draftStore = 'scan-draft';
const sharedKey = 'shared';
const seeOtherStatus = 303;

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

const openDraftDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(draftDatabase, draftDatabaseVersion);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(draftStore);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// Shared photos wait in the scan draft until Scan adds them as pages.
const keepSharedPhotos = async (photos) => {
  const database = await openDraftDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(draftStore, 'readwrite');
      const store = transaction.objectStore(draftStore);
      const waiting = store.get(sharedKey);
      waiting.onsuccess = () => {
        store.put([...(waiting.result ?? []), ...photos], sharedKey);
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

const receiveShare = async (request) => {
  const form = await request.formData();
  const photos = form
    .getAll('page')
    .filter((value) => value instanceof Blob && value.size > 0);
  await keepSharedPhotos(photos);
  return Response.redirect(scanPage, seeOtherStatus);
};

globalThis.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === shareTarget) {
    event.respondWith(
      receiveShare(event.request).catch(() =>
        Response.redirect(`${scanPage}?shared=failed`, seeOtherStatus),
      ),
    );
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(loadPage(event));
  }
});

globalThis.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await globalThis.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const scan = windows.find(
        (client) => new URL(client.url).pathname === scanPage,
      );
      if (scan) {
        await scan.focus();
        return;
      }
      await globalThis.clients.openWindow(scanPage);
    })(),
  );
});
