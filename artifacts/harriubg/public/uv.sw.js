const PREFIX = '/uv/service/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', evt => evt.waitUntil(clients.claim()));

async function proxyReq(targetUrl, req) {
  const u = new URL(self.location.origin + '/api/proxy');
  u.searchParams.set('url', targetUrl);
  const init = { method: req.method, redirect: 'follow' };
  const headers = {};
  for (const [k, v] of req.headers) {
    const l = k.toLowerCase();
    if (
      l !== 'host' && l !== 'origin' && l !== 'referer' &&
      !l.startsWith('sec-fetch') && !l.startsWith('sec-ch')
    ) headers[k] = v;
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

  // /uv/service/<encoded-url>  → decode and proxy
  if (url.pathname.startsWith(PREFIX)) {
    let targetUrl;
    try {
      targetUrl = decodeURIComponent(url.pathname.slice(PREFIX.length));
      if (url.search) targetUrl += url.search;
      new URL(targetUrl); // validate
    } catch { return; }
    evt.respondWith(proxyReq(targetUrl, evt.request));
    return;
  }

  // Cross-origin sub-resources requested FROM a proxied page → proxy them too
  const ref = evt.request.referrer;
  if (ref && url.origin !== self.location.origin) {
    try {
      const refUrl = new URL(ref);
      if (refUrl.pathname.startsWith(PREFIX)) {
        evt.respondWith(proxyReq(url.href, evt.request));
        return;
      }
    } catch {}
  }
  // Everything else: pass through normally
});
