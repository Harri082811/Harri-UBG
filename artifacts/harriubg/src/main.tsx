import "./styles.css";

/* ============================================================
   harriubg — vanilla TypeScript app
   ============================================================ */

type Tab = "home" | "games" | "movies" | "settings";

type Game = {
  id: number;
  name: string;
  cover: string;
  url: string;
  multiFile: boolean;
  author?: string;
  authorLink?: string;
};

type Movie = {
  id: number;
  title: string;
  year: number;
  genre: string;
  poster?: string;
};

type Settings = {
  theme: "cosmic" | "aurora" | "sunset" | "midnight";
  cloakTitle: string;
  cloakIcon: string;
  aboutBlank: boolean;
  autoplay: boolean;
  server: string;
};

const DEFAULT_SETTINGS: Settings = {
  theme: "cosmic",
  cloakTitle: "",
  cloakIcon: "",
  aboutBlank: false,
  autoplay: true,
  server: "vidsrc.cc",
};

const STORAGE_KEY = "harriubg.settings.v2";
const POSTERS_CACHE_KEY = "harriubg.posters.v1";

/* ----- settings persistence ---------- */
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: Settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

let settings = loadSettings();

/* ============================================================
   GAMES — fetched from gn-math (covers + html) with multi-file
   fallback to harriwalk0/assets for Unity/Flash games.
   ============================================================ */

// IDs that have a richer multi-file build in harriwalk0/assets/<id>/index.html
const MULTI_FILE_IDS = new Set<number>([
  113, 116, 118, 120, 121, 122, 123, 124, 129, 165, 198, 199, 200, 255, 256,
  258, 260, 294, 296, 302, 306, 307, 308, 309, 310, 311, 315, 317, 318, 330,
  346, 347, 352, 434, 441, 442, 447,
]);

const HARRI_BASE   = "https://cdn.jsdelivr.net/gh/harriwalk0/assets@main";
const COVERS_BASE  = "https://raw.githubusercontent.com/gn-math/covers/main";
const GAMES_BASE   = "https://raw.githubusercontent.com/gn-math/html/main";
const ZONES_URL    = "https://raw.githubusercontent.com/harriwalk0/assets/main/zones.json";

let GAMES: Game[] = [];
let MOVIES: Movie[] = [];

async function loadGames(): Promise<void> {
  try {
    const res = await fetch(ZONES_URL, { cache: "force-cache" });
    if (!res.ok) throw new Error("zones.json fetch failed");
    const zones = (await res.json()) as Array<{
      id: number;
      name: string;
      cover: string;
      url: string;
      author?: string;
      authorLink?: string;
    }>;

    GAMES = zones
      .filter((g) => g.id >= 0 && !/^\[/.test(g.name))
      .map((g) => {
        const isMulti = MULTI_FILE_IDS.has(g.id);
        // single-file game URLs come from {HTML_URL}/<filename>.html
        const fileMatch = g.url.match(/\{HTML_URL\}\/(.+)$/);
        const fname = fileMatch ? fileMatch[1] : `${g.id}.html`;
        return {
          id: g.id,
          name: g.name,
          cover: `${COVERS_BASE}/${g.id}.png`,
          url: isMulti
            ? `${HARRI_BASE}/${g.id}/index.html`
            : `${GAMES_BASE}/${fname}`,
          multiFile: isMulti,
          author: g.author,
          authorLink: g.authorLink,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error(err);
    showToast("Couldn't load games. Check your connection.");
    GAMES = [];
  }
}

/* ============================================================
   MOVIES — curated list, real posters fetched from TMDB at boot
   ============================================================ */

const MOVIE_LIST: Movie[] = [
  // Sci-fi & action blockbusters
  { id: 27205,  title: "Inception",                        year: 2010, genre: "Sci-Fi · Thriller" },
  { id: 157336, title: "Interstellar",                     year: 2014, genre: "Sci-Fi · Drama" },
  { id: 155,    title: "The Dark Knight",                  year: 2008, genre: "Action · Crime" },
  { id: 603,    title: "The Matrix",                       year: 1999, genre: "Sci-Fi · Action" },
  { id: 604,    title: "The Matrix Reloaded",              year: 2003, genre: "Sci-Fi · Action" },
  { id: 605,    title: "The Matrix Revolutions",           year: 2003, genre: "Sci-Fi · Action" },
  { id: 19995,  title: "Avatar",                           year: 2009, genre: "Sci-Fi · Adventure" },
  { id: 76600,  title: "Avatar: The Way of Water",         year: 2022, genre: "Sci-Fi · Adventure" },
  { id: 438631, title: "Dune",                             year: 2021, genre: "Sci-Fi · Adventure" },
  { id: 693134, title: "Dune: Part Two",                   year: 2024, genre: "Sci-Fi · Adventure" },
  { id: 872585, title: "Oppenheimer",                      year: 2023, genre: "Drama · History" },
  { id: 76341,  title: "Mad Max: Fury Road",               year: 2015, genre: "Action · Adventure" },
  { id: 49047,  title: "Gravity",                          year: 2013, genre: "Sci-Fi · Drama" },
  { id: 286217, title: "The Martian",                      year: 2015, genre: "Sci-Fi · Adventure" },
  { id: 335984, title: "Blade Runner 2049",                year: 2017, genre: "Sci-Fi · Drama" },
  { id: 78,     title: "Blade Runner",                     year: 1982, genre: "Sci-Fi · Noir" },

  // Marvel
  { id: 1726,   title: "Iron Man",                         year: 2008, genre: "Action · Sci-Fi" },
  { id: 24428,  title: "The Avengers",                     year: 2012, genre: "Action · Sci-Fi" },
  { id: 99861,  title: "Avengers: Age of Ultron",          year: 2015, genre: "Action · Sci-Fi" },
  { id: 299536, title: "Avengers: Infinity War",           year: 2018, genre: "Action · Sci-Fi" },
  { id: 299534, title: "Avengers: Endgame",                year: 2019, genre: "Action · Sci-Fi" },
  { id: 634649, title: "Spider-Man: No Way Home",          year: 2021, genre: "Action · Adventure" },
  { id: 569094, title: "Spider-Man: Across the Spider-Verse", year: 2023, genre: "Animation · Adventure" },
  { id: 324857, title: "Spider-Man: Into the Spider-Verse",   year: 2018, genre: "Animation · Adventure" },
  { id: 284054, title: "Black Panther",                    year: 2018, genre: "Action · Adventure" },
  { id: 284052, title: "Doctor Strange",                   year: 2016, genre: "Action · Fantasy" },
  { id: 118340, title: "Guardians of the Galaxy",          year: 2014, genre: "Action · Sci-Fi" },
  { id: 284053, title: "Thor: Ragnarok",                   year: 2017, genre: "Action · Comedy" },

  // DC / Batman
  { id: 414906, title: "The Batman",                       year: 2022, genre: "Crime · Mystery" },
  { id: 49026,  title: "The Dark Knight Rises",            year: 2012, genre: "Action · Crime" },
  { id: 272,    title: "Batman Begins",                    year: 2005, genre: "Action · Crime" },
  { id: 475557, title: "Joker",                            year: 2019, genre: "Crime · Drama" },

  // Action / thriller franchises
  { id: 245891, title: "John Wick",                        year: 2014, genre: "Action · Thriller" },
  { id: 603692, title: "John Wick: Chapter 4",             year: 2023, genre: "Action · Thriller" },
  { id: 361743, title: "Top Gun: Maverick",                year: 2022, genre: "Action · Drama" },
  { id: 575264, title: "Mission: Impossible — Dead Reckoning", year: 2023, genre: "Action · Thriller" },
  { id: 870028, title: "The Beekeeper",                    year: 2024, genre: "Action · Thriller" },
  { id: 940721, title: "Godzilla Minus One",               year: 2023, genre: "Action · Sci-Fi" },

  // Drama / classics
  { id: 278,    title: "The Shawshank Redemption",         year: 1994, genre: "Drama · Crime" },
  { id: 238,    title: "The Godfather",                    year: 1972, genre: "Crime · Drama" },
  { id: 240,    title: "The Godfather Part II",            year: 1974, genre: "Crime · Drama" },
  { id: 680,    title: "Pulp Fiction",                     year: 1994, genre: "Crime · Drama" },
  { id: 550,    title: "Fight Club",                       year: 1999, genre: "Drama · Thriller" },
  { id: 13,     title: "Forrest Gump",                     year: 1994, genre: "Drama · Romance" },
  { id: 769,    title: "Goodfellas",                       year: 1990, genre: "Crime · Drama" },
  { id: 1422,   title: "The Departed",                     year: 2006, genre: "Crime · Drama" },
  { id: 597,    title: "Titanic",                          year: 1997, genre: "Romance · Drama" },
  { id: 496243, title: "Parasite",                         year: 2019, genre: "Thriller · Drama" },
  { id: 545611, title: "Everything Everywhere All at Once",year: 2022, genre: "Sci-Fi · Comedy" },
  { id: 1124,   title: "The Prestige",                     year: 2006, genre: "Mystery · Drama" },
  { id: 73,     title: "American History X",               year: 1998, genre: "Drama · Crime" },

  // Fantasy / adventure
  { id: 120,    title: "LOTR: The Fellowship of the Ring", year: 2001, genre: "Fantasy · Adventure" },
  { id: 121,    title: "LOTR: The Two Towers",             year: 2002, genre: "Fantasy · Adventure" },
  { id: 122,    title: "LOTR: The Return of the King",     year: 2003, genre: "Fantasy · Adventure" },
  { id: 671,    title: "Harry Potter and the Sorcerer's Stone",   year: 2001, genre: "Fantasy · Family" },
  { id: 672,    title: "Harry Potter and the Chamber of Secrets", year: 2002, genre: "Fantasy · Family" },
  { id: 673,    title: "Harry Potter and the Prisoner of Azkaban",year: 2004, genre: "Fantasy · Family" },
  { id: 11,     title: "Star Wars: A New Hope",            year: 1977, genre: "Sci-Fi · Adventure" },
  { id: 1891,   title: "The Empire Strikes Back",          year: 1980, genre: "Sci-Fi · Adventure" },
  { id: 105,    title: "Back to the Future",               year: 1985, genre: "Sci-Fi · Comedy" },
  { id: 165,    title: "Back to the Future Part II",       year: 1989, genre: "Sci-Fi · Comedy" },
  { id: 18785,  title: "The Hunger Games",                 year: 2012, genre: "Sci-Fi · Adventure" },

  // Animation
  { id: 8587,   title: "The Lion King",                    year: 1994, genre: "Animation · Family" },
  { id: 12,     title: "Finding Nemo",                     year: 2003, genre: "Animation · Family" },
  { id: 14160,  title: "Up",                               year: 2009, genre: "Animation · Family" },
  { id: 9806,   title: "The Incredibles",                  year: 2004, genre: "Animation · Family" },
  { id: 260514, title: "Incredibles 2",                    year: 2018, genre: "Animation · Family" },
  { id: 354912, title: "Coco",                             year: 2017, genre: "Animation · Family" },
  { id: 508442, title: "Soul",                             year: 2020, genre: "Animation · Drama" },
  { id: 10681,  title: "WALL·E",                           year: 2008, genre: "Animation · Sci-Fi" },
  { id: 109445, title: "Frozen",                           year: 2013, genre: "Animation · Family" },
  { id: 129,    title: "Spirited Away",                    year: 2001, genre: "Animation · Fantasy" },
  { id: 372058, title: "Your Name.",                       year: 2016, genre: "Animation · Romance" },
  { id: 568160, title: "Klaus",                            year: 2019, genre: "Animation · Family" },

  // Comedy / 2023+ hits
  { id: 346698, title: "Barbie",                           year: 2023, genre: "Comedy · Fantasy" },
  { id: 1011985,title: "Kung Fu Panda 4",                  year: 2024, genre: "Animation · Comedy" },
  { id: 359410, title: "Road House",                       year: 2024, genre: "Action · Thriller" },
  { id: 1022789,title: "Inside Out 2",                     year: 2024, genre: "Animation · Family" },
  { id: 533535, title: "Deadpool & Wolverine",             year: 2024, genre: "Action · Comedy" },
  { id: 519182, title: "Despicable Me 4",                  year: 2024, genre: "Animation · Comedy" },
  { id: 823464, title: "Godzilla x Kong: The New Empire",  year: 2024, genre: "Action · Sci-Fi" },
];

MOVIES = MOVIE_LIST;

const TMDB_KEY = "8265bd1679663a7ea12ac168da84d2e8";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

function loadPostersCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(POSTERS_CACHE_KEY) || "{}"); }
  catch { return {}; }
}
function savePostersCache(c: Record<string, string>) {
  try { localStorage.setItem(POSTERS_CACHE_KEY, JSON.stringify(c)); } catch {}
}

async function loadPosters(): Promise<void> {
  const cache = loadPostersCache();
  // hydrate immediately from cache
  for (const m of MOVIES) {
    if (cache[m.id]) m.poster = `${TMDB_IMG}${cache[m.id]}`;
  }
  // fetch missing posters in parallel (no rate-limit issues for ~36 calls)
  const missing = MOVIES.filter((m) => !cache[m.id]);
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (m) => {
      try {
        const r = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${TMDB_KEY}`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.poster_path) {
          cache[m.id] = d.poster_path;
          m.poster = `${TMDB_IMG}${d.poster_path}`;
        }
      } catch { /* ignore */ }
    })
  );
  savePostersCache(cache);
}

/* ============================================================
   Embed URL builders (cineby uses similar providers under the hood)
   ============================================================ */

function buildEmbedUrl(movieId: number, server: string): string {
  switch (server) {
    case "vidsrc.cc":   return `https://vidsrc.cc/v2/embed/movie/${movieId}`;
    case "vidsrc.xyz":  return `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`;
    case "embed.su":    return `https://embed.su/embed/movie/${movieId}`;
    case "vidlink.pro": return `https://vidlink.pro/movie/${movieId}?primaryColor=22d3ee&secondaryColor=a78bfa&iconColor=ffffff&autoplay=false`;
    case "2embed.cc":   return `https://www.2embed.cc/embed/${movieId}`;
    default:            return `https://vidsrc.cc/v2/embed/movie/${movieId}`;
  }
}

/* ----- blob-URL cloaking ----------
   Wrapping the real iframe inside a blob URL hides the source URL from
   network-level filters that scan page HTML. The iframe's src appears as
   `blob:...` instead of revealing the game / streaming provider. */

const activeBlobs = new Set<string>();

function revokeBlobs() {
  activeBlobs.forEach((u) => URL.revokeObjectURL(u));
  activeBlobs.clear();
}

function makeBlobUrl(html: string): string {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  activeBlobs.add(url);
  return url;
}

/** Wrap a third-party URL in a tiny blob page so the iframe src is `blob:...`. */
function cloakUrl(url: string, title: string): string {
  const safeUrl = url.replace(/"/g, "&quot;");
  const safeTitle = escapeHtml(title);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:0;background:#000;overflow:hidden}</style>
</head><body>
<iframe src="${safeUrl}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write; gamepad" allowfullscreen referrerpolicy="no-referrer"></iframe>
</body></html>`;
  return makeBlobUrl(html);
}

/** Fetch a game's HTML, normalize its <base href>, and serve via blob URL. */
async function cloakGameHtml(g: Game): Promise<string> {
  try {
    const res = await fetch(g.url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`fetch ${g.url} -> ${res.status}`);
    let html = await res.text();
    // For multi-file games hosted on harriwalk0/assets, the embedded base href
    // points at a 403'd fork — rewrite it to the working CDN.
    if (g.multiFile) {
      const goodBase = `${HARRI_BASE}/${g.id}/`;
      if (/<base\s[^>]*href=/i.test(html)) {
        html = html.replace(/<base\s[^>]*href=["'][^"']*["'][^>]*>/i, `<base href="${goodBase}">`);
      } else {
        html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${goodBase}">`);
      }
    }
    // Single-file games already have a working <base href> baked in (e.g.
    // bubbls/youtube-playables, freebuisness/assets, etc).
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(g.name)}</title>`);
    return makeBlobUrl(html);
  } catch (err) {
    console.error(err);
    return cloakUrl(g.url, g.name);
  }
}

const SERVERS: Array<{ id: string; label: string }> = [
  { id: "vidsrc.cc",   label: "Server 1" },
  { id: "vidsrc.xyz",  label: "Server 2" },
  { id: "embed.su",    label: "Server 3" },
  { id: "vidlink.pro", label: "Server 4" },
  { id: "2embed.cc",   label: "Server 5" },
];

/* ============================================================
   Constellation background — always on, sensible defaults
   ============================================================ */

type Star = { x: number; y: number; vx: number; vy: number; r: number };

const STAR_DENSITY = 160;
const STAR_SPEED = 1.0;     // multiplier
const LINK_DIST = 130;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let stars: Star[] = [];
let rafId = 0;

function rebuildStars() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

  stars = new Array(STAR_DENSITY).fill(0).map(() => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    r: Math.random() * 1.4 + 0.4,
  }));
}

function tick() {
  if (!ctx || !canvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  const starColor = getCssVar("--star") || "200, 220, 255";

  for (const s of stars) {
    s.x += s.vx * STAR_SPEED;
    s.y += s.vy * STAR_SPEED;
    if (s.x < 0) s.x += w;
    if (s.x > w) s.x -= w;
    if (s.y < 0) s.y += h;
    if (s.y > h) s.y -= h;

    ctx.beginPath();
    ctx.fillStyle = `rgba(${starColor}, ${0.55 + s.r * 0.25})`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = `rgba(${starColor}, 0.6)`;
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i], b = stars[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < LINK_DIST) {
        const alpha = (1 - d / LINK_DIST) * 0.18;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${starColor}, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  rafId = requestAnimationFrame(tick);
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function initConstellation() {
  canvas = document.getElementById("constellation") as HTMLCanvasElement;
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  rebuildStars();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);

  window.addEventListener("resize", rebuildStars);
}

/* ============================================================
   Tabs
   ============================================================ */

function setTab(tab: Tab) {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll<HTMLElement>(".view").forEach((v) => {
    v.classList.toggle("active", v.id === `view-${tab}`);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#${tab}`);
}

function initTabs() {
  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      setTab(btn.dataset.tab as Tab);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.go as Tab));
  });

  const initial = (location.hash.replace("#", "") || "home") as Tab;
  if (["home", "games", "movies", "settings"].includes(initial)) setTab(initial);
}

/* ============================================================
   Card rendering — cover image with gradient fallback on error
   ============================================================ */

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 60 + (h >> 8) % 80) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 70% 55%), hsl(${hue2} 75% 45%))`;
}

function buildCard(opts: {
  title: string;
  sub: string;
  cover?: string;
  onClick: () => void;
}): HTMLElement {
  const tile = document.createElement("button");
  tile.className = "card-tile";
  tile.type = "button";

  const grad = gradientFor(opts.title);
  const safeTitle = escapeHtml(opts.title);
  const safeSub = escapeHtml(opts.sub);

  if (opts.cover) {
    tile.innerHTML = `
      <div class="card-cover" data-fallback="${escapeAttr(grad)}" data-name="${safeTitle}">
        <img src="${escapeAttr(opts.cover)}" alt="${safeTitle}" loading="lazy" />
      </div>
      <div class="play-overlay"><div class="play-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div></div>
      <div class="card-meta">
        <div class="card-title">${safeTitle}</div>
        <div class="card-sub">${safeSub}</div>
      </div>`;
    const img = tile.querySelector("img")!;
    const cover = tile.querySelector(".card-cover") as HTMLElement;
    img.addEventListener("error", () => {
      cover.classList.add("placeholder");
      cover.style.background = grad;
      cover.innerHTML = `<span>${safeTitle}</span>`;
    });
  } else {
    tile.innerHTML = `
      <div class="card-cover placeholder" style="background:${grad}"><span>${safeTitle}</span></div>
      <div class="play-overlay"><div class="play-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div></div>
      <div class="card-meta">
        <div class="card-title">${safeTitle}</div>
        <div class="card-sub">${safeSub}</div>
      </div>`;
  }
  tile.addEventListener("click", opts.onClick);
  return tile;
}

function gameCard(g: Game): HTMLElement {
  return buildCard({
    title: g.name,
    sub: g.author || "Unknown studio",
    cover: g.cover,
    onClick: () => openGame(g),
  });
}

function movieCard(m: Movie): HTMLElement {
  return buildCard({
    title: m.title,
    sub: `${m.year} · ${m.genre}`,
    cover: m.poster,
    onClick: () => openMovie(m),
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/`/g, "&#96;");
}

/* ============================================================
   Page renderers
   ============================================================ */

function renderFeatured() {
  const fGames = document.getElementById("featured-games")!;
  const fMovies = document.getElementById("featured-movies")!;

  fGames.innerHTML = "";
  if (GAMES.length === 0) {
    for (let i = 0; i < 8; i++) {
      const sk = document.createElement("div");
      sk.className = "card-tile skeleton";
      sk.innerHTML = `<div class="card-cover"></div><div class="card-meta"><div class="card-title">&nbsp;</div><div class="card-sub">&nbsp;</div></div>`;
      fGames.appendChild(sk);
    }
  } else {
    pickRandom(GAMES, 12).forEach((g) => fGames.appendChild(gameCard(g)));
  }

  fMovies.innerHTML = "";
  pickRandom(MOVIES, 12).forEach((m) => fMovies.appendChild(movieCard(m)));
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

function renderGames(query = "") {
  const grid = document.getElementById("games-grid")!;
  const empty = document.getElementById("games-empty")!;
  grid.innerHTML = "";
  const q = query.trim().toLowerCase();

  if (GAMES.length === 0) {
    for (let i = 0; i < 24; i++) {
      const sk = document.createElement("div");
      sk.className = "card-tile skeleton";
      sk.innerHTML = `<div class="card-cover"></div><div class="card-meta"><div class="card-title">&nbsp;</div><div class="card-sub">&nbsp;</div></div>`;
      grid.appendChild(sk);
    }
    empty.hidden = true;
    return;
  }

  const filtered = q
    ? GAMES.filter((g) => g.name.toLowerCase().includes(q))
    : GAMES;

  empty.hidden = filtered.length > 0;
  filtered.forEach((g) => grid.appendChild(gameCard(g)));
}

function renderMovies(query = "") {
  const grid = document.getElementById("movies-grid")!;
  const empty = document.getElementById("movies-empty")!;
  grid.innerHTML = "";
  const q = query.trim().toLowerCase();
  const filtered = q
    ? MOVIES.filter((m) => m.title.toLowerCase().includes(q))
    : MOVIES;
  empty.hidden = filtered.length > 0;
  filtered.forEach((m) => grid.appendChild(movieCard(m)));
}

function renderStats() {
  document.getElementById("stat-games")!.textContent = GAMES.length > 0 ? String(GAMES.length) : "…";
  document.getElementById("stat-movies")!.textContent = String(MOVIES.length);
}

/* ============================================================
   Modal player
   ============================================================ */

let activeMovie: Movie | null = null;

function openModal() {
  const m = document.getElementById("modal")!;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  setLoading(true);
}

function setLoading(on: boolean) {
  const overlay = document.getElementById("modal-loading")!;
  overlay.hidden = !on;
}

function closeModal() {
  const m = document.getElementById("modal")!;
  const f = document.getElementById("modal-frame") as HTMLIFrameElement;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  f.src = "about:blank";
  m.hidden = true;
  document.body.style.overflow = "";
  activeMovie = null;
  const sr = document.getElementById("server-row")!;
  sr.hidden = true;
  sr.innerHTML = "";
  setLoading(false);
  setTimeout(revokeBlobs, 500);
}

async function openGame(g: Game) {
  document.getElementById("modal-kind")!.textContent = "Game";
  document.getElementById("modal-title")!.textContent = g.name;
  (document.getElementById("server-row") as HTMLElement).hidden = true;
  activeMovie = null;
  openModal();

  const f = document.getElementById("modal-frame") as HTMLIFrameElement;
  f.src = "about:blank";
  const blobUrl = await cloakGameHtml(g);

  if (settings.aboutBlank) {
    openInAboutBlank(blobUrl, g.name);
    closeModal();
    return;
  }

  f.onload = () => setLoading(false);
  f.src = blobUrl;
}

function openMovie(m: Movie) {
  activeMovie = m;
  document.getElementById("modal-kind")!.textContent = `Movie · ${m.year}`;
  document.getElementById("modal-title")!.textContent = m.title;

  const realUrl = buildEmbedUrl(m.id, settings.server);
  const blobUrl = cloakUrl(realUrl, m.title);

  if (settings.aboutBlank) {
    openInAboutBlank(blobUrl, m.title);
    return;
  }

  openModal();
  const f = document.getElementById("modal-frame") as HTMLIFrameElement;
  f.onload = () => setLoading(false);
  f.src = blobUrl;

  const sr = document.getElementById("server-row")!;
  sr.innerHTML = "";
  SERVERS.forEach((s) => {
    const b = document.createElement("button");
    b.className = "server-btn" + (s.id === settings.server ? " active" : "");
    b.textContent = s.label;
    b.addEventListener("click", () => {
      sr.querySelectorAll(".server-btn").forEach((el) => el.classList.remove("active"));
      b.classList.add("active");
      setLoading(true);
      const newUrl = buildEmbedUrl(m.id, s.id);
      f.src = cloakUrl(newUrl, m.title);
    });
    sr.appendChild(b);
  });
  sr.hidden = false;
}

function openInAboutBlank(url: string, title: string) {
  try {
    const win = window.open("about:blank", "_blank");
    if (!win) {
      showToast("Pop-up blocked. Allow pop-ups for this site.");
      return;
    }
    win.document.title = title;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:0;background:#000;overflow:hidden}</style></head><body><iframe src="${escapeAttr(url)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write; gamepad" allowfullscreen referrerpolicy="no-referrer"></iframe></body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch {
    showToast("Couldn't open in about:blank.");
  }
}

async function goFullscreen() {
  const shell = document.querySelector(".modal-shell") as HTMLElement;
  const frame = document.getElementById("modal-frame") as HTMLIFrameElement;
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch {}
    return;
  }
  try {
    await (frame.requestFullscreen?.() ?? Promise.reject());
    return;
  } catch {}
  try {
    await shell?.requestFullscreen?.();
  } catch {
    showToast("Fullscreen isn't available.");
  }
}

function initModal() {
  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.fullscreenElement) closeModal();
  });
  document.getElementById("modal-fullscreen")!.addEventListener("click", goFullscreen);
  document.getElementById("modal-newtab")!.addEventListener("click", () => {
    const f = document.getElementById("modal-frame") as HTMLIFrameElement;
    if (!f.src || f.src === "about:blank") return;
    window.open(f.src, "_blank", "noopener");
  });
}

/* ============================================================
   Settings UI
   ============================================================ */

function applyTheme() {
  document.documentElement.dataset.theme = settings.theme;
  document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.theme === settings.theme);
  });
}

function applyCloak() {
  document.title = settings.cloakTitle?.trim() || "harriubg — unblocked games & movies";
  const fav = document.getElementById("favicon") as HTMLLinkElement | null;
  if (!fav) return;
  if (settings.cloakIcon) {
    fav.href = settings.cloakIcon;
  } else {
    fav.href = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='#22d3ee'/><stop offset='1' stop-color='#a78bfa'/></linearGradient></defs><circle cx='32' cy='32' r='28' fill='url(#g)'/><path d='M22 20 L46 32 L22 44 Z' fill='#0a0a18'/></svg>`
    );
  }
}

function bindSettings() {
  document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((s) => {
    s.addEventListener("click", () => {
      settings.theme = s.dataset.theme as Settings["theme"];
      applyTheme();
      saveSettings(settings);
    });
  });

  const sCloakTitle = document.getElementById("set-cloak-title") as HTMLInputElement;
  const sCloakIcon = document.getElementById("set-cloak-icon") as HTMLSelectElement;
  const sAboutBlank = document.getElementById("set-aboutblank") as HTMLInputElement;
  const sAutoplay = document.getElementById("set-autoplay") as HTMLInputElement;
  const sServer = document.getElementById("set-server") as HTMLSelectElement;

  sCloakTitle.value = settings.cloakTitle;
  sCloakIcon.value = settings.cloakIcon;
  sAboutBlank.checked = settings.aboutBlank;
  sAutoplay.checked = settings.autoplay;
  sServer.value = settings.server;

  sCloakTitle.addEventListener("input", () => {
    settings.cloakTitle = sCloakTitle.value;
    saveSettings(settings); applyCloak();
  });
  sCloakIcon.addEventListener("change", () => {
    settings.cloakIcon = sCloakIcon.value;
    saveSettings(settings); applyCloak();
  });
  sAboutBlank.addEventListener("change", () => {
    settings.aboutBlank = sAboutBlank.checked;
    saveSettings(settings);
  });
  sAutoplay.addEventListener("change", () => {
    settings.autoplay = sAutoplay.checked;
    saveSettings(settings);
  });
  sServer.addEventListener("change", () => {
    settings.server = sServer.value;
    saveSettings(settings);
    if (activeMovie) {
      const f = document.getElementById("modal-frame") as HTMLIFrameElement;
      f.src = cloakUrl(buildEmbedUrl(activeMovie.id, settings.server), activeMovie.title);
    }
    showToast(`Default server: ${sServer.options[sServer.selectedIndex].text}`);
  });

  document.getElementById("set-reset")!.addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings(settings);
    sCloakTitle.value = settings.cloakTitle;
    sCloakIcon.value = settings.cloakIcon;
    sAboutBlank.checked = settings.aboutBlank;
    sAutoplay.checked = settings.autoplay;
    sServer.value = settings.server;
    applyTheme(); applyCloak();
    showToast("Settings reset to defaults.");
  });
}

/* ============================================================
   Search
   ============================================================ */

function initSearch() {
  (document.getElementById("games-search") as HTMLInputElement).addEventListener("input", (e) => {
    renderGames((e.target as HTMLInputElement).value);
  });
  (document.getElementById("movies-search") as HTMLInputElement).addEventListener("input", (e) => {
    renderMovies((e.target as HTMLInputElement).value);
  });
}

/* ============================================================
   Toast
   ============================================================ */

let toastTimer = 0;
function showToast(msg: string) {
  const t = document.getElementById("toast")!;
  t.textContent = msg;
  t.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { t.hidden = true; }, 2600);
}

/* ============================================================
   Boot
   ============================================================ */

async function boot() {
  applyTheme();
  applyCloak();
  initConstellation();
  initTabs();
  initModal();
  initSearch();
  bindSettings();
  renderFeatured();
  renderGames();
  renderMovies();
  renderStats();

  // Load games + movie posters in parallel
  await Promise.all([loadGames(), loadPosters()]);
  renderStats();
  renderFeatured();
  renderGames((document.getElementById("games-search") as HTMLInputElement).value);
  renderMovies((document.getElementById("movies-search") as HTMLInputElement).value);
}

document.addEventListener("DOMContentLoaded", boot);
