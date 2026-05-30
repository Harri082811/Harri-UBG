const PREFIX = '/uv/service/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', evt => evt.waitUntil(clients.claim()));

async function proxyReq(targetUrl, req) {
  const u = new URL(self.location.origin + '/api/proxy');
  u.searchParams.set('url', targetUrl);
  const init = { method: req.method };
  const headers = {};
  for (const [k, v] of req.headers) {
    const l = k.toLowerCase();
    if (l !== 'host' && l !== 'origin' && l !== 'referer') headers[k] = v;
  }
  init.headers = headers;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try { init.body = await req.arrayBuffer(); } catch {}
  }
  try {
    return await fetch(u.toString(), init);
  } catch (e) {
    return new Response('Proxy error: ' + e.message, { status: 502, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // /uv/service/encoded-url  → proxy the decoded URL
  if (url.pathname.startsWith(PREFIX)) {
    let targetUrl;
    try {
      targetUrl = decodeURIComponent(url.pathname.slice(PREFIX.length));
      new URL(targetUrl);
    } catch { return; }
    evt.respondWith(proxyReq(targetUrl, evt.request));
    return;
  }

  // Cross-origin sub-resources from a proxied page → proxy them
  if (url.origin !== self.location.origin) {
    evt.respondWith(proxyReq(url.href, evt.request));
    return;
  }
  // Same-origin (our API, assets, etc.) → pass through
});
