import { Router } from "express";

const router = Router();

const STRIP_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "x-content-type-options",
  "strict-transport-security",
  "transfer-encoding",
  "connection",
  "keep-alive",
]);

router.get("/proxy", async (req, res) => {
  const raw = req.query.url as string | undefined;
  if (!raw) { res.status(400).send("Missing url"); return; }

  let targetUrl: string;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") { res.status(400).send("Bad protocol"); return; }
    targetUrl = u.toString();
  } catch {
    res.status(400).send("Invalid url"); return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") ?? "text/html";

    for (const [key, val] of upstream.headers.entries()) {
      if (STRIP_HEADERS.has(key.toLowerCase())) continue;
      if (key.toLowerCase() === "content-security-policy") continue;
      res.setHeader(key, val);
    }
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status);

    if (contentType.includes("text/html")) {
      let html = await upstream.text();
      const baseTag = `<base href="${targetUrl}" />`;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
      } else {
        html = baseTag + html;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.send(buf);
    }
  } catch (err: unknown) {
    req.log.error({ err }, "proxy fetch failed");
    res.status(502).send("Proxy error");
  }
});

export default router;
