import { Router } from "express";
import type { Request, Response as ExpressResponse } from "express";

const router = Router();

// Headers to strip from upstream responses (security/framing headers that block proxy use)
const STRIP_RES_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "permissions-policy",
  "strict-transport-security",
  "expect-ct",
  "nel",
  "report-to",
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "set-cookie", // cookies belong to target domain, not ours
]);

const MAX_RESPONSE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_REDIRECTS = 20;

/** Static-only safety check — no DNS lookup (DNS blocks CDN/API hosts in sandbox) */
function isSafeHost(host: string): boolean {
  const h = host.toLowerCase().trim();
  if (!h || h === "localhost") return false;
  if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".localhost")) return false;
  if (h === "metadata.google.internal" || h === "metadata.internal") return false;
  // Block numeric IPs that are private ranges
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 0) return false;
  }
  return true;
}

/** Read raw request body — handles already-parsed bodies (json/urlencoded) and raw streams */
async function readRequestBody(req: Request): Promise<Buffer | undefined> {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return undefined;

  // express.json() / express.urlencoded() may have already parsed it
  if (req.body !== undefined && req.body !== null) {
    const ct = (req.headers["content-type"] ?? "").toLowerCase();
    if (ct.includes("application/json")) return Buffer.from(JSON.stringify(req.body));
    if (ct.includes("application/x-www-form-urlencoded")) {
      return Buffer.from(
        Object.entries(req.body as Record<string, string>)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&")
      );
    }
    if (typeof req.body === "string") return Buffer.from(req.body);
    if (Buffer.isBuffer(req.body)) return req.body;
  }

  // Fall through: read raw stream (for content-types not parsed by express)
  return new Promise<Buffer>((resolve, reject) => {
    if ((req as any).readableEnded) { resolve(Buffer.alloc(0)); return; }
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Follow redirects manually so we can check each hop, supports any HTTP method */
async function safeFetch(
  startUrl: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | undefined,
  timeoutMs: number,
): Promise<{ response: globalThis.Response; finalUrl: string }> {
  let currentUrl = startUrl;
  let currentMethod = method;
  let currentBody = body;
  let hops = 0;
  const visited = new Set<string>(); // detect circular redirects

  while (hops <= MAX_REDIRECTS) {
    let parsed: URL;
    try { parsed = new URL(currentUrl); } catch { throw new Error("Invalid URL: " + currentUrl); }
    if (!isSafeHost(parsed.hostname)) throw new Error("Host not allowed: " + parsed.hostname);

    // Circular redirect detection
    if (visited.has(currentUrl)) throw new Error("Redirect loop detected");
    visited.add(currentUrl);

    const fetchOpts: RequestInit = {
      method: currentMethod,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (currentBody && ["POST", "PUT", "PATCH"].includes(currentMethod)) {
      fetchOpts.body = currentBody;
    }

    const response = await fetch(currentUrl, fetchOpts);
    const { status } = response;

    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, finalUrl: currentUrl }; // no Location → return as-is
      const nextUrl = new URL(location, currentUrl).toString();
      // If we'd loop, just return the current response
      if (visited.has(nextUrl)) return { response, finalUrl: currentUrl };
      currentUrl = nextUrl;
      // 301/302/303 redirect POST → GET (browser standard behavior)
      if ([301, 302, 303].includes(status) && currentMethod === "POST") {
        currentMethod = "GET";
        currentBody = undefined;
      }
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
  html = html.replace(/\b(src|href|action|poster|data)=(["'])([^"'<>\s]*)\2/gi, (m, attr, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `${attr}=${q}${p}${q}` : m;
  });
  html = html.replace(/\bsrcset=(["'])([^"'<>]*)\1/gi, (m, q, srcset) => {
    const rw = srcset.replace(/(https?:\/\/[^\s,]+)/gi, (u: string) => proxyUrl(u, base));
    return rw !== srcset ? `srcset=${q}${rw}${q}` : m;
  });
  html = html.replace(/\burl\((['"]?)(https?:\/\/[^)'"\s]+)\1\)/gi, (m, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `url(${q}${p}${q})` : m;
  });
  // Neutralize frame-busting: rewrite target="_top" / target="_parent" → target="_self"
  html = html.replace(/\btarget=(["'])(_top|_parent)\1/gi, `target=$1_self$1`);
  return html;
}

/** Rewrite CSS url() and @import — handles both absolute and relative paths */
function rewriteCss(css: string, base: string): string {
  // url("...") — all paths (absolute and relative)
  css = css.replace(/\burl\(\s*(["']?)([^)"'\s]+)\1\s*\)/gi, (m, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `url(${q}${p}${q})` : m;
  });
  // @import "..." or @import url(...)
  css = css.replace(/@import\s+(["'])([^"']+)\1/gi, (m, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `@import ${q}${p}${q}` : m;
  });
  return css;
}

/** Rewrite JS: dynamic import() and import-from with absolute URLs */
function rewriteJs(js: string, base: string): string {
  // dynamic: import("https://...")
  js = js.replace(/\bimport\s*\(\s*(["'])(https?:\/\/[^"'\s]+)\1\s*\)/g, (m, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `import(${q}${p}${q})` : m;
  });
  // static: import/export ... from "https://..."
  js = js.replace(/((?:import|export)[^"'\n]*from\s+)(["'])(https?:\/\/[^"'\s]+)\2/g, (m, prefix, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `${prefix}${q}${p}${q}` : m;
  });
  // importScripts("https://...") in service workers
  js = js.replace(/\bimportScripts\s*\((["'])(https?:\/\/[^"']+)\1\)/g, (m, q, url) => {
    const p = proxyUrl(url, base);
    return p !== url ? `importScripts(${q}${p}${q})` : m;
  });
  return js;
}

/** Build the interceptor scripts to inject into <head> — comprehensive navigation interception */
function buildInjection(baseUrl: string): string {
  const safeBase = baseUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `<script>
(function(){
var _b="${safeBase}";
var _real=_b;
var _px="/api/proxy?url=";
function _abs(u){
  try{return new URL(String(u),_real).href;}catch(e){return String(u);}
}
function _unproxy(u){
  try{
    var x=new URL(String(u),location.href);
    if(x.pathname.indexOf("/api/proxy")!==-1){
      var target=x.searchParams.get("url");
      if(target)return target;
    }
  }catch(e){}
  return String(u);
}
function _p(u){
  if(!u||typeof u!=="string")return u;
  if(u.startsWith("data:")||u.startsWith("blob:")||u.startsWith("javascript:")||u.startsWith("#")||u.startsWith("about:")||u.indexOf("/api/proxy")!==-1)return u;
  try{var a=_abs(u);if(a.startsWith("http://")||a.startsWith("https://"))return _px+encodeURIComponent(a);}catch(e){}
  return u;
}

/* === Network interception === */
function _log(m,u){try{parent.postMessage({type:"proxy-request",method:m,url:u},"*");}catch(e){}}
var _of=self.fetch;
self.fetch=function(inp,ini){
  var u=typeof inp==="string"?inp:(inp&&inp.url)||"";
  try{if(typeof inp==="string")inp=_p(inp);else if(inp&&typeof inp.url==="string")inp=new Request(_p(inp.url),inp);}catch(e){}
  _log((ini&&ini.method)||"GET",u);
  return _of.call(this,inp,ini);
};
var _ox=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(){
  var a=Array.prototype.slice.call(arguments);
  var u=a[1]||"";
  if(typeof a[1]==="string")a[1]=_p(a[1]);
  _log(a[0]||"GET",u);
  return _ox.apply(this,a);
};
try{if(navigator.sendBeacon){var _ob=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){_log("BEACON",u);return _ob(_p(u),d);};}}catch(e){}

/* === Navigation notify — lets parent update URL bar === */
function _nav(u){try{parent.postMessage({type:"proxy-navigate",url:u},"*");}catch(e){}}

/* === Location navigation interception === */
try{
  var _ld=Object.getOwnPropertyDescriptor(Location.prototype,"href");
  if(_ld&&_ld.set){
    Object.defineProperty(Location.prototype,"href",{
      get:_ld.get,
      set:function(u){var w=_p(String(u));_nav(w);_ld.set.call(this,w);},
      configurable:true
    });
  }
}catch(e){}
try{var _la=Location.prototype.assign;Location.prototype.assign=function(u){var w=_p(String(u));_nav(w);return _la.call(this,w);};}catch(e){}
try{var _lr=Location.prototype.replace;Location.prototype.replace=function(u){var w=_p(String(u));_nav(w);return _lr.call(this,w);};}catch(e){}
try{var _wo=window.open;window.open=function(u,n,f){if(u&&typeof u==="string")u=_p(u);return _wo.call(window,u,n,f);};}catch(e){}

/* === History API interception (SPA navigation: YouTube, TikTok, Twitter, etc.) === */
try{
  var _hps=history.pushState.bind(history);
  history.pushState=function(s,t,u){
    var a=u==null?_real:_abs(u);
    var w=_p(a);
    _real=a;
    _hps(s,t,w);
    try{_nav(w);}catch(e){}
  };
  var _hrs=history.replaceState.bind(history);
  history.replaceState=function(s,t,u){
    var a=u==null?_real:_abs(u);
    var w=_p(a);
    _real=a;
    _hrs(s,t,w);
    try{_nav(w);}catch(e){}
  };
  window.addEventListener('popstate',function(){try{_nav(location.href);}catch(e){}});
}catch(e){}

/* Notify parent of initial URL */
try{_nav(location.href);}catch(e){}

/* === Frame-busting neutralization === */
try{Object.defineProperty(window,"top",{get:function(){return window;},configurable:true});}catch(e){}
try{Object.defineProperty(window,"parent",{get:function(){return window;},configurable:true});}catch(e){}
try{Object.defineProperty(window,"frameElement",{get:function(){return null;},configurable:true});}catch(e){}

/* === Link and form interceptors === */
document.addEventListener("click",function(e){
  var n=e.target;
  for(var i=0;i<6;i++){
    if(!n||n===document)break;
    if(n.tagName==="A"){
      var h=n.getAttribute("href");
      if(h&&!h.startsWith("#")&&!h.startsWith("javascript:")&&h.indexOf("/api/proxy")===-1){
        var w=_p(h);if(w!==h){e.preventDefault();e.stopPropagation();location.href=w;}
      }
      break;
    }
    n=n.parentElement;
  }
},true);
document.addEventListener("submit",function(e){
  var f=e.target;if(!f||!f.action)return;
  if((f.method||"get").toLowerCase()==="get"){
    var a=_abs(_unproxy(f.action));
    var q=new URLSearchParams(new FormData(f)).toString();
    if(q)a+=(a.indexOf("?")===-1?"?":"&")+q;
    var w=_p(a);if(w!==a){e.preventDefault();location.href=w;}
  }
},true);
})();
</script>`;
}

/** Inject interceptors, stripping any existing <base> tags and meta CSP */
function transformHtml(html: string, baseUrl: string): string {
  // Strip <base> tags (they break root-relative proxy URLs)
  let rewritten = html.replace(/<base\b[^>]*>/gi, "");
  // Strip meta CSP tags (they block sub-resources even after we strip the header)
  rewritten = rewritten.replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*\/?>/gi, "");
  rewritten = rewritten.replace(/<meta[^>]+content-security-policy[^>]*\/?>/gi, "");
  // Strip meta-refresh redirects — these cause redirect loops when the page is proxied
  rewritten = rewritten.replace(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*\/?>/gi, "");
  // Rewrite inline <style> blocks
  rewritten = rewritten.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, css, close) => {
    return open + rewriteCss(css, baseUrl) + close;
  });
  // Rewrite style="" attributes
  rewritten = rewritten.replace(/\bstyle=(["'])([^"']*url\([^)]+\)[^"']*)\1/gi, (m, q, styleVal) => {
    const rw = rewriteCss(styleVal, baseUrl);
    return rw !== styleVal ? `style=${q}${rw}${q}` : m;
  });
  rewritten = rewriteHtml(rewritten, baseUrl);
  const injection = buildInjection(baseUrl);
  const headMatch = rewritten.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return rewritten.slice(0, at) + injection + rewritten.slice(at);
  }
  return injection + rewritten;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

// Handle OPTIONS preflight
router.options("/proxy", (_req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.sendStatus(204);
});

// Handle HEAD
router.head("/proxy", async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.sendStatus(204);
});

// Handle ALL methods
router.all("/proxy", async (req: Request, res: ExpressResponse) => {
  const targetUrl = req.query["url"] as string;
  if (!targetUrl) { res.status(400).json({ error: "url parameter required" }); return; }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Only http/https URLs are supported" }); return;
    }
  } catch { res.status(400).json({ error: "Invalid URL" }); return; }

  if (!isSafeHost(parsed.hostname)) {
    res.status(403).json({ error: "Host not allowed" }); return;
  }

  const method = req.method.toUpperCase() === "HEAD" ? "GET" : req.method.toUpperCase();

  // Build upstream request headers
  const upstream: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": (req.headers["accept"] as string) || "*/*",
    "Accept-Language": (req.headers["accept-language"] as string) || "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
  };

  // Forward content-type for POST/PUT/PATCH
  const ct = req.headers["content-type"];
  if (ct) upstream["Content-Type"] = ct as string;

  // Forward origin/referer so sites don't reject the request
  try {
    const origin = new URL(targetUrl).origin;
    upstream["Origin"] = origin;
    upstream["Referer"] = origin + "/";
  } catch {}

  try {
    const body = await readRequestBody(req);
    const { response, finalUrl } = await safeFetch(targetUrl, method, upstream, body, 25_000);

    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = contentType.includes("text/html");
    const isCss = contentType.includes("text/css");
    const isJs = contentType.includes("javascript") || contentType.includes("ecmascript");

    res.status(response.status);

    // Forward safe headers
    for (const [key, value] of response.headers.entries()) {
      const k = key.toLowerCase();
      if (!STRIP_RES_HEADERS.has(k)) {
        try { res.setHeader(key, value); } catch {}
      }
    }

    // Set permissive CORS
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    // For redirects with no body
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location");
      if (loc) {
        try {
          const abs = new URL(loc, finalUrl).href;
          res.setHeader("Location", `/api/proxy?url=${encodeURIComponent(abs)}`);
        } catch {}
      }
      res.end(); return;
    }

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
    } else if (isJs) {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const out = rewriteJs(text, finalUrl);
      res.end(Buffer.from(out));
    } else {
      res.end(Buffer.from(buffer));
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!res.headersSent) {
      const targetUrl = req.query["url"] as string ?? "";
      const errHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Proxy Error</title>
<style>body{font-family:system-ui,sans-serif;background:#0f0f15;color:#ccc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{max-width:480px;padding:32px;background:#1a1a24;border-radius:12px;border:1px solid #333}
h2{color:#f87171;margin:0 0 12px}p{margin:0 0 8px;line-height:1.5}
.url{word-break:break-all;color:#888;font-size:13px;background:#111;padding:8px 12px;border-radius:6px;margin-top:16px}
.retry{display:inline-block;margin-top:20px;padding:10px 20px;background:#22d3ee;color:#000;border-radius:8px;text-decoration:none;font-weight:600;cursor:pointer}
</style></head><body><div class="box">
<h2>Could not load this page</h2>
<p>${msg.includes("redirect") ? "This site uses too many redirects (often because it requires login cookies we can't forward). Try opening it in the About:blank mode from Settings." : msg.includes("timed out") || msg.includes("timeout") ? "The request timed out. The site may be slow or blocking proxy connections." : "The proxy could not reach this page. The site may block external access."}</p>
<div class="url">${targetUrl.replace(/</g, "&lt;")}</div>
<a class="retry" onclick="history.back()">← Go Back</a>
</div></body></html>`;
      res.status(502).setHeader("Content-Type", "text/html; charset=utf-8").end(errHtml);
    }
  }
});

export default router;
