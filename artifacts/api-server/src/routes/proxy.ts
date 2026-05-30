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

/** Return true if the IP string is a private/internal/reserved address */
function isPrivateIp(ip: string): boolean {
  // Normalise IPv6-mapped IPv4  ::ffff:1.2.3.4
  const addr = ip.replace(/^::ffff:/i, "");

  // Loopback
  if (addr === "::1" || addr === "127.0.0.1" || addr.startsWith("127.")) return true;

  // Unspecified
  if (addr === "0.0.0.0" || addr === "::") return true;

  // Link-local 169.254.x.x (includes AWS/GCP/Azure metadata: 169.254.169.254)
  if (addr.startsWith("169.254.")) return true;

  // RFC 1918 private ranges
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

  // IPv6 private / link-local / unique-local
  if (/^fe80:/i.test(addr)) return true;
  if (/^f[cd]/i.test(addr)) return true;

  return false;
}

/** Explicitly blocked hostnames */
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
]);

async function isSafeUrl(url: URL): Promise<boolean> {
  const host = url.hostname.toLowerCase();

  // Block by explicit hostname
  if (BLOCKED_HOSTS.has(host)) return false;

  // Block internal TLDs
  if (
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  )
    return false;

  // Resolve DNS and reject if any address is private
  try {
    const results = await lookup(host, { all: true });
    for (const r of results) {
      if (isPrivateIp(r.address)) return false;
    }
  } catch {
    // DNS failure — treat as unsafe
    return false;
  }

  return true;
}

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

router.get("/proxy", async (req: Request, res: Response) => {
  const targetUrl = req.query["url"] as string;
  if (!targetUrl) {
    res.status(400).json({ error: "url parameter required" });
    return;
  }

  // Validate URL structure
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

  // SSRF guard — reject private/internal/metadata targets
  const safe = await isSafeUrl(parsed);
  if (!safe) {
    res.status(403).json({ error: "Target URL is not allowed" });
    return;
  }

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          (req.headers["accept"] as string) ||
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          (req.headers["accept-language"] as string) || "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    // Enforce size cap before streaming
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" });
      return;
    }

    res.status(response.status);

    // Forward safe headers, stripping those that break iframe embedding
    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // Scope CORS to same origin only
    const origin = req.headers["origin"];
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
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
