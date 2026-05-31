importScripts('/scramjet.all.js');

const sw = new ScramjetServiceWorker();
let configReady = false;

async function ensureConfig() {
  if (configReady) return;
  try {
    await sw.loadConfig();
    configReady = true;
  } catch {}
}

addEventListener('install', () => self.skipWaiting());

addEventListener('activate', (event) => {
  event.waitUntil(ensureConfig().then(() => clients.claim()));
});

addEventListener('message', (event) => {
  if (event.data?.scramjet$type === 'loadConfig') {
    ensureConfig();
  }
});

addEventListener('fetch', (event) => {
  if (!configReady) {
    // Inline load on first fetch — handles the case where activate fired before IDB was written
    event.respondWith(
      ensureConfig().then(() => {
        if (sw.route(event)) return sw.fetch(event);
        return fetch(event.request);
      })
    );
    return;
  }
  if (sw.route(event)) {
    event.respondWith(sw.fetch(event));
  }
});
