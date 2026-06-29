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

const MAX_RESPONSE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_REDIRECTS = 8;

function isPrivateIp(ip: string): boolean {
  const addr = ip.replace(/^::ffff:/i, "");
  if (addr === "::1" || addr === "127.0.0.1" || addr.startsWith("127.")) return true;
  if (addr === "0.0.0.0" || addr === "::") return true;
  if (addr.startsWith("169.254.")) return true;
  if (addr.startsWith("10.")) return true;
  if (addr.startsWith("192.168.")) return true;
  const parts = addr.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (/^fe80:/i.test(addr)) return true;
  if (/^f[cd]/i.test(addr)) return true;
  return false;
}

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata.internal"]);

async function isSafeHost(host: string): Promise<boolean> {
  const h = host.toLowerCase();
  if (BLOCKED_HOSTS.has(h)) return false;
  if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".localhost")) return false;
  try {
    const results = await lookup(h, { all: true });
    for (const r of results) {
      if (isPrivateIp(r.address)) return false;
    }
  } catch {
    // DNS lookup failed in sandbox environment — allow if host passes static checks
    return true;
  }
  return true;
}

async function isSafeUrl(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return isSafeHost(url.hostname);
}

async function safeFetch(
  startUrl: string,
  reqHeaders: Record<string, string>,
  timeoutMs: number,
): Promise<{ response: globalThis.Response; finalUrl: string }> {
  let currentUrl = startUrl;
  let hops = 0;
  while (hops <= MAX_REDIRECTS) {
    let parsed: URL;
    try { parsed = new URL(currentUrl); } catch { throw new Error("Invalid redirect URL"); }
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

/** Resolve url relative to base, return absolute or null if it should not be proxied */
function absUrl(url: string, base: string): string | null {
  if (!url) return null;
  const t = url.trim();
  if (
    t.startsWith("data:") || t.startsWith("blob:") || t.startsWith("javascript:") ||
    t.startsWith("#") || t.startsWith("about:") || t.startsWith("mailto:") ||
    t.startsWith("tel:") || t.includes("/api/proxy")
  ) return null;
  try {
    const abs = new URL(t, base).href;
    if (abs.startsWith("http://") || abs.startsWith("https://")) return abs;
  } catch {}
  return null;
}

function proxyUrl(url: string, base: string): string {
  const abs = absUrl(url, base);
  if (!abs) return url;
  return `/api/proxy?url=${encodeURIComponent(abs)}`;
}

/** Rewrite HTML: src, href, action, srcset, poster, data, style url() */
function rewriteHtml(html: string, base: string): string {
  // src, href, action, poster
  html = html.replace(/\b(src|href|action|poster)=(["'])([^"'<>\s]*)\2/gi, (m, attr, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `${attr}=${q}${p}${q}` : m;
  });
  // srcset
  html = html.replace(/\bsrcset=(["'])([^"'<>]*)\1/gi, (m, q, srcset) => {
    const rw = srcset.replace(/(https?:\/\/[^\s,]+)/gi, (u: string) => {
      const p = proxyUrl(u, base);
      return p !== u ? p : u;
    });
    return rw !== srcset ? `srcset=${q}${rw}${q}` : m;
  });
  // inline style url()
  html = html.replace(/\burl\((['"]?)(https?:\/\/[^)'"\s]+)\1\)/gi, (m, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `url(${q}${p}${q})` : m;
  });
  return html;
}

/** Rewrite CSS url() references */
function rewriteCss(css: string, base: string): string {
  return css.replace(/\burl\((['"]?)(https?:\/\/[^)'"\s]+)\1\)/gi, (m, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `url(${q}${p}${q})` : m;
  });
}

/** Build the full injection to prepend inside <head> */
function buildInjection(baseUrl: string): string {
  const safeBase = baseUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // 1) fetch + XHR + sendBeacon interceptor — runs before any other script
  const interceptor = `<script>
(function(){
var _b="${safeBase}";
var _px="/api/proxy?url=";
function _p(u){
  if(!u||typeof u!=="string")return u;
  if(u.startsWith("data:")||u.startsWith("blob:")||u.startsWith("javascript:")||u.startsWith("#")||u.startsWith("about:")||u.indexOf("/api/proxy")!==-1)return u;
  try{var a=new URL(u,_b).href;if(a.startsWith("http://")||a.startsWith("https://"))return _px+encodeURIComponent(a);}catch(e){}
  return u;
}
var _of=self.fetch;
self.fetch=function(inp,ini){
  try{if(typeof inp==="string")inp=_p(inp);else if(inp&&typeof inp.url==="string")inp=new Request(_p(inp.url),inp);}catch(e){}
  return _of.call(this,inp,ini);
};
var _ox=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(){
  var a=Array.prototype.slice.call(arguments);
  if(typeof a[1]==="string")a[1]=_p(a[1]);
  _ox.apply(this,a);
};
try{if(navigator.sendBeacon){var _ob=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){return _ob(_p(u),d);};}}catch(e){}
})();
</script>`;

  // 2) Link/form interceptor — runs after DOM ready
  const navScript = `<script>
(function(){
var PFX="/api/proxy?url=";
function wrap(u){
  if(!u||u.startsWith("#")||u.startsWith("javascript:")||u.indexOf("/api/proxy")!==-1)return u;
  try{var a=new URL(u,document.baseURI).href;if(a.startsWith("http://")||a.startsWith("https://"))return PFX+encodeURIComponent(a);}catch(e){}
  return u;
}
document.addEventListener("click",function(e){
  var n=e.target;
  for(var i=0;i<6;i++){
    if(!n||n===document)break;
    if(n.tagName==="A"){
      var h=n.getAttribute("href");
      if(h&&!h.startsWith("#")&&!h.startsWith("javascript:")){var w=wrap(h);if(w!==h){e.preventDefault();e.stopPropagation();location.href=w;}}
      break;
    }
    n=n.parentElement;
  }
},true);
document.addEventListener("submit",function(e){
  var f=e.target;
  if(!f||!f.action)return;
  if((f.method||"get").toLowerCase()==="get"){var w=wrap(f.action);if(w!==f.action){e.preventDefault();location.href=w+"?"+new URLSearchParams(new FormData(f));}}
},true);
// Notify parent frame about current URL
function ping(){try{parent.postMessage({type:"proxy-url",url:location.href},"*");}catch(e){}}
window.addEventListener("load",ping);
})();
</script>`;

  const baseTag = `<base href="${baseUrl.replace(/"/g, "&quot;")}">`;
  return baseTag + interceptor + navScript;
}

/** Inject interceptors + base href into HTML */
function transformHtml(html: string, baseUrl: string): string {
  // Rewrite static attributes first
  const rewritten = rewriteHtml(html, baseUrl);
  const injection = buildInjection(baseUrl);

  // Replace existing <base> tag or insert after <head>
  if (/<base\s[^>]*href/i.test(rewritten)) {
    return rewritten.replace(/<base\s[^>]*>/i, injection);
  }
  const headMatch = rewritten.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return rewritten.slice(0, at) + injection + rewritten.slice(at);
  }
  return injection + rewritten;
}

router.get("/proxy", async (req: Request, res: ExpressResponse) => {
  const targetUrl = req.query["url"] as string;
  if (!targetUrl) { res.status(400).json({ error: "url parameter required" }); return; }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Only http/https URLs are supported" }); return;
    }
  } catch { res.status(400).json({ error: "Invalid URL" }); return; }

  if (!(await isSafeUrl(parsed))) { res.status(403).json({ error: "Target URL is not allowed" }); return; }

  const upstream: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: (req.headers["accept"] as string) || "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": (req.headers["accept-language"] as string) || "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
  };

  try {
    const { response, finalUrl } = await safeFetch(targetUrl, upstream, 20_000);

    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = contentType.includes("text/html");
    const isCss = contentType.includes("text/css");

    res.status(response.status);

    // Forward safe headers
    for (const [key, value] of response.headers.entries()) {
      const k = key.toLowerCase();
      if (!STRIP_HEADERS.has(k) && k !== "transfer-encoding" && k !== "content-encoding" && k !== "content-length") {
        try { res.setHeader(key, value); } catch {}
      }
    }

    // Always set permissive CORS so the browser and SW can read responses
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" }); return;
    }

    if (isHtml) {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const out = transformHtml(text, finalUrl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(Buffer.from(out));
    } else if (isCss) {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const out = rewriteCss(text, finalUrl);
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      res.end(Buffer.from(out));
    } else {
      res.end(Buffer.from(buffer));
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).send("Proxy error: " + msg);
  }
});

// Handle OPTIONS preflight
router.options("/proxy", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.sendStatus(204);
});

export default router;
