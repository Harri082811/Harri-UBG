importScripts('/scramjet.all.js');

const sw = new ScramjetServiceWorker();

addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

addEventListener('fetch', (event) => {
  if (sw.route(event)) {
    event.respondWith(sw.fetch(event));
  }
});
