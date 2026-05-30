import { Router } from "express";
import type { Request, Response } from "express";

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

router.get("/proxy", async (req: Request, res: Response) => {
  const targetUrl = req.query["url"] as string;
  if (!targetUrl) {
    res.status(400).json({ error: "url parameter required" });
    return;
  }

  // Basic URL validation
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

  try {
    const response = await fetch(targetUrl, {
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
      signal: AbortSignal.timeout(20000),
    });

    res.status(response.status);

    // Forward all headers except those that break iframe embedding
    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // Always allow embedding
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const buffer = await response.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).send("Proxy error: " + msg);
  }
});

export default router;
