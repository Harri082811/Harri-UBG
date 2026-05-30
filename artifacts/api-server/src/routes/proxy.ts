import { Router } from "express";
import type { Request, Response } from "express";
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

/** Return true if the IPv4/IPv6 string is a private/internal/reserved address */
function isPrivateIp(ip: string): boolean {
  const addr = ip.replace(/^::ffff:/i, "");

  if (addr === "::1" || addr === "127.0.0.1" || addr.startsWith("127.")) return true;
  if (addr === "0.0.0.0" || addr === "::") return true;
  if (addr.startsWith("169.254.")) return true; // link-local / AWS metadata
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

/** Resolve hostname and reject if any resolved IP is private */
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
    return false; // DNS failure → unsafe
  }
  return true;
}

/** Validate a URL object: must be http/https and resolve to a public IP */
async function isSafeUrl(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return isSafeHost(url.hostname);
}

/**
 * Manually follow redirects so every hop is safety-checked.
 * Returns the final Response (without body consumed) or throws.
 */
async function safeFetch(
  startUrl: string,
  reqHeaders: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  let currentUrl = startUrl;
  let hops = 0;

  while (hops <= MAX_REDIRECTS) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new Error("Invalid redirect URL");
    }

    const safe = await isSafeUrl(parsed);
    if (!safe) throw new Error("Redirect target is not allowed");

    const response = await fetch(currentUrl, {
      method: "GET",
      headers: reqHeaders,
      redirect: "manual", // never let fetch follow redirects automatically
      signal: AbortSignal.timeout(timeoutMs),
    });

    const status = response.status;
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect with no Location header");
      // Resolve relative redirects
      currentUrl = new URL(location, currentUrl).toString();
      hops++;
      continue;
    }

    return response; // non-redirect final response
  }

  throw new Error("Too many redirects");
}

router.get("/proxy", async (req: Request, res: Response) => {
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

  // Initial SSRF check (redirect hops are also checked inside safeFetch)
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
    const response = await safeFetch(targetUrl, upstream, 15_000);

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" });
      return;
    }

    res.status(response.status);

    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // CORS: only allow the same Replit app origin, not open wildcard
    const appOrigin = process.env["APP_ORIGIN"] ?? "";
    const requestOrigin = req.headers["origin"] as string | undefined;
    if (appOrigin && requestOrigin === appOrigin) {
      res.setHeader("Access-Control-Allow-Origin", appOrigin);
      res.setHeader("Vary", "Origin");
    } else if (!appOrigin && requestOrigin) {
      // Dev fallback: same-origin only (service worker always matches)
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Vary", "Origin");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" });
      return;
    }
    res.end(Buffer.from(buffer));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).send("Proxy error: " + msg);
  }
});

export default router;
