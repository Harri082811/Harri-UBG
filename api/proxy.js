const ALLOWED_HOSTS = [
  "multiembed.mov",
  "player.videasy.net",
  "vidlink.pro",
  "www.2embed.cc",
  "2embed.cc",
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "Missing ?url=" });

  let parsed;
  try { parsed = new URL(target); } catch { return res.status(400).json({ error: "Bad URL" }); }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) return res.status(403).json({ error: "Blocked host" });

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: parsed.origin + "/",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const ct = upstream.headers.get("content-type") || "";
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (ct.includes("text/html")) {
      let html = await upstream.text();
      const proxy = "/api/proxy?url=";

      const rewriteUrl = (url) => {
        try {
          const u = new URL(url, parsed.origin);
          if (ALLOWED_HOSTS.includes(u.hostname)) {
            return proxy + encodeURIComponent(u.href);
          }
        } catch {}
        return url;
      };

      html = html.replace(/((?:src|href|poster|action)\s*=\s*["'])([^"'\s>]+)(["'])/gi,
        (m, pre, url, post) => {
          if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("javascript:")) return m;
          return pre + rewriteUrl(url) + post;
        });

      html = html.replace(/(url\s*\(\s*["']?)([^)"'\s]+)(["']?\s*\))/gi,
        (m, pre, url, post) => {
          if (url.startsWith("data:")) return m;
          return pre + rewriteUrl(url) + post;
        });

      html = html.replace(/(<head[^>]*>)/i, "$1\n<base href=\"" + parsed.origin + "/\">");

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    const buf = await upstream.arrayBuffer();
    return res.status(200).send(Buffer.from(buf));
  } catch (err) {
    return res.status(502).json({ error: String(err.message || err) });
  }
};
