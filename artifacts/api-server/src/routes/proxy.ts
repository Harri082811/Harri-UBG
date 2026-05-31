import { Router } from "express";
import type { Request, Response as ExpressResponse } from "express";
import { lookup } from "dns/promises";

const router = Router();

const STRIP_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "permissions-policy",
]);

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_REDIRECTS = 5;

/** Return true if IPv4/IPv6 string is a private/internal/reserved address */
function isPrivateIp(ip: string): boolean {
  const addr = ip.replace(/^::ffff:/i, "");
  if (addr === "::1" || addr === "127.0.0.1" || addr.startsWith("127.")) return true;
  if (addr === "0.0.0.0" || addr === "::") return true;
  if (addr.startsWith("169.254.")) return true; // link-local / metadata
  if (addr.startsWith("10.")) return true;
  if (addr.startsWith("192.168.")) return true;
  const parts = addr.split(".").map(Number);
  if (
    parts.length === 4 &&
    parts[0] === 172 &&
    parts[1] !== undefined &&
    parts[1] >= 16 &&
    parts[1] <= 31
  )
    return true;
  if (/^fe80:/i.test(addr)) return true;
  if (/^f[cd]/i.test(addr)) return true;
  return false;
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
]);

async function isSafeHost(host: string): Promise<boolean> {
  const h = host.toLowerCase();
  if (BLOCKED_HOSTS.has(h)) return false;
  if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".localhost"))
    return false;
  try {
    const results = await lookup(h, { all: true });
    for (const r of results) {
      if (isPrivateIp(r.address)) return false;
    }
  } catch {
    return false;
  }
  return true;
}

async function isSafeUrl(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return isSafeHost(url.hostname);
}

/**
 * Manually follow redirects so every hop is safety-checked.
 * Returns { response, finalUrl } — response body NOT yet consumed.
 */
async function safeFetch(
  startUrl: string,
  reqHeaders: Record<string, string>,
  timeoutMs: number,
): Promise<{ response: globalThis.Response; finalUrl: string }> {
  let currentUrl = startUrl;
  let hops = 0;

  while (hops <= MAX_REDIRECTS) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new Error("Invalid redirect URL");
    }

    if (!(await isSafeUrl(parsed))) throw new Error("Redirect target is not allowed");

    const response = await fetch(currentUrl, {
      method: "GET",
      headers: reqHeaders,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const { status } = response;
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect with no Location header");
      currentUrl = new URL(location, currentUrl).toString();
      hops++;
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error("Too many redirects");
}

/** Inject <base href> + nav-intercept script so relative URLs and link clicks route through proxy */
function injectBase(html: string, baseUrl: string): string {
  const baseTag = `<base href="${baseUrl.replace(/"/g, "&quot;")}">`;

  // Navigation interceptor: rewrites link clicks + form submits + pushState to stay in proxy
  const navScript = `<script>
(function(){
  var PFX='/uv/service/';
  function wrap(u){
    try{
      var a=new URL(u,document.baseURI).href;
      if(a.startsWith('http://')||a.startsWith('https://'))
        return PFX+encodeURIComponent(a);
    }catch(e){}
    return u;
  }
  // Link clicks
  document.addEventListener('click',function(e){
    var n=e.target;
    for(var i=0;i<5;i++){
      if(!n||n===document)break;
      if(n.tagName==='A'){
        var h=n.getAttribute('href');
        if(h&&!h.startsWith('#')&&!h.startsWith('javascript:')){
          var w=wrap(h);
          if(w!==h){e.preventDefault();e.stopPropagation();location.href=w;}
        }
        break;
      }
      n=n.parentElement;
    }
  },true);
  // Form submits (GET)
  document.addEventListener('submit',function(e){
    var f=e.target;
    if(!f||!f.action)return;
    var m=(f.method||'get').toLowerCase();
    if(m==='get'){
      var w=wrap(f.action);
      if(w!==f.action){e.preventDefault();location.href=w+'?'+new URLSearchParams(new FormData(f));}
    }
  },true);
  // history.pushState / replaceState
  function patchHistory(fn){
    return function(s,t,u){
      if(u){var w=wrap(String(u));if(w!==u){location.href=w;return;}}
      return fn.apply(this,arguments);
    };
  }
  try{history.pushState=patchHistory(history.pushState);}catch(e){}
  try{history.replaceState=patchHistory(history.replaceState);}catch(e){}
})();
</script>`;

  const injection = baseTag + navScript;

  if (/<base\s[^>]*href/i.test(html)) {
    return html.replace(/<base\s[^>]*>/i, injection);
  }
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + injection + html.slice(insertAt);
  }
  return injection + html;
}

router.get("/proxy", async (req: Request, res: ExpressResponse) => {
  const targetUrl = req.query["url"] as string;
  if (!targetUrl) {
    res.status(400).json({ error: "url parameter required" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Only http/https URLs are supported" });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (!(await isSafeUrl(parsed))) {
    res.status(403).json({ error: "Target URL is not allowed" });
    return;
  }

  const upstream: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept:
      (req.headers["accept"] as string) ||
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language":
      (req.headers["accept-language"] as string) || "en-US,en;q=0.9",
  };

  try {
    const { response, finalUrl } = await safeFetch(targetUrl, upstream, 15_000);

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" });
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = contentType.includes("text/html");

    res.status(response.status);

    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // CORS: reflect only the same request origin (service worker same-origin)
    const requestOrigin = req.headers["origin"] as string | undefined;
    if (requestOrigin) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Vary", "Origin");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" });
      return;
    }

    if (isHtml) {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const rebased = injectBase(text, finalUrl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Length", Buffer.byteLength(rebased));
      res.end(Buffer.from(rebased));
    } else {
      res.end(Buffer.from(buffer));
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).send("Proxy error: " + msg);
  }
});

export default router;
