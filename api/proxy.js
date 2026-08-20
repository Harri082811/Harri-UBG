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
  if (!target) return res.status(400).json({ error: "Missing ?url= parameter" });

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return res.status(403).json({ error: "Host not allowed" });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: parsed.origin + "/",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-cache");

    if (contentType.includes("text/html")) {
      let html = await upstream.text();
      const origin = parsed.origin;

      html = html.replace(
        /((?:src|href|action)\s*=\s*["'])(https?:\/\/)/gi,
        (match, prefix, proto) => {
          return prefix;
        },
      );

      const proxyPrefix =
        (req.headers["x-forwarded-proto"] || "https") +
        "://" +
        req.headers.host +
        "/api/proxy?url=";

      html = html.replace(
        /((?:src|href|action)\s*=\s*["'])((?:https?:\/\/)[^"'\s>]+)(["'])/gi,
        (match, pre, url, post) => {
          try {
            const u = new URL(url);
            if (ALLOWED_HOSTS.includes(u.hostname)) {
              return pre + proxyPrefix + encodeURIComponent(url) + post;
            }
          } catch {}
          return match;
        },
      );

      html = html.replace(
        /((?:src|href|action)\s*=\s*["'])(\/[^"'\s>]+)(["'])/gi,
        (match, pre, path, post) => {
          return pre + proxyPrefix + encodeURIComponent(origin + path) + post;
        },
      );

      html = html.replace(
        /(url\s*\(\s*["']?)(https?:\/\/[^)"'\s]+)(["']?\s*\))/gi,
        (match, pre, url, post) => {
          try {
            const u = new URL(url);
            if (ALLOWED_HOSTS.includes(u.hostname)) {
              return pre + proxyPrefix + encodeURIComponent(url) + post;
            }
          } catch {}
          return match;
        },
      );

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    const buffer = await upstream.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    return res.status(502).json({ error: "Upstream fetch failed", detail: String(err) });
  }
};
