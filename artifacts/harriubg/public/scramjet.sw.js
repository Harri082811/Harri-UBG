importScripts('/scramjet.all.js');

const sw = new ScramjetServiceWorker();

addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

addEventListener('activate', (event) => {
  event.waitUntil(
    sw.loadConfig().then(() => clients.claim())
  );
});

addEventListener('message', (event) => {
  if (event.data?.scramjet$type === 'loadConfig') {
    sw.loadConfig();
  }
});

addEventListener('fetch', (event) => {
  if (sw.route(event)) {
    event.respondWith(sw.fetch(event));
  }
});
