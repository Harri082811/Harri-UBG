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
  { id: 1226863, title: "The Super Mario Galaxy Movie", year: 2026, genre: "Family · Comedy", poster: "/eJGWx219ZcEMVQJhAgMiqo8tYY.jpg" },
  { id: 1523145, title: "Your Heart Will Be Broken", year: 2026, genre: "Romance · Drama", poster: "/7wIBfBl2gejt6xHxNSK0reVIm7E.jpg" },
  { id: 1198994, title: "Send Help", year: 2026, genre: "Horror · Thriller", poster: "/mjkS2iAgWj3ik1DTjvI15nHZ7yl.jpg" },
  { id: 980431, title: "Avatar Aang: The Last Airbender", year: 2026, genre: "Animation · Action", poster: "/29Jdsak3SrwGds5k1t43kH6Khed.jpg" },
  { id: 83533, title: "Avatar: Fire and Ash", year: 2025, genre: "Science Fiction · Adventure", poster: "/aabwWZWx6z1aYP4PX2ADvbDKktd.jpg" },
  { id: 1613798, title: "Vengeance", year: 2026, genre: "Action · Thriller", poster: "/ygWXPL0RS91JyJPNOfK34eV3bRE.jpg" },
  { id: 1318447, title: "Apex", year: 2026, genre: "Thriller · Action", poster: "/9iuGBLJBRuGKR6nRL4SxUV1tIdt.jpg" },
  { id: 687163, title: "Project Hail Mary", year: 2026, genre: "Science Fiction · Adventure", poster: "/yihdXomYb5kTeSivtFndMy5iDmf.jpg" },
  { id: 936075, title: "Michael", year: 2026, genre: "Music · Drama", poster: "/3Qud19bBUrrJAzy0Ilm8gRJlJXP.jpg" },
  { id: 1470130, title: "The Mortuary Assistant", year: 2026, genre: "Horror · Mystery", poster: "/72AoFPC5TY4DfJwXXS9rPwPeReD.jpg" },
  { id: 1290821, title: "Shelter", year: 2026, genre: "Action · Crime", poster: "/buPFnHZ3xQy6vZEHxbHgL1Pc6CR.jpg" },
  { id: 1327819, title: "Hoppers", year: 2026, genre: "Animation · Family", poster: "/xjtWQ2CL1mpmMNwuU5HeS4Iuwuu.jpg" },
  { id: 1352874, title: "The Crucifix: Blood of the Exorcist", year: 2025, genre: "Horror", poster: "/uLXxpWRfoIPfB2fwM8hsAMIjSWf.jpg" },
  { id: 1297842, title: "GOAT", year: 2026, genre: "Animation · Comedy", poster: "/wfuqMlaExcoYiUEvKfVpUTt1v4u.jpg" },
  { id: 1171145, title: "Crime 101", year: 2026, genre: "Crime · Thriller", poster: "/tVvpFIoteRHNnoZMhdnwIVwJpCA.jpg" },
  { id: 1304313, title: "Lee Cronin's The Mummy", year: 2026, genre: "Horror · Mystery", poster: "/8L8efNkz8rUmwR7sV0g3vnC9yjn.jpg" },
  { id: 1641319, title: "Sniper: No Nation", year: 2026, genre: "Action · Thriller", poster: "/tUmARo0TZEK1EaSuS6dU35FhDyU.jpg" },
  { id: 840464, title: "Greenland 2: Migration", year: 2026, genre: "Adventure · Thriller", poster: "/z2tqCJLsw6uEJ8nJV8BsQXGa3dr.jpg" },
  { id: 1311031, title: "Demon Slayer: Kimetsu no Yaiba Infinity Castle", year: 2025, genre: "Animation · Action", poster: "/fWVSwgjpT2D78VUh6X8UBd2rorW.jpg" },
  { id: 1084577, title: "Balls Up", year: 2026, genre: "Comedy · Action", poster: "/xwvJ3WzdJ1OCuDoY8LAxBUlQyig.jpg" },
  { id: 1290417, title: "Thrash", year: 2026, genre: "Horror · Thriller", poster: "/adk8weka3O5648g3de4z3y4aE7G.jpg" },
  { id: 848116, title: "Rocky Aur Rani Kii Prem Kahaani", year: 2023, genre: "Comedy · Drama", poster: "/vTQIqlxUkOuyf2UKhlM2OUaFGKz.jpg" },
  { id: 1010755, title: "The Strangers: Chapter 3", year: 2026, genre: "Horror · Thriller", poster: "/yPHwX78mcwJw3I6YOJ9qh2wQBFr.jpg" },
  { id: 350, title: "The Devil Wears Prada", year: 2006, genre: "Drama · Comedy", poster: "/8912AsVuS7Sj915apArUFbv6F9L.jpg" },
  { id: 1601797, title: "¿Quieres Ser Mi Novia?", year: 2026, genre: "Comedy · Romance", poster: "/oscW8xV8EhRYj7iAhyVlBohKqxo.jpg" },
  { id: 1084242, title: "Zootopia 2", year: 2025, genre: "Animation · Family", poster: "/oJ7g2CifqpStmoYQyaLQgEU32qO.jpg" },
  { id: 502356, title: "The Super Mario Bros. Movie", year: 2023, genre: "Family · Comedy", poster: "/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg" },
  { id: 1159559, title: "Scream 7", year: 2026, genre: "Horror · Mystery", poster: "/jjyuk0edLiW8vOSnlfwWCCLpbh5.jpg" },
  { id: 1480387, title: "undertone", year: 2026, genre: "Horror · Mystery", poster: "/2PFgFMnrdCPXWiZl1PUvky7Mo9D.jpg" },
  { id: 1368166, title: "The Housemaid", year: 2025, genre: "Mystery · Thriller", poster: "/cWsBscZzwu5brg9YjNkGewRUvJX.jpg" },
  { id: 1419406, title: "The Shadow's Edge", year: 2025, genre: "Action · Crime", poster: "/e0RU6KpdnrqFxDKlI3NOqN8nHL6.jpg" },
  { id: 1107166, title: "Psycho Killer", year: 2026, genre: "Crime · Horror", poster: "/5xgxxmLivJXL8aF0HdZfpx8aAIo.jpg" },
  { id: 1193501, title: "Whistle", year: 2026, genre: "Horror · Mystery", poster: "/eGxPyseSnEZBMJaopGfRUO9HSYx.jpg" },
  { id: 755898, title: "War of the Worlds", year: 2025, genre: "Science Fiction · Thriller", poster: "/yvirUYrva23IudARHn3mMGVxWqM.jpg" },
  { id: 1234731, title: "Anaconda", year: 2025, genre: "Adventure · Comedy", poster: "/hBxN6dwrANN1ic3a4G9x6JZcR3C.jpg" },
  { id: 1265609, title: "War Machine", year: 2026, genre: "Action · Science Fiction", poster: "/rFhKkXhk7ClU03jQ5rHIApJDwev.jpg" },
  { id: 1659087, title: "180", year: 2026, genre: "Thriller · Crime", poster: "/9ISjrhA38HpSSGtfiCk8lpziC3K.jpg" },
  { id: 634649, title: "Spider-Man: No Way Home", year: 2021, genre: "Action · Adventure", poster: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
  { id: 1242898, title: "Predator: Badlands", year: 2025, genre: "Action · Science Fiction", poster: "/pHpq9yNUIo6aDoCXEBzjSolywgz.jpg" },
  { id: 10867, title: "Malena", year: 2000, genre: "Drama", poster: "/3OyQTl0IGkbnjDxd3MhztfPE34g.jpg" },
  { id: 1511057, title: "Roommates", year: 2026, genre: "Comedy", poster: "/eW1s6omXIfVkTlmKVe9y9Dwwt4u.jpg" },
  { id: 1418657, title: "The Yeti", year: 2026, genre: "Horror · Thriller", poster: "/zaqEfoKcWkVni2eONhJ7DRhMO8Q.jpg" },
  { id: 440249, title: "After Porn Ends 2", year: 2017, genre: "Documentary", poster: "/rfItXrtDGILwsCdmgVxX79phFuI.jpg" },
  { id: 7451, title: "xXx", year: 2002, genre: "Action · Adventure", poster: "/xeEw3eLeSFmJgXZzmF2Efww0q3s.jpg" },
  { id: 680493, title: "Return to Silent Hill", year: 2026, genre: "Mystery · Drama", poster: "/fqAGFN2K2kDL0EHxvJaXzaMUkkt.jpg" },
  { id: 662707, title: "Starbright", year: 2026, genre: "Adventure · Action", poster: "/m1Zl07DNYeSyNcz9hf8hDsS2oB5.jpg" },
  { id: 1367642, title: "Reminders of Him", year: 2026, genre: "Romance · Drama", poster: "/7L6rceYgzQ0NeHD7PRDNrRoQ291.jpg" },
  { id: 157336, title: "Interstellar", year: 2014, genre: "Adventure · Drama", poster: "/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg" },
  { id: 1084187, title: "Pretty Lethal", year: 2026, genre: "Music · Thriller", poster: "/znTPnXCK3lEQJgqXCvP7e5FUz6f.jpg" },
  { id: 1115544, title: "Mike & Nick & Nick & Alice", year: 2026, genre: "Comedy · Science Fiction", poster: "/7F0jc75HrSkLVcvOXR2FXAIwuEv.jpg" },
  { id: 1234821, title: "Jurassic World Rebirth", year: 2025, genre: "Science Fiction · Adventure", poster: "/1RICxzeoNCAO5NpcRMIgg1XT6fm.jpg" },
  { id: 1159831, title: "The Bride!", year: 2026, genre: "Science Fiction · Horror", poster: "/lV8YHwGkYZsm6EfIqnhaSz2avKt.jpg" },
  { id: 1268127, title: "Humint", year: 2026, genre: "Thriller · Action", poster: "/82bX2GK4PhaJQtfkTnfmd2P7erG.jpg" },
  { id: 1526650, title: "Mudborn", year: 2025, genre: "Horror · Thriller", poster: "/ifYNeKwpyKUTtjkUExrqTc65L2p.jpg" },
  { id: 24428, title: "The Avengers", year: 2012, genre: "Science Fiction · Action", poster: "/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg" },
  { id: 1272837, title: "28 Years Later: The Bone Temple", year: 2026, genre: "Horror · Thriller", poster: "/kK1BGkG3KAvWB0WMV1DfOx9yTMZ.jpg" },
  { id: 1316092, title: "\"Wuthering Heights\"", year: 2026, genre: "Romance · Drama", poster: "/3YBce6dTh1D5oCMITXk2S5QhPt.jpg" },
  { id: 1168190, title: "The Wrecking Crew", year: 2026, genre: "Action · Comedy", poster: "/gbVwHl4YPSq6BcC92TQpe7qUTh6.jpg" },
  { id: 329505, title: "Lola's Secret", year: 1984, genre: "Drama · Comedy", poster: "/qaJ4iQngrLbyz9OgaQkJLppDN6m.jpg" },
  { id: 252969, title: "Secret Pleasures", year: 2002, genre: "Drama · Crime", poster: "/j0Qu5opplDTot70kMqVqzURFXHY.jpg" },
  { id: 299536, title: "Avengers: Infinity War", year: 2018, genre: "Adventure · Action", poster: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg" },
  { id: 1049471, title: "Outcome", year: 2026, genre: "Comedy · Drama", poster: "/kSzcpfbTy2pXHGvrVU2WhQTo6oU.jpg" },
  { id: 278, title: "The Shawshank Redemption", year: 1994, genre: "Drama · Crime", poster: "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg" },
  { id: 1646787, title: "Sundutan", year: 2026, genre: "Drama", poster: "/2neZgVuY7prWIak5hhNKT53Hk0N.jpg" },
  { id: 1658216, title: "Stepdaddy", year: 2026, genre: "Drama", poster: "/oZxNblisKuDzSUW5g18FERjyJs9.jpg" },
  { id: 28322, title: "Madness", year: 1980, genre: "Thriller · Action", poster: "/gV0J0Fqw2mYMtQbzb0ruxv9MAeZ.jpg" },
  { id: 1314481, title: "The Devil Wears Prada 2", year: 2026, genre: "Drama · Comedy", poster: "/p35IoKfBtJDNiWJMO8ZEtIMZSfW.jpg" },
  { id: 1266992, title: "Balinsasayaw", year: 2024, genre: "Drama", poster: "/5gotyf6pPf9ZbDSW0yBLXMpDmmP.jpg" },
  { id: 1266127, title: "Ready or Not 2: Here I Come", year: 2026, genre: "Horror · Comedy", poster: "/jRf89HVEtBZiSnOXXWDhZOfuTwW.jpg" },
  { id: 1110034, title: "Kraken", year: 2026, genre: "Horror · Action", poster: "/jVsflOu9WpMqUJ3WwVX2mITi86S.jpg" },
  { id: 425274, title: "Now You See Me: Now You Don't", year: 2025, genre: "Crime · Thriller", poster: "/oD3Eey4e4Z259XLm3eD3WGcoJAh.jpg" },
  { id: 238, title: "The Godfather", year: 1972, genre: "Drama · Crime", poster: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { id: 1306368, title: "The Rip", year: 2026, genre: "Action · Thriller", poster: "/eZo31Dhl5BQ6GfbMNf3oU0tUvPZ.jpg" },
  { id: 803796, title: "KPop Demon Hunters", year: 2025, genre: "Fantasy · Music", poster: "/zT7Lhw3BhJbMkRqm9Zlx2YGMsY0.jpg" },
  { id: 81774, title: "Exploits of a Young Don Juan", year: 1986, genre: "Comedy · Drama", poster: "/xvtRgQIRegLjsjaIkKQbh0hk3Qy.jpg" },
  { id: 1010581, title: "My Fault", year: 2023, genre: "Drama · Romance", poster: "/w46Vw536HwNnEzOa7J24YH9DPRS.jpg" },
  { id: 533535, title: "Deadpool & Wolverine", year: 2024, genre: "Action · Comedy", poster: "/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg" },
  { id: 1088434, title: "Hellfire", year: 2026, genre: "Action · Thriller", poster: "/tQti9QTf13MfzNpXguijgNh7ojE.jpg" },
  { id: 1038392, title: "The Conjuring: Last Rites", year: 2025, genre: "Horror", poster: "/byWgphT74ClOVa8EOGzYDkl8DVL.jpg" },
  { id: 875828, title: "Peaky Blinders: The Immortal Man", year: 2026, genre: "Crime · Drama", poster: "/gRMalasZEzsZi4w2VFuYusfSfqf.jpg" },
  { id: 1579, title: "Apocalypto", year: 2006, genre: "Action · Drama", poster: "/cRY25Q32kDNPFDkFkxAs6bgCq3L.jpg" },
  { id: 441168, title: "From Straight A's to XXX", year: 2017, genre: "Drama · TV Movie", poster: "/kvcdaGcres9pGDwZfPN9jOKfZh.jpg" },
  { id: 1246049, title: "Dracula", year: 2025, genre: "Horror · Fantasy", poster: "/dYRqA50yd0nB3qBR7AtWEJJQ8q.jpg" },
  { id: 879945, title: "The Unknown Man", year: 2021, genre: "Drama", poster: "/4TpBhdaSl5ALHbgeaYOLF8Q3haz.jpg" },
  { id: 299534, title: "Avengers: Endgame", year: 2019, genre: "Adventure · Science Fiction", poster: "/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg" },
  { id: 1236153, title: "Mercy", year: 2026, genre: "Science Fiction · Action", poster: "/pyok1kZJCfyuFapYXzHcy7BLlQa.jpg" },
  { id: 1610418, title: "The House on Haunted Grounds", year: 2026, genre: "Horror", poster: "/750RNSHr25GQcCr2Ws8iSGrHJA9.jpg" },
  { id: 1539104, title: "JUJUTSU KAISEN: Execution", year: 2025, genre: "Animation · Action", poster: "/v0s3dx6am0RzfsuK3KdEy8ZoCDs.jpg" },
  { id: 400155, title: "Hotel Transylvania 3: Summer Vacation", year: 2018, genre: "Animation · Comedy", poster: "/lzE5BwGQea1nek7TPXUuC5AZ6rq.jpg" },
  { id: 744275, title: "After We Fell", year: 2021, genre: "Drama · Romance", poster: "/dU4HfnTEJDf9KvxGS9hgO7BVeju.jpg" },
  { id: 73353, title: "Man in the Mirror: The Michael Jackson Story", year: 2004, genre: "Drama · TV Movie", poster: "/qhp25BXUEqIaDFQbC7YI3h2FSqD.jpg" },
  { id: 858024, title: "Hamnet", year: 2025, genre: "Drama · Romance", poster: "/vbeyOZm2bvBXcbgPD3v6o94epPX.jpg" },
  { id: 911430, title: "F1", year: 2025, genre: "Action · Drama", poster: "/vqBmyAj0Xm9LnS1xe1MSlMAJyHq.jpg" },
  { id: 181808, title: "Star Wars: The Last Jedi", year: 2017, genre: "Adventure · Action", poster: "/kOVEVeg59E0wsnXmF9nrh6OmWII.jpg" },
  { id: 1011985, title: "Kung Fu Panda 4", year: 2024, genre: "Action · Adventure", poster: "/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg" },
  { id: 1572073, title: "The Deadly Little Mermaid", year: 2026, genre: "Horror", poster: "/uye25uG7k8r3NNPLyPiKOiRnFRF.jpg" },
  { id: 1119449, title: "Good Luck, Have Fun, Don't Die", year: 2026, genre: "Science Fiction · Action", poster: "/rWcfOdY7TU6lTdazWj0ebDZnAfO.jpg" },
  { id: 1424965, title: "Ice Skater", year: 2026, genre: "Drama · Thriller", poster: "/m93BKabB7Je8WQACed58BXeHNNR.jpg" },
  { id: 1472951, title: "Infiltrate", year: 2026, genre: "Action · Thriller", poster: "/8Cw8GF9wG63kF8pRRXwOx2kXGt.jpg" },
  { id: 496243, title: "Parasite", year: 2019, genre: "Comedy · Thriller", poster: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
  { id: 50619, title: "The Twilight Saga: Breaking Dawn - Part 1", year: 2011, genre: "Adventure · Fantasy", poster: "/qs8LsHKYlVRmJbFUiSUhhRAygwj.jpg" },
  { id: 1325734, title: "The Drama", year: 2026, genre: "Romance · Comedy", poster: "/ikcNOWB6Qo1ER1H1BJL6Vf0W22s.jpg" },
  { id: 1669050, title: "Tayuan 2", year: 2026, genre: "Drama", poster: "/gkHNa8q3RNhgj2EMuoYWJUHsMa6.jpg" },
  { id: 120, title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001, genre: "Adventure · Fantasy", poster: "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { id: 20222, title: "Sex with Love", year: 2003, genre: "Comedy · Romance", poster: "/9Unz4SnlkXg0OAxgiLKZAfu096c.jpg" },
  { id: 155, title: "The Dark Knight", year: 2008, genre: "Action · Crime", poster: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: 597, title: "Titanic", year: 1997, genre: "Drama · Romance", poster: "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg" },
  { id: 226674, title: "The Adolescent", year: 1979, genre: "Drama", poster: "/v7yCEzF9BCF82lbp42X5ZLjIieo.jpg" },
  { id: 27205, title: "Inception", year: 2010, genre: "Action · Science Fiction", poster: "/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg" },
  { id: 19995, title: "Avatar", year: 2009, genre: "Science Fiction · Action", poster: "/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg" },
  { id: 361743, title: "Top Gun: Maverick", year: 2022, genre: "Action · Drama", poster: "/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg" },
  { id: 214756, title: "Ted 2", year: 2015, genre: "Comedy · Fantasy", poster: "/38C91I7Xft0gyY7BITm8i4yvuRb.jpg" },
  { id: 680, title: "Pulp Fiction", year: 1994, genre: "Thriller · Crime", poster: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg" },
  { id: 950387, title: "A Minecraft Movie", year: 2025, genre: "Family · Fantasy", poster: "/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg" },
  { id: 122, title: "The Lord of the Rings: The Return of the King", year: 2003, genre: "Adventure · Fantasy", poster: "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg" },
  { id: 603, title: "The Matrix", year: 1999, genre: "Action · Science Fiction", poster: "/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg" },
  { id: 1061474, title: "Superman", year: 2025, genre: "Science Fiction · Adventure", poster: "/ldyfo0BKmz5rWtJJKCvwaNS4cJT.jpg" },
  { id: 967998, title: "Fatal Conspiracy", year: 2022, genre: "Horror", poster: "/zpj3nNoc5xaUZTIdnuhwXwUcRag.jpg" },
  { id: 76600, title: "Avatar: The Way of Water", year: 2022, genre: "Action · Adventure", poster: "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
  { id: 129, title: "Spirited Away", year: 2001, genre: "Animation · Family", poster: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg" },
  { id: 950396, title: "The Gorge", year: 2025, genre: "Romance · Science Fiction", poster: "/7iMBZzVZtG0oBug4TfqDb9ZxAOa.jpg" },
  { id: 232078, title: "Triple Crossed", year: 2013, genre: "Mystery", poster: "/doK75PABYpMHqiiHFoOJsC0pAn0.jpg" },
  { id: 1383731, title: "Protector", year: 2026, genre: "Action · Thriller", poster: "/vVdxddwjZAL5MxwRU1yHBkTMWOo.jpg" },
  { id: 14836, title: "Coraline", year: 2009, genre: "Animation · Family", poster: "/4jeFXQYytChdZYE9JYO7Un87IlW.jpg" },
  { id: 1339876, title: "Mardaani 3", year: 2026, genre: "Action · Crime", poster: "/dHxLBtHw4InwsVumnthupZYz6NM.jpg" },
  { id: 1387382, title: "Hunting Season", year: 2025, genre: "Action · Drama", poster: "/cbryTyaWdqrKpQCw6K7zm2jrB5v.jpg" },
  { id: 999136, title: "Do Not Enter", year: 2026, genre: "Horror", poster: "/stM9N7eJmHKLmFR59JG4tLdN7Wk.jpg" },
  { id: 1087192, title: "How to Train Your Dragon", year: 2025, genre: "Fantasy · Family", poster: "/41dfWUWtg1kUZcJYe6Zk6ewxzMu.jpg" },
  { id: 58008, title: "Night Nurse", year: 1979, genre: "Comedy", poster: "/tzhBAhN35YjobVG3Ubm3ERnzhBL.jpg" },
  { id: 1233413, title: "Sinners", year: 2025, genre: "Horror · Action", poster: "/705nQHqe4JGdEisrQmVYmXyjs1U.jpg" },
  { id: 550, title: "Fight Club", year: 1999, genre: "Drama · Thriller", poster: "/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg" },
  { id: 1207162, title: "Rise of the Conqueror", year: 2026, genre: "History · Action", poster: "/9cRE0DsM6CNIiY9Ah3cd8oc3n1Y.jpg" },
  { id: 671, title: "Harry Potter and the Philosopher's Stone", year: 2001, genre: "Adventure · Fantasy", poster: "/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg" },
  { id: 10138, title: "Iron Man 2", year: 2010, genre: "Adventure · Action", poster: "/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg" },
  { id: 969681, title: "Spider-Man: Brand New Day", year: 2026, genre: "Science Fiction · Action", poster: "/pspkSVP39NGa6G2rvK5KlMjvYUe.jpg" },
  { id: 402431, title: "Wicked", year: 2024, genre: "Drama · Romance", poster: "/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg" },
  { id: 1218925, title: "Chainsaw Man - The Movie: Reze Arc", year: 2025, genre: "Animation · Action", poster: "/pHyxb2RV5wLlboAwm9ZJ9qTVEDw.jpg" },
  { id: 348, title: "Alien", year: 1979, genre: "Horror · Science Fiction", poster: "/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg" },
  { id: 569094, title: "Spider-Man: Across the Spider-Verse", year: 2023, genre: "Animation · Action", poster: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
  { id: 240, title: "The Godfather Part II", year: 1974, genre: "Drama · Crime", poster: "/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg" },
  { id: 872585, title: "Oppenheimer", year: 2023, genre: "Drama · History", poster: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
  { id: 38, title: "Eternal Sunshine of the Spotless Mind", year: 2004, genre: "Science Fiction · Drama", poster: "/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg" },
  { id: 991494, title: "The SpongeBob Movie: Search for SquarePants", year: 2025, genre: "Adventure · Animation", poster: "/xJnOMMsFASxNiFnG7v3TNIQ3ife.jpg" },
  { id: 912649, title: "Venom: The Last Dance", year: 2024, genre: "Science Fiction · Action", poster: "/vGXptEdgZIhPg3cGlc7e8sNPC2e.jpg" },
  { id: 1223601, title: "Sisu: Road to Revenge", year: 2025, genre: "Action · War", poster: "/jNsttCWZyPtW66MjhUozBzVsRb7.jpg" },
  { id: 13, title: "Forrest Gump", year: 1994, genre: "Comedy · Drama", poster: "/Cw4hIUIAmSYfK9QfaUW5igp9La.jpg" },
  { id: 1408208, title: "Exit 8", year: 2025, genre: "Horror · Mystery", poster: "/nQXYTvm6AY4WmtcPskroqC7Skh.jpg" },
  { id: 807, title: "Se7en", year: 1995, genre: "Crime · Mystery", poster: "/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg" },
  { id: 1582770, title: "Dhurandhar: The Revenge", year: 2026, genre: "Action · Crime", poster: "/ov8vrRLZGoXHpYjSY9Vpv1tHJX7.jpg" },
  { id: 1620996, title: "The Blue Box", year: 2026, genre: "Romance · Thriller", poster: "/dkIzjzfv7TbXqjbJKM51CZYORaR.jpg" },
  { id: 564, title: "The Mummy", year: 1999, genre: "Adventure · Action", poster: "/yhIsVvcUm7QxzLfT6HW2wLf5ajY.jpg" },
  { id: 497, title: "The Green Mile", year: 1999, genre: "Fantasy · Drama", poster: "/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg" },
  { id: 1241982, title: "Moana 2", year: 2024, genre: "Animation · Adventure", poster: "/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg" },
  { id: 1022789, title: "Inside Out 2", year: 2024, genre: "Animation · Adventure", poster: "/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg" },
  { id: 808, title: "Shrek", year: 2001, genre: "Animation · Comedy", poster: "/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg" },
  { id: 1241470, title: "Osiris", year: 2025, genre: "Science Fiction · Action", poster: "/3YtZHtXPNG5AleisgEatEfZOT2w.jpg" },
  { id: 1174024, title: "Maybe More", year: 2024, genre: "Comedy · Drama", poster: "/lABR9HrMcvHDSouESUlCpYzGBVV.jpg" },
  { id: 106646, title: "The Wolf of Wall Street", year: 2013, genre: "Crime · Drama", poster: "/kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg" },
  { id: 315635, title: "Spider-Man: Homecoming", year: 2017, genre: "Action · Adventure", poster: "/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg" },
  { id: 1228246, title: "Five Nights at Freddy's 2", year: 2025, genre: "Horror · Thriller", poster: "/udAxQEORq2I5wxI97N2TEqdhzBE.jpg" },
  { id: 798645, title: "The Running Man", year: 2025, genre: "Action · Thriller", poster: "/dKL78O9zxczVgjtNcQ9UkbYLzqX.jpg" },
  { id: 1400940, title: "Clayface", year: 2026, genre: "Horror · Thriller", poster: "/5jCpQnWPikggmQZoDp1eAi6BI6w.jpg" },
  { id: 1117857, title: "In Your Dreams", year: 2025, genre: "Animation · Family", poster: "/ug0TqgmByPCEYzR9lQWQmyAa7sw.jpg" },
  { id: 7131, title: "Van Helsing", year: 2004, genre: "Horror · Adventure", poster: "/gsFun8nATm52aGHeT8ueAel98nE.jpg" },
  { id: 1184918, title: "The Wild Robot", year: 2024, genre: "Family · Animation", poster: "/eG9lz41mJqsI4J6ubMtVqD26q2J.jpg" },
  { id: 1054867, title: "One Battle After Another", year: 2025, genre: "Thriller · Crime", poster: "/lbBWwxBht4JFP5PsuJ5onpMqugW.jpg" },
  { id: 346698, title: "Barbie", year: 2023, genre: "Comedy · Adventure", poster: "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg" },
  { id: 980477, title: "Ne Zha 2", year: 2025, genre: "Animation · Fantasy", poster: "/cb5NyNrqiCNNoDkA8FfxHAtypdG.jpg" },
  { id: 1167307, title: "David", year: 2025, genre: "Animation · Family", poster: "/bESlrLOrsQ9gKzaGQGHXKOyIUtX.jpg" },
  { id: 557, title: "Spider-Man", year: 2002, genre: "Action · Science Fiction", poster: "/kjdJntyBeEvqm9w97QGBdxPptzj.jpg" },
  { id: 372058, title: "Your Name.", year: 2016, genre: "Animation · Romance", poster: "/q719jXXEzOoYaps6babgKnONONX.jpg" },
  { id: 438631, title: "Dune", year: 2021, genre: "Science Fiction · Adventure", poster: "/gDzOcq0pfeCeqMBwKIJlSmQpjkZ.jpg" },
  { id: 524047, title: "Greenland", year: 2020, genre: "Thriller · Adventure", poster: "/bNo2mcvSwIvnx8K6y1euAc1TLVq.jpg" },
  { id: 1108427, title: "Moana", year: 2026, genre: "Family · Fantasy", poster: "/zKVgiv5qHCvCLT4A2ymJi5QeXDH.jpg" },
  { id: 1315303, title: "Primate", year: 2026, genre: "Horror · Thriller", poster: "/rKleYiEj4pFqxedTRWfujLooi84.jpg" },
  { id: 418579, title: "Young Sister-In-Law", year: 2016, genre: "Romance", poster: "/jAGlDPyNfLvGMXI3Gt9E4SrRtHg.jpg" },
  { id: 424, title: "Schindler's List", year: 1993, genre: "Drama · History", poster: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { id: 1726, title: "Iron Man", year: 2008, genre: "Action · Science Fiction", poster: "/78lPtwv72eTNqFW9COBYI0dWDJa.jpg" },
  { id: 567609, title: "Ready or Not", year: 2019, genre: "Horror · Comedy", poster: "/oJD9KQFoObZmxAS1je56SIFVNJt.jpg" },
  { id: 11, title: "Star Wars", year: 1977, genre: "Adventure · Action", poster: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg" },
  { id: 1213898, title: "Border 2", year: 2026, genre: "Action · Drama", poster: "/wUcttG71zo9deP4m9sDhYPUcvi5.jpg" },
  { id: 467905, title: "How to Make a Killing", year: 2026, genre: "Comedy · Thriller", poster: "/yQ7OP2HYxl9YmkWNMkuUA2YaF5.jpg" },
  { id: 1156594, title: "Our Fault", year: 2025, genre: "Romance · Drama", poster: "/yzqHt4m1SeY9FbPrfZ0C2Hi9x1s.jpg" },
  { id: 324857, title: "Spider-Man: Into the Spider-Verse", year: 2018, genre: "Animation · Action", poster: "/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg" },
  { id: 10474, title: "The Basketball Diaries", year: 1995, genre: "Drama · Crime", poster: "/AhvO1GGDPIgN0hOqZEgaFCbswMK.jpg" },
  { id: 1192548, title: "Hannah Waddingham: Home for Christmas", year: 2023, genre: "Music", poster: "/mc1uof12ZEDMY7VSGmMbo1SBQlb.jpg" },
  { id: 519182, title: "Despicable Me 4", year: 2024, genre: "Action · Animation", poster: "/wWba3TaojhK7NdycRhoQpsG0FaH.jpg" },
  { id: 617126, title: "The Fantastic 4: First Steps", year: 2025, genre: "Science Fiction · Adventure", poster: "/pZPJsaFKWheTOerVhLnpP8TPp4B.jpg" },
  { id: 269149, title: "Zootopia", year: 2016, genre: "Animation · Adventure", poster: "/hlK0e0wAQ3VLuJcsfIYPvb4JVud.jpg" },
  { id: 192904, title: "Doraemon: Nobita in the Wan-Nyan Spacetime Odyssey", year: 2004, genre: "Animation · Adventure", poster: "/gBYEK5Kv8uVZGoTbBcovIcWjKNI.jpg" },
  { id: 677638, title: "We Bare Bears: The Movie", year: 2020, genre: "Animation · Adventure", poster: "/khtIr0Gxtz52T10RRQZ42o1a5Ry.jpg" },
  { id: 429617, title: "Spider-Man: Far From Home", year: 2019, genre: "Action · Adventure", poster: "/4q2NNj4S5dG2RLF9CpXsej7yXl.jpg" },
  { id: 244786, title: "Whiplash", year: 2014, genre: "Drama · Music", poster: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg" },
  { id: 769, title: "GoodFellas", year: 1990, genre: "Drama · Crime", poster: "/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg" },
  { id: 1233506, title: "The Shrinking Man", year: 2025, genre: "Adventure · Science Fiction", poster: "/5scjQRQq4i0zpbfyvWJX8LFEWjt.jpg" },
  { id: 1062722, title: "Frankenstein", year: 2025, genre: "Drama · Fantasy", poster: "/g4JtvGlQO7DByTI6frUobqvSL3R.jpg" },
  { id: 866398, title: "The Beekeeper", year: 2024, genre: "Action · Crime", poster: "/A7EByudX0eOzlkQ2FIbogzyazm2.jpg" },
  { id: 216015, title: "Fifty Shades of Grey", year: 2015, genre: "Drama · Romance", poster: "/63kGofUkt1Mx0SIL4XI4Z5AoSgt.jpg" },
  { id: 121, title: "The Lord of the Rings: The Two Towers", year: 2002, genre: "Adventure · Fantasy", poster: "/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg" },
  { id: 615, title: "The Passion of the Christ", year: 2004, genre: "Drama", poster: "/rBM5o2HpmCfDejuIPybI09tkY3V.jpg" },
  { id: 1511417, title: "Bāhubali: The Epic", year: 2025, genre: "Action · Drama", poster: "/z9YIo2qscyaXYgRqIdRJtND3bw8.jpg" },
  { id: 384527, title: "Dolce... calda Lisa", year: 1980, genre: "Drama", poster: "/taoUcLRMSijDDySXv9AT2oX9BmO.jpg" },
  { id: 931285, title: "Mortal Kombat II", year: 2026, genre: "Action · Fantasy", poster: "/lIsMeDbwntNXSUVHmWMMRXEZOVc.jpg" },
  { id: 1416391, title: "Toaster", year: 2026, genre: "Comedy · Crime", poster: "/cbYyWHc1dL1bfwEJbaMYDYKgWG2.jpg" },
  { id: 693134, title: "Dune: Part Two", year: 2024, genre: "Science Fiction · Adventure", poster: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: 575265, title: "Mission: Impossible - The Final Reckoning", year: 2025, genre: "Action · Thriller", poster: "/z53D72EAOxGRqdr7KXXWp9dJiDe.jpg" },
  { id: 939243, title: "Sonic the Hedgehog 3", year: 2024, genre: "Action · Science Fiction", poster: "/d8Ryb8AunYAuycVKDp5HpdWPKgC.jpg" },
  { id: 4935, title: "Howl's Moving Castle", year: 2004, genre: "Fantasy · Animation", poster: "/13kOl2v0nD2OLbVSHnHk8GUFEhO.jpg" },
  { id: 508947, title: "Turning Red", year: 2022, genre: "Animation · Family", poster: "/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg" },
  { id: 458293, title: "Michael Jackson: Searching for Neverland", year: 2017, genre: "Drama · TV Movie", poster: "/mRZIiG4vJiCgJh4v2EPUVVTznC8.jpg" },
  { id: 862, title: "Toy Story", year: 1995, genre: "Family · Comedy", poster: "/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg" },
  { id: 80794, title: "Daughter of Darkness", year: 1993, genre: "Thriller · Horror", poster: "/2ggoyYfBIMD3WbHj36Qlr7wgyFV.jpg" },
  { id: 12445, title: "Harry Potter and the Deathly Hallows: Part 2", year: 2011, genre: "Adventure · Fantasy", poster: "/c54HpQmuwXjHq2C9wmoACjxoom3.jpg" },
  { id: 105, title: "Back to the Future", year: 1985, genre: "Adventure · Comedy", poster: "/vN5B5WgYscRGcQpVhHl6p9DDTP0.jpg" },
  { id: 1650558, title: "Abot Langit", year: 2026, genre: "Romance", poster: "/5lVYe4aSimWdxJINKwq9s68TZ2G.jpg" },
  { id: 99861, title: "Avengers: Age of Ultron", year: 2015, genre: "Action · Adventure", poster: "/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg" },
  { id: 1015606, title: "Obi-Wan Kenobi: A Jedi's Return", year: 2022, genre: "Documentary", poster: "/vQGgvXjoMZf8x1m3BHsMxVXPyck.jpg" },
  { id: 335984, title: "Blade Runner 2049", year: 2017, genre: "Science Fiction · Drama", poster: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg" },
  { id: 1087040, title: "Money Shot: The Pornhub Story", year: 2023, genre: "Documentary", poster: "/kpTqWqLYcf1uErnx5VXLah4EWJZ.jpg" },
  { id: 585, title: "Monsters, Inc.", year: 2001, genre: "Animation · Comedy", poster: "/wFSpyMsp7H0ttERbxY7Trlv8xry.jpg" },
  { id: 672, title: "Harry Potter and the Chamber of Secrets", year: 2002, genre: "Adventure · Fantasy", poster: "/sdEOH0992YZ0QSxgXNIGLq1ToUi.jpg" },
  { id: 150540, title: "Inside Out", year: 2015, genre: "Animation · Family", poster: "/2H1TmgdfNtsKlU9jKdeNyYL5y8T.jpg" },
  { id: 8966, title: "Twilight", year: 2008, genre: "Fantasy · Drama", poster: "/3Gkb6jm6962ADUPaCBqzz9CTbn9.jpg" },
  { id: 673, title: "Harry Potter and the Prisoner of Azkaban", year: 2004, genre: "Adventure · Fantasy", poster: "/aWxwnYoe8p2d2fcxOqtvAtJ72Rw.jpg" },
  { id: 541671, title: "Ballerina", year: 2025, genre: "Action · Thriller", poster: "/2VUmvqsHb6cEtdfscEA6fqqVzLg.jpg" },
  { id: 8587, title: "The Lion King", year: 1994, genre: "Animation · Family", poster: "/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg" },
  { id: 552524, title: "Lilo & Stitch", year: 2025, genre: "Family · Science Fiction", poster: "/ckQzKpQJO4ZQDCN5evdpKcfm7Ys.jpg" },
  { id: 333339, title: "Ready Player One", year: 2018, genre: "Adventure · Action", poster: "/pU1ULUq8D3iRxl1fdX2lZIzdHuI.jpg" },
  { id: 58, title: "Pirates of the Caribbean: Dead Man's Chest", year: 2006, genre: "Adventure · Fantasy", poster: "/uXEqmloGyP7UXAiphJUu2v2pcuE.jpg" },
  { id: 62029, title: "Bingo Bongo", year: 1982, genre: "Comedy", poster: "/5ve4VuCwi7Xas5s50ynEB7uFjM2.jpg" },
  { id: 1197306, title: "A Working Man", year: 2025, genre: "Action · Crime", poster: "/6FRFIogh3zFnVWn7Z6zcYnIbRcX.jpg" },
  { id: 68721, title: "Iron Man 3", year: 2013, genre: "Action · Adventure", poster: "/qhPtAc1TKbMPqNvcdXSOn9Bn7hZ.jpg" },
  { id: 300496, title: "Nefeli", year: 1980, genre: "Romance", poster: "/4EgkcisexFjGfQmGI0IrVxZUBIv.jpg" },
  { id: 1357633, title: "Solo Leveling -ReAwakening-", year: 2024, genre: "Action · Adventure", poster: "/dblIFen0bNZAq8icJXHwrjfymDW.jpg" },
  { id: 12153, title: "White Chicks", year: 2004, genre: "Comedy · Crime", poster: "/aHTUpo45qy9QYIOnVITGGqLoVcA.jpg" },
  { id: 933260, title: "The Substance", year: 2024, genre: "Horror · Science Fiction", poster: "/lqoMzCcZYEFK729d6qzt349fB4o.jpg" },
  { id: 106, title: "Predator", year: 1987, genre: "Science Fiction · Action", poster: "/k3mW4qfJo6SKqe6laRyNGnbB9n5.jpg" },
  { id: 1078605, title: "Weapons", year: 2025, genre: "Horror · Mystery", poster: "/cpf7vsRZ0MYRQcnLWteD5jK9ymT.jpg" },
  { id: 1448560, title: "Wildcat", year: 2025, genre: "Action · Thriller", poster: "/h893ImjM6Fsv5DFhKJdlZFZIJno.jpg" },
  { id: 107257, title: "A Perfect Ending", year: 2012, genre: "Drama · Romance", poster: "/mjwWEwE1xdbtFGCOgeXi5jvQnOU.jpg" },
  { id: 293660, title: "Deadpool", year: 2016, genre: "Action · Adventure", poster: "/3E53WEZJqP6aM84D8CckXx4pIHw.jpg" },
  { id: 1231914, title: "Female Workers: Romance at Work 3", year: 2023, genre: "Romance", poster: "/c4HACOcvKsWAaNTsyYs1JzfwXWi.jpg" },
  { id: 674, title: "Harry Potter and the Goblet of Fire", year: 2005, genre: "Adventure · Fantasy", poster: "/fECBtHlr0RB3foNHDiCBXeg9Bv9.jpg" },
  { id: 337404, title: "Cruella", year: 2021, genre: "Comedy · Crime", poster: "/hjS9mH8KvRiGHgjk6VUZH7OT0Ng.jpg" },
  { id: 177572, title: "Big Hero 6", year: 2014, genre: "Adventure · Family", poster: "/2mxS4wUimwlLmI1xp6QW6NSU361.jpg" },
  { id: 72190, title: "World War Z", year: 2013, genre: "Action · Horror", poster: "/aCnVdvExw6UWSeQfr0tUH3jr4qG.jpg" },
  { id: 1621, title: "Trading Places", year: 1983, genre: "Comedy", poster: "/8mBuLCOcpWnmYtZc4aqtvDXslv6.jpg" },
  { id: 1412598, title: "Killer Whale", year: 2026, genre: "Thriller · Horror", poster: "/xC6zdIoIHjhOIFmjNyGgtzhuhiF.jpg" },
  { id: 280, title: "Terminator 2: Judgment Day", year: 1991, genre: "Action · Thriller", poster: "/jFTVD4XoWQTcg7wdyJKa8PEds5q.jpg" },
  { id: 559, title: "Spider-Man 3", year: 2007, genre: "Action · Adventure", poster: "/qFmwhVUoUSXjkKRmca5yGDEXBIj.jpg" },
  { id: 12444, title: "Harry Potter and the Deathly Hallows: Part 1", year: 2010, genre: "Adventure · Fantasy", poster: "/iGoXIpQb7Pot00EEdwpwPajheZ5.jpg" },
  { id: 1196067, title: "Worldbreaker", year: 2025, genre: "Science Fiction · Action", poster: "/4xx25oYs08myEelHiSbOuVi80Ki.jpg" },
  { id: 359410, title: "Road House", year: 2024, genre: "Action · Thriller", poster: "/fDEdtS4P0gJsxHDIt8dG8TR5dx1.jpg" },
  { id: 111, title: "Scarface", year: 1983, genre: "Action · Crime", poster: "/iQ5ztdjvteGeboxtmRdXEChJOHh.jpg" },
  { id: 574475, title: "Final Destination Bloodlines", year: 2025, genre: "Horror · Mystery", poster: "/6WxhEvFsauuACfv8HyoVX6mZKFj.jpg" },
  { id: 324786, title: "Hacksaw Ridge", year: 2016, genre: "Drama · History", poster: "/fnOMP6mjmOmZwmlC1n0K7ivrzt1.jpg" },
  { id: 122917, title: "The Hobbit: The Battle of the Five Armies", year: 2014, genre: "Action · Adventure", poster: "/xT98tLqatZPQApyRmlPL12LtiWp.jpg" },
  { id: 877817, title: "Wolfs", year: 2024, genre: "Crime · Comedy", poster: "/vOX1Zng472PC2KnS0B9nRfM8aaZ.jpg" },
  { id: 1003596, title: "Avengers: Doomsday", year: 2026, genre: "Science Fiction · Action", poster: "/8HkIe2i4ScpCkcX9SzZ9IPasqWV.jpg" },
  { id: 22, title: "Pirates of the Caribbean: The Curse of the Black Pearl", year: 2003, genre: "Adventure · Fantasy", poster: "/kvDwL2gTf6yxujbsWbsGQB3Z9Wa.jpg" },
  { id: 652, title: "Troy", year: 2004, genre: "War · Action", poster: "/51auXjXepW1zblzhaN7CAhwvf5i.jpg" },
  { id: 1499885, title: "The Red Book Ritual: Gates of Hell", year: 2025, genre: "Horror", poster: "/dOLRsvnjOB6rCx6olyRsMT92PxI.jpg" },
  { id: 156022, title: "The Equalizer", year: 2014, genre: "Thriller · Action", poster: "/9u4yW7yPA0BQ2pv9XwiNzItwvp8.jpg" },
  { id: 101, title: "Léon: The Professional", year: 1994, genre: "Crime · Drama", poster: "/bxB2q91nKYp8JNzqE7t7TWBVupB.jpg" },
  { id: 354912, title: "Coco", year: 2017, genre: "Family · Animation", poster: "/6Ryitt95xrO8KXuqRGm1fUuNwqF.jpg" },
  { id: 696393, title: "Cold Storage", year: 2026, genre: "Horror · Science Fiction", poster: "/3HA2iiq982e01EKXJvPFyfMADVM.jpg" },
  { id: 767, title: "Harry Potter and the Half-Blood Prince", year: 2009, genre: "Adventure · Fantasy", poster: "/z7uo9zmQdQwU5ZJHFpv2Upl30i1.jpg" },
  { id: 675, title: "Harry Potter and the Order of the Phoenix", year: 2007, genre: "Adventure · Fantasy", poster: "/5aOyriWkPec0zUDxmHFP9qMmBaj.jpg" },
  { id: 102382, title: "The Amazing Spider-Man 2", year: 2014, genre: "Action · Adventure", poster: "/bU7nTmvmy0h3VUP01v1T2imgH6N.jpg" },
  { id: 109445, title: "Frozen", year: 2013, genre: "Animation · Family", poster: "/itAKcobTYGpYT8Phwjd8c9hleTo.jpg" },
  { id: 37165, title: "The Truman Show", year: 1998, genre: "Comedy · Drama", poster: "/vuza0WqY239yBXOadKlGwJsZJFE.jpg" },
  { id: 98, title: "Gladiator", year: 2000, genre: "Action · Drama", poster: "/wN2xWp1eIwCKOD0BHTcErTBv1Uq.jpg" },
  { id: 1284120, title: "The Ugly Stepsister", year: 2025, genre: "Horror · Comedy", poster: "/rayAREIKtSinuov10GvrZHyXfXH.jpg" },
  { id: 1497970, title: "Tom and Jerry: Forbidden Compass", year: 2025, genre: "Animation · Comedy", poster: "/5qttWFjsO62k88civZaDMHiBTvy.jpg" },
  { id: 78192, title: "Michael Jackson: The Life of an Icon", year: 2011, genre: "Documentary · Music", poster: "/tOCYV9JCXXFtb7YehKXJBMKI4aD.jpg" },
  { id: 1197137, title: "Black Phone 2", year: 2025, genre: "Horror · Thriller", poster: "/gFddBLQ8wj9M9O82iPzgX5KVNHz.jpg" },
  { id: 1634301, title: "Vanaveera", year: 2026, genre: "Action · Drama", poster: "/oBYExKI8E3bTzQjPkofhpV2EJon.jpg" },
  { id: 414906, title: "The Batman", year: 2022, genre: "Crime · Mystery", poster: "/74xTEgt7R36Fpooo50r9T25onhq.jpg" },
  { id: 271110, title: "Captain America: Civil War", year: 2016, genre: "Adventure · Action", poster: "/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg" },
  { id: 670, title: "Oldboy", year: 2003, genre: "Drama · Thriller", poster: "/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg" },
  { id: 560016, title: "Monkey Man", year: 2024, genre: "Action · Thriller", poster: "/4lhR4L2vzzjl68P1zJyCH755Oz4.jpg" },
  { id: 59, title: "A History of Violence", year: 2005, genre: "Drama · Thriller", poster: "/3qnO72NHmUgs9JZXAmu4aId9QDl.jpg" },
  { id: 1317288, title: "Marty Supreme", year: 2025, genre: "Drama · Thriller", poster: "/lYWEXbQgRTR4ZQleSXAgRbxAjvq.jpg" },
  { id: 1493859, title: "Pizza Movie", year: 2026, genre: "Comedy", poster: "/v2qH9CiGWup1Ddzai76ofgtSTAh.jpg" },
  { id: 1072790, title: "Anyone But You", year: 2023, genre: "Romance · Comedy", poster: "/5qHoazZiaLe7oFBok7XlUhg96f2.jpg" },
  { id: 1397937, title: "NN4444", year: 2024, genre: "Thriller · Horror", poster: "/lXal7UQkg9sNYcPj9uCEnjqkGle.jpg" },
  { id: 1314786, title: "Agent Zeta", year: 2026, genre: "Drama · Thriller", poster: "/1cKLG9KMoCjsgFB8Nw1EuglteVi.jpg" },
  { id: 18240, title: "The Proposal", year: 2009, genre: "Comedy · Romance", poster: "/6stnAm1wSek8ZrislwK4xGTyCnt.jpg" },
  { id: 198663, title: "The Maze Runner", year: 2014, genre: "Action · Mystery", poster: "/ode14q7WtDugFDp78fo9lCsmay9.jpg" },
  { id: 315162, title: "Puss in Boots: The Last Wish", year: 2022, genre: "Animation · Adventure", poster: "/kuf6dutpsT0vSVehic3EZIqkOBt.jpg" },
  { id: 6435, title: "Practical Magic", year: 1998, genre: "Romance · Comedy", poster: "/AwmToSgf2IL3aHv0QRVsR5KvChv.jpg" },
  { id: 1175942, title: "The Bad Guys 2", year: 2025, genre: "Family · Comedy", poster: "/26oSPnq0ct59l07QOXZKyzsiRtN.jpg" },
  { id: 12, title: "Finding Nemo", year: 2003, genre: "Animation · Family", poster: "/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg" },
  { id: 38757, title: "Tangled", year: 2010, genre: "Animation · Family", poster: "/ym7Kst6a4uodryxqbGOxmewF235.jpg" },
  { id: 1242332, title: "Normal", year: 2026, genre: "Action · Crime", poster: "/nVIOGKbUdRxud0EXYJDMGCGcYbo.jpg" },
  { id: 14160, title: "Up", year: 2009, genre: "Animation · Comedy", poster: "/mFvoEwSfLqbcWwFsDjQebn9bzFe.jpg" },
  { id: 986056, title: "Thunderbolts*", year: 2025, genre: "Action · Science Fiction", poster: "/hqcexYHbiTBfDIdDWxrxPtVndBX.jpg" },
  { id: 1064028, title: "Subservience", year: 2024, genre: "Science Fiction · Horror", poster: "/gBenxR01Uy0Ev9RTIw6dVBPoyQU.jpg" },
  { id: 949, title: "Heat", year: 1995, genre: "Crime · Drama", poster: "/umSVjVdbVwtx5ryCA2QXL44Durm.jpg" },
  { id: 10681, title: "WALL·E", year: 2008, genre: "Animation · Family", poster: "/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg" },
  { id: 218, title: "The Terminator", year: 1984, genre: "Action · Thriller", poster: "/qvktm0BHcnmDpul4Hz01GIazWPr.jpg" },
  { id: 1404320, title: "Wild Agent 2: Peach Assassination", year: 2024, genre: "Action · Crime", poster: "/cozwDLiMHdn8rOSdjIZUoA4lJX9.jpg" },
  { id: 1156593, title: "Your Fault", year: 2024, genre: "Drama · Romance", poster: "/1sQA7lfcF9yUyoLYC0e6Zo3jmxE.jpg" },
  { id: 1291608, title: "Dhurandhar", year: 2025, genre: "Action · Crime", poster: "/snBOuXDdhmTvlzMUvP9Em3Pp1u1.jpg" },
  { id: 646380, title: "Don't Look Up", year: 2021, genre: "Comedy · Science Fiction", poster: "/th4E1yqsE8DGpAseLiUrI60Hf8V.jpg" },
  { id: 762509, title: "Mufasa: The Lion King", year: 2024, genre: "Adventure · Family", poster: "/jbOSUAWMGzGL1L4EaUF8K6zYFo7.jpg" },
  { id: 604079, title: "The Long Walk", year: 2025, genre: "Science Fiction · Thriller", poster: "/wobVTa99eW0ht6c1rNNzLkazPtR.jpg" },
  { id: 137051, title: "Midnight Matinee", year: 1988, genre: "Horror · Mystery", poster: "/czam6wq46B9UCZvq85vicElckFq.jpg" },
  { id: 16869, title: "Inglourious Basterds", year: 2009, genre: "Drama · Thriller", poster: "/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg" },
  { id: 1734, title: "The Mummy Returns", year: 2001, genre: "Adventure · Action", poster: "/kdJsW7hcy1lrj7tdMPycTAQPAiR.jpg" },
  { id: 411, title: "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe", year: 2005, genre: "Adventure · Family", poster: "/iREd0rNCjYdf5Ar0vfaW32yrkm.jpg" },
  { id: 1317149, title: "I Swear", year: 2025, genre: "Drama · History", poster: "/vUwyhNWBKkSwK8ELvEeBRwV724h.jpg" },
  { id: 77338, title: "The Intouchables", year: 2011, genre: "Drama · Comedy", poster: "/1QU7HKgsQbGpzsJbJK4pAVQV9F5.jpg" },
  { id: 475557, title: "Joker", year: 2019, genre: "Crime · Thriller", poster: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
  { id: 11324, title: "Shutter Island", year: 2010, genre: "Drama · Thriller", poster: "/nrmXQ0zcZUL8jFLrakWc90IR8z9.jpg" },
  { id: 2105, title: "American Pie", year: 1999, genre: "Comedy · Romance", poster: "/5P68by2Thn8wHAziyWGEw2O7hco.jpg" },
  { id: 603692, title: "John Wick: Chapter 4", year: 2023, genre: "Action · Thriller", poster: "/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg" },
  { id: 207, title: "Dead Poets Society", year: 1989, genre: "Drama", poster: "/erzbMlcNHOdx24AXOcn2ZKA7R1q.jpg" },
  { id: 329865, title: "Arrival", year: 2016, genre: "Drama · Science Fiction", poster: "/pEzNVQfdzYDzVK0XqxERIw2x2se.jpg" },
  { id: 1930, title: "The Amazing Spider-Man", year: 2012, genre: "Action · Adventure", poster: "/jexoNYnPd6vVrmygwF6QZmWPFdu.jpg" },
  { id: 1601243, title: "Oscar Shaw", year: 2026, genre: "Action · Crime", poster: "/tsE3nySukwrfUjouz8vzvKTcXNC.jpg" },
  { id: 744, title: "Top Gun", year: 1986, genre: "Action · Drama", poster: "/xUuHj3CgmZQ9P2cMaqQs4J0d4Zc.jpg" },
  { id: 49051, title: "The Hobbit: An Unexpected Journey", year: 2012, genre: "Adventure · Fantasy", poster: "/yHA9Fc37VmpUA5UncTxxo3rTGVA.jpg" },
  { id: 1265, title: "Bridge to Terabithia", year: 2007, genre: "Adventure · Drama", poster: "/3xFxGodKPMFLheS8rujFSmLfcq4.jpg" },
  { id: 823464, title: "Godzilla x Kong: The New Empire", year: 2024, genre: "Action · Adventure", poster: "/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg" },
  { id: 1658214, title: "Scorpio Nights 4", year: 2026, genre: "Drama", poster: "/lhgGvrHkwu9mtNeAhzaG828boH4.jpg" },
  { id: 1495, title: "Kingdom of Heaven", year: 2005, genre: "Drama · Action", poster: "/rNaBe4TwbMef71sgscqabpGKsxh.jpg" },
  { id: 39254, title: "Real Steel", year: 2011, genre: "Action · Science Fiction", poster: "/4GIeI5K5YdDUkR3mNQBoScpSFEf.jpg" },
  { id: 823219, title: "Flow", year: 2024, genre: "Animation · Adventure", poster: "/zME0Ul0w48MKkYBnFRn40M5qgLh.jpg" },
  { id: 637649, title: "Wrath of Man", year: 2021, genre: "Thriller · Crime", poster: "/M7SUK85sKjaStg4TKhlAVyGlz3.jpg" },
  { id: 1135873, title: "GGS - Ganteng-Ganteng Sange", year: 2023, genre: "Drama · Romance", poster: "/39fFH027tOpTyZwSNOydSAsOCzb.jpg" },
  { id: 539972, title: "Kraven the Hunter", year: 2024, genre: "Action · Adventure", poster: "/1GvBhRxY6MELDfxFrete6BNhBB5.jpg" },
  { id: 1241752, title: "Rita", year: 2024, genre: "Drama", poster: "/pXENxAzOBrTSDJGxDcUnlNTNmWr.jpg" },
  { id: 1297454, title: "The Death That Awaits", year: 2025, genre: "Horror · Thriller", poster: "/7hloUkIXB1Jc0xjSFlO4dcVfzdt.jpg" },
  { id: 1007734, title: "Nobody 2", year: 2025, genre: "Action · Thriller", poster: "/svXVRoRSu6zzFtCzkRsjZS7Lqpd.jpg" },
  { id: 822119, title: "Captain America: Brave New World", year: 2025, genre: "Action · Thriller", poster: "/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg" },
  { id: 2062, title: "Ratatouille", year: 2007, genre: "Animation · Comedy", poster: "/t3vaWRPSf6WjDSamIkKDs1iQWna.jpg" },
  { id: 1317672, title: "Love Me Love Me", year: 2026, genre: "Romance · Drama", poster: "/jfwHKRHRE2X4NTexdzblaioHH51.jpg" },
  { id: 533533, title: "TRON: Ares", year: 2025, genre: "Science Fiction · Adventure", poster: "/chpWmskl3aKm1aTZqUHRCtviwPy.jpg" },
  { id: 421862, title: "Confinement Escape", year: 1992, genre: "Action · Crime", poster: "/3gJikZBPIrhBQacJyI0RAEz0vEH.jpg" },
  { id: 313369, title: "La La Land", year: 2016, genre: "Comedy · Drama", poster: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg" },
  { id: 22881, title: "The Blind Side", year: 2009, genre: "Drama", poster: "/bMgq7VBriuBFknXEe9E9pVBYGZq.jpg" },
  { id: 2288, title: "Closer", year: 2004, genre: "Drama · Romance", poster: "/fGGaokx4k00S0J603VG53Qlr9jz.jpg" },
  { id: 1035259, title: "The Naked Gun", year: 2025, genre: "Action · Comedy", poster: "/rwla9vqzrKVVKVKiOuROTIXGsxj.jpg" },
  { id: 863, title: "Toy Story 2", year: 1999, genre: "Animation · Comedy", poster: "/4rbcp3ng8n1MKHjpeqW0L7Fnpzz.jpg" },
  { id: 138843, title: "The Conjuring", year: 2013, genre: "Horror · Thriller", poster: "/wVYREutTvI2tmxr6ujrHT704wGF.jpg" },
  { id: 1292695, title: "They Will Kill You", year: 2026, genre: "Action · Horror", poster: "/nSXCFSvI2p5WLgMrOHACbVnEJSR.jpg" },
  { id: 378236, title: "The Emoji Movie", year: 2017, genre: "Animation · Family", poster: "/60bTx5z9zL1AqCjZ0gmWoRMJ6Bb.jpg" },
  { id: 285, title: "Pirates of the Caribbean: At World's End", year: 2007, genre: "Adventure · Fantasy", poster: "/jGWpG4YhpQwVmjyHEGkxEkeRf0S.jpg" },
  { id: 210577, title: "Gone Girl", year: 2014, genre: "Mystery · Thriller", poster: "/ts996lKsxvjkO2yiYG0ht4qAicO.jpg" },
  { id: 1301421, title: "The Sheep Detectives", year: 2026, genre: "Mystery · Crime", poster: "/hTirV44jiLh6NqdiB6jtxPsDIoG.jpg" },
  { id: 272, title: "Batman Begins", year: 2005, genre: "Drama · Crime", poster: "/sPX89Td70IDDjVr85jdSBb4rWGr.jpg" },
  { id: 306367, title: "Comedy Central's All-Star Non-Denominational Christmas Special", year: 2014, genre: "Comedy", poster: "/wI6sdMgNdUIzcWzWux97EBTtXic.jpg" },
  { id: 228150, title: "Fury", year: 2014, genre: "War · Drama", poster: "/pfte7wdMobMF4CVHuOxyu6oqeeA.jpg" },
  { id: 9502, title: "Kung Fu Panda", year: 2008, genre: "Animation · Family", poster: "/wWt4JYXTg5Wr3xBW2phBrMKgp3x.jpg" },
  { id: 14161, title: "2012", year: 2009, genre: "Action · Adventure", poster: "/c2PkTPT5D9zB8SIm5wNlDAANEqM.jpg" },
  { id: 8689, title: "Cannibal Holocaust", year: 1980, genre: "Horror", poster: "/otxZzMh53TsN7yYFqSZ3rwH1yMd.jpg" },
  { id: 385687, title: "Fast X", year: 2023, genre: "Action · Crime", poster: "/fiVW06jE7z9YnO4trhaMEdclSiC.jpg" },
  { id: 49026, title: "The Dark Knight Rises", year: 2012, genre: "Action · Crime", poster: "/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg" },
  { id: 412117, title: "The Secret Life of Pets 2", year: 2019, genre: "Family · Comedy", poster: "/s9xg4V5EDKiphgIksVJ9gewBM11.jpg" },
  { id: 1403735, title: "Laila", year: 2025, genre: "Comedy · Romance", poster: "/aFogllaRGlAhk1nqvVGFpZpl4qU.jpg" },
  { id: 447365, title: "Guardians of the Galaxy Vol. 3", year: 2023, genre: "Science Fiction · Adventure", poster: "/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg" },
  { id: 1214931, title: "Nuremberg", year: 2025, genre: "History · Drama", poster: "/7cWTGH2svfNHWVRjsfKIBob9pDj.jpg" },
  { id: 585032, title: "Sa Bang-ji", year: 1988, genre: "Drama · Romance", poster: "/uFsTrW5qzU2l3YE0ataLoUgfsjJ.jpg" },
  { id: 396535, title: "Train to Busan", year: 2016, genre: "Horror · Thriller", poster: "/vNVFt6dtcqnI7hqa6LFBUibuFiw.jpg" },
  { id: 259694, title: "How to Be Single", year: 2016, genre: "Comedy · Romance", poster: "/a4Ce3qHqIyHM3QfGsiVTAu3YADJ.jpg" },
  { id: 460465, title: "Mortal Kombat", year: 2021, genre: "Action · Fantasy", poster: "/ybrX94xQm8lXYpZAPRmwD9iIbWP.jpg" },
  { id: 786892, title: "Furiosa: A Mad Max Saga", year: 2024, genre: "Action · Science Fiction", poster: "/iADOJ8Zymht2JPMoy3R7xceZprc.jpg" },
  { id: 953, title: "Madagascar", year: 2005, genre: "Adventure · Animation", poster: "/zMpJY5CJKUufG9OTw0In4eAFqPX.jpg" },
  { id: 1100988, title: "28 Years Later", year: 2025, genre: "Horror · Thriller", poster: "/n5FygjEppOvac6yEaowi26nTyw3.jpg" },
  { id: 447273, title: "Snow White", year: 2025, genre: "Family · Fantasy", poster: "/oLxWocqheC8XbXbxqJ3x422j9PW.jpg" },
  { id: 103, title: "Taxi Driver", year: 1976, genre: "Crime · Drama", poster: "/ekstpH614fwDX8DUln1a2Opz0N8.jpg" },
  { id: 286217, title: "The Martian", year: 2015, genre: "Science Fiction · Drama", poster: "/fASz8A0yFE3QB6LgGoOfwvFSseV.jpg" },
  { id: 76341, title: "Mad Max: Fury Road", year: 2015, genre: "Action · Adventure", poster: "/hA2ple9q4qnwxp3hKVNhroipsir.jpg" },
  { id: 290098, title: "The Handmaiden", year: 2016, genre: "Thriller · Drama", poster: "/dLlH4aNHdnmf62umnInL8xPlPzw.jpg" },
  { id: 205596, title: "The Imitation Game", year: 2014, genre: "History · Drama", poster: "/zSqJ1qFq8NXFfi7JeIYMlzyR0dx.jpg" },
  { id: 1071585, title: "M3GAN 2.0", year: 2025, genre: "Action · Science Fiction", poster: "/oekamLQrwlJjRNmfaBE4llIvkir.jpg" },
  { id: 1327862, title: "Regretting You", year: 2025, genre: "Romance · Drama", poster: "/z4gVnxTaks3anTycwKjDmvQSuWt.jpg" },
  { id: 283995, title: "Guardians of the Galaxy Vol. 2", year: 2017, genre: "Science Fiction · Adventure", poster: "/y4MBh0EjBlMuOzv9axM4qJlmhzz.jpg" },
  { id: 1043197, title: "Dust Bunny", year: 2025, genre: "Fantasy · Action", poster: "/qa5aZpO8tQqhlDaE0flalS1TuIS.jpg" },
  { id: 453395, title: "Doctor Strange in the Multiverse of Madness", year: 2022, genre: "Fantasy · Action", poster: "/ddJcSKbcp4rKZTmuyWaMhuwcfMz.jpg" },
  { id: 337167, title: "Fifty Shades Freed", year: 2018, genre: "Drama · Romance", poster: "/jjPJ4s3DWZZvI4vw8Xfi4Vqa1Q8.jpg" },
  { id: 128, title: "Princess Mononoke", year: 1997, genre: "Adventure · Fantasy", poster: "/cMYCDADoLKLbB83g4WnJegaZimC.jpg" },
  { id: 1865, title: "Pirates of the Caribbean: On Stranger Tides", year: 2011, genre: "Adventure · Action", poster: "/keGfSvCmYj7CvdRx36OdVrAEibE.jpg" },
  { id: 573435, title: "Bad Boys: Ride or Die", year: 2024, genre: "Action · Comedy", poster: "/oGythE98MYleE6mZlGs5oBGkux1.jpg" },
  { id: 1396, title: "Mirror", year: 1975, genre: "Drama · History", poster: "/AttDP5OEsMxtHPPN7Z92p2Ntnmd.jpg" },
  { id: 1321179, title: "The King's Warden", year: 2026, genre: "History · Drama", poster: "/3CnVA1jAA64Q3qNVAW8DekCu19b.jpg" },
  { id: 1252309, title: "Tell Me What You Want", year: 2024, genre: "Romance · Drama", poster: "/yZXYCiZQPB7Ui6D5206W1zDKv8P.jpg" },
  { id: 346364, title: "It", year: 2017, genre: "Horror · Thriller", poster: "/9E2y5Q7WlCVNEhP5GiVTjhEhx1o.jpg" },
  { id: 11036, title: "The Notebook", year: 2004, genre: "Romance · Drama", poster: "/rNzQyW4f8B8cQeg7Dgj3n6eT5k9.jpg" },
  { id: 20352, title: "Despicable Me", year: 2010, genre: "Family · Comedy", poster: "/b1BT309QWjtFUlJPLmXmrcHOWEL.jpg" },
  { id: 1266990, title: "Kulong", year: 2024, genre: "Drama", poster: "/AnzrE2WHg3DtZrtmB9AnEbAh17m.jpg" },
  { id: 1243741, title: "Ballistic", year: 2026, genre: "Action · Thriller", poster: "/mTcXNQHnabavseapSfcAKhTnC3V.jpg" },
  { id: 713704, title: "Evil Dead Rise", year: 2023, genre: "Horror · Thriller", poster: "/5ik4ATKmNtmJU6AYD0bLm56BCVM.jpg" },
  { id: 940721, title: "Godzilla Minus One", year: 2023, genre: "Science Fiction · Horror", poster: "/2E2WTX0TJEflAged6kzErwqX1kt.jpg" },
  { id: 561, title: "Constantine", year: 2005, genre: "Fantasy · Action", poster: "/vPYgvd2MwHlxTamAOjwVQp4qs1W.jpg" },
  { id: 284054, title: "Black Panther", year: 2018, genre: "Action · Adventure", poster: "/uxzzxijgPIY7slzFvMotPv8wjKA.jpg" },
  { id: 38365, title: "Grown Ups", year: 2010, genre: "Comedy", poster: "/cQGM5k1NtU85n4TUlrOrwijSCcm.jpg" },
  { id: 766507, title: "Prey", year: 2022, genre: "Thriller · Action", poster: "/2FKjLRt7oK1bRRIrxgWmthbBdFh.jpg" },
  { id: 105864, title: "The Good Dinosaur", year: 2015, genre: "Adventure · Animation", poster: "/8RSkxOO80btfKjyiC5ZiTaCHIT8.jpg" },
  { id: 131631, title: "The Hunger Games: Mockingjay - Part 1", year: 2014, genre: "Science Fiction · Adventure", poster: "/4FAA18ZIja70d1Tu5hr5cj2q1sB.jpg" },
  { id: 284053, title: "Thor: Ragnarok", year: 2017, genre: "Action · Science Fiction", poster: "/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg" },
  { id: 558449, title: "Gladiator II", year: 2024, genre: "Action · Adventure", poster: "/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg" },
  { id: 246, title: "Zatoichi", year: 2003, genre: "Adventure · Drama", poster: "/iCIycswWbX1EDS6PYYBcR9ohrC.jpg" },
  { id: 801335, title: "Girl in the Basement", year: 2021, genre: "Thriller · Crime", poster: "/tPP9n6r5QrIKPnshnJqE7klptj2.jpg" },
  { id: 291805, title: "Now You See Me 2", year: 2016, genre: "Crime · Thriller", poster: "/A81kDB6a1K86YLlcOtZB27jriJh.jpg" },
  { id: 311, title: "Once Upon a Time in America", year: 1984, genre: "Drama · Crime", poster: "/i0enkzsL5dPeneWnjl1fCWm6L7k.jpg" },
  { id: 926393, title: "The Equalizer 3", year: 2023, genre: "Action · Thriller", poster: "/b0Ej6fnXAP8fK75hlyi2jKqdhHz.jpg" },
  { id: 10625, title: "Mean Girls", year: 2004, genre: "Drama · Comedy", poster: "/fXm3YKXAEjx7d2tIWDg9TfRZtsU.jpg" },
  { id: 1276038, title: "A Desert", year: 2025, genre: "Horror · Thriller", poster: "/vd194U3uHmxs5rZBV2QU7HNDdEf.jpg" },
  { id: 28, title: "Apocalypse Now", year: 1979, genre: "Drama · War", poster: "/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg" },
  { id: 150689, title: "Cinderella", year: 2015, genre: "Romance · Fantasy", poster: "/j91LJmcWo16CArFOoapsz84bwxb.jpg" },
  { id: 809, title: "Shrek 2", year: 2004, genre: "Animation · Family", poster: "/2yYP0PQjG8zVqturh1BAqu2Tixl.jpg" },
  { id: 209112, title: "Batman v Superman: Dawn of Justice", year: 2016, genre: "Action · Adventure", poster: "/5UsK3grJvtQrtzEgqNlDljJW96w.jpg" },
  { id: 1022787, title: "Elio", year: 2025, genre: "Adventure · Animation", poster: "/7z8jDiTZZco9moIKpTUImFtTy7o.jpg" },
  { id: 10195, title: "Thor", year: 2011, genre: "Adventure · Fantasy", poster: "/prSfAi1xGrhLQNxVSUFh61xQ4Qy.jpg" },
  { id: 249397, title: "Nymphomaniac: Vol. II", year: 2013, genre: "Drama · Mystery", poster: "/iLUNqgNKuWn667kXCKztSxYbT3k.jpg" },
  { id: 1305781, title: "Blades of the Guardians: Wind Rises in the Desert", year: 2026, genre: "Action · Drama", poster: "/4QZwryGm8l7N5XdEjPchNPl0BV7.jpg" },
  { id: 694, title: "The Shining", year: 1980, genre: "Horror · Thriller", poster: "/uAR0AWqhQL1hQa69UDEbb2rE5Wx.jpg" },
  { id: 945961, title: "Alien: Romulus", year: 2024, genre: "Horror · Science Fiction", poster: "/2uSWRTtCG336nuBiG8jOTEUKSy8.jpg" },
  { id: 1414413, title: "Brothers Under Fire", year: 2026, genre: "Action · Thriller", poster: "/e5EKqk9V7N3w0WvYFhl6wSVrMp0.jpg" },
  { id: 10193, title: "Toy Story 3", year: 2010, genre: "Animation · Family", poster: "/AbbXspMOwdvwWZgVN0nabZq03Ec.jpg" },
  { id: 679, title: "Aliens", year: 1986, genre: "Action · Thriller", poster: "/r1x5JGpyqZU8PYhbs4UcrO1Xb6x.jpg" },
  { id: 1584215, title: "The Internship", year: 2026, genre: "Action", poster: "/fYqSOkix4rbDiZW0ACNnvZCpT6X.jpg" },
  { id: 985939, title: "Fall", year: 2022, genre: "Thriller", poster: "/spCAxD99U1A6jsiePFoqdEcY0dG.jpg" },
  { id: 545611, title: "Everything Everywhere All at Once", year: 2022, genre: "Action · Adventure", poster: "/u68AjlvlutfEIcpmbYpKcdi09ut.jpg" },
  { id: 9806, title: "The Incredibles", year: 2004, genre: "Action · Adventure", poster: "/2LqaLgk4Z226KkgPJuiOQ58wvrm.jpg" },
  { id: 436969, title: "The Suicide Squad", year: 2021, genre: "Action · Comedy", poster: "/q61qEyssk2ku3okWICKArlAdhBn.jpg" },
  { id: 1363123, title: "The Family Plan 2", year: 2025, genre: "Action · Comedy", poster: "/semFxuYx6HcrkZzslgAkBqfJvZk.jpg" },
  { id: 24, title: "Kill Bill: Vol. 1", year: 2003, genre: "Action · Crime", poster: "/v7TaX8kXMXs5yFFGR41guUDNcnB.jpg" },
  { id: 1181678, title: "¿Quieres ser mi hijo?", year: 2023, genre: "Comedy · Romance", poster: "/9GuvODahvuFqdhuZ16aBLR4UJoP.jpg" },
  { id: 22512, title: "Sex, Shame & Tears", year: 1999, genre: "Comedy · Drama", poster: "/1j3TiCXSguHi3IGumXKpQymvUKH.jpg" },
  { id: 55846, title: "Blitz", year: 2011, genre: "Crime · Action", poster: "/qjqmhhc7uLub22mhu4V6DjOBwXM.jpg" },
  { id: 49013, title: "Cars 2", year: 2011, genre: "Animation · Family", poster: "/okIz1HyxeVOMzYwwHUjH2pHi74I.jpg" },
  { id: 607, title: "Men in Black", year: 1997, genre: "Action · Adventure", poster: "/uLOmOF5IzWoyrgIF5MfUnh5pa1X.jpg" },
  { id: 425, title: "Ice Age", year: 2002, genre: "Animation · Comedy", poster: "/gLhHHZUzeseRXShoDyC4VqLgsNv.jpg" },
  { id: 1469458, title: "Sambhavam Adhyayam Onnu", year: 2026, genre: "Fantasy · Thriller", poster: "/tBNSo4T0R8UztkkpjYkzXI4bFAT.jpg" },
  { id: 1119878, title: "Ice Road: Vengeance", year: 2025, genre: "Action · Thriller", poster: "/cQN9rZj06rXMVkk76UF1DfBAico.jpg" },
  { id: 772, title: "Home Alone 2: Lost in New York", year: 1992, genre: "Comedy · Family", poster: "/uuitWHpJwxD1wruFl2nZHIb4UGN.jpg" },
  { id: 546554, title: "Knives Out", year: 2019, genre: "Comedy · Crime", poster: "/pThyQovXQrw2m0s9x82twj48Jq4.jpg" },
  { id: 1313168, title: "Toujours possible", year: 2025, genre: "Comedy · Romance", poster: "/qwklLRMLoCq6StEcLkTjmX1fdoM.jpg" },
  { id: 1480382, title: "The Voice of Hind Rajab", year: 2025, genre: "Drama · History", poster: "/q7M8kQB46T11vmDMD6E239jsqTz.jpg" },
  { id: 80785, title: "Amazon Jail", year: 1982, genre: "Thriller · Adventure", poster: "/ob0TfLdSvNvRCPM09a9E4iAbugX.jpg" },
  { id: 18785, title: "The Hangover", year: 2009, genre: "Comedy", poster: "/A0uS9rHR56FeBtpjVki16M5xxSW.jpg" },
  { id: 857, title: "Saving Private Ryan", year: 1998, genre: "War · Drama", poster: "/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg" },
  { id: 497698, title: "Black Widow", year: 2021, genre: "Action · Adventure", poster: "/7JPpIjhD2V0sKyFvhB9khUMa30d.jpg" },
  { id: 78, title: "Blade Runner", year: 1982, genre: "Science Fiction · Drama", poster: "/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg" },
  { id: 454626, title: "Sonic the Hedgehog", year: 2020, genre: "Action · Science Fiction", poster: "/aQvJ5WPzZgYVDrxLX4R6cLJCEaQ.jpg" },
  { id: 1228710, title: "Star Wars: The Mandalorian and Grogu", year: 2026, genre: "Action · Adventure", poster: "/7QujwMB124KqSPbWlLRHBO5wygE.jpg" },
  { id: 68718, title: "Django Unchained", year: 2012, genre: "Drama · Western", poster: "/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg" },
  { id: 646385, title: "Scream", year: 2022, genre: "Horror · Mystery", poster: "/1m3W6cpgwuIyjtg5nSnPx7yFkXW.jpg" },
  { id: 640, title: "Catch Me If You Can", year: 2002, genre: "Drama · Crime", poster: "/ctjEj2xM32OvBXCq8zAdK3ZrsAj.jpg" },
  { id: 1236814, title: "Swapping Workshop for Middle-aged Couples", year: 2023, genre: "Romance", poster: "/1iVFVLcw9VN1P9kSrit8uw0iBUH.jpg" },
  { id: 7485, title: "Shooter", year: 2007, genre: "Drama · Action", poster: "/2aWGxo1E5polpBjPvtBRkWp7qaS.jpg" },
  { id: 948, title: "Halloween", year: 1978, genre: "Horror · Thriller", poster: "/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg" },
  { id: 1430, title: "Bowling for Columbine", year: 2002, genre: "Documentary · Drama", poster: "/5AlgeysilsfLdEwlTlYO7fqgsLn.jpg" },
  { id: 424694, title: "Bohemian Rhapsody", year: 2018, genre: "Music · Drama", poster: "/lHu1wtNaczFPGFDTrjCSzeLPTKN.jpg" },
  { id: 510, title: "One Flew Over the Cuckoo's Nest", year: 1975, genre: "Drama", poster: "/kjWsMh72V6d8KRLV4EOoSJLT1H7.jpg" },
  { id: 1124, title: "The Prestige", year: 2006, genre: "Drama · Mystery", poster: "/Ag2B2KHKQPukjH7WutmgnnSNurZ.jpg" },
  { id: 420818, title: "The Lion King", year: 2019, genre: "Adventure · Drama", poster: "/dzBtMocZuJbjLOXvrl4zGYigDzh.jpg" },
  { id: 588228, title: "The Tomorrow War", year: 2021, genre: "Action · Science Fiction", poster: "/34nDCQZwaEvsy4CFO5hkGRFDCVU.jpg" },
  { id: 118, title: "Charlie and the Chocolate Factory", year: 2005, genre: "Adventure · Comedy", poster: "/iKP6wg3c6COUe8gYutoGG7qcPnO.jpg" },
  { id: 423, title: "The Pianist", year: 2002, genre: "Drama · War", poster: "/2hFvxCCWrTmCYwfy7yum0GKRi3Y.jpg" },
  { id: 737057, title: "Suspicious Practice Room: Special Treatment of Mother's Friend", year: 2018, genre: "Drama · Romance", poster: "/sP1s76Er7RlV9FyfMkrEowE1wk6.jpg" },
  { id: 72105, title: "Ted", year: 2012, genre: "Comedy · Fantasy", poster: "/1QVZXQQHCEIj8lyUhdBYd2qOYtq.jpg" },
  { id: 399579, title: "Alita: Battle Angel", year: 2019, genre: "Action · Science Fiction", poster: "/xRWht48C2V8XNfzvPehyClOvDni.jpg" },
  { id: 746036, title: "The Fall Guy", year: 2024, genre: "Action · Comedy", poster: "/e7olqFmzcIX5c23kX4zSmLPJi8c.jpg" },
  { id: 378064, title: "A Silent Voice: The Movie", year: 2016, genre: "Animation · Drama", poster: "/tuFaWiqX0TXoWu7DGNcmX3UW7sT.jpg" },
  { id: 1144107, title: "The Legend of Hei 2", year: 2025, genre: "Animation · Fantasy", poster: "/ewZaW4gXqqllOelUpS98T49z6Gl.jpg" },
  { id: 1097549, title: "Babygirl", year: 2024, genre: "Romance · Thriller", poster: "/ilwO6elz3mLV9CToT7C8pjVeKX0.jpg" },
  { id: 4951, title: "10 Things I Hate About You", year: 1999, genre: "Comedy · Romance", poster: "/ujERk3aKABXU3NDXOAxEQYTHe9A.jpg" },
  { id: 670292, title: "The Creator", year: 2023, genre: "Science Fiction · Action", poster: "/3dSivDtOuyxLDxPH4v2tcNG1fP7.jpg" },
  { id: 335983, title: "Venom", year: 2018, genre: "Science Fiction · Action", poster: "/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg" },
  { id: 615457, title: "Nobody", year: 2021, genre: "Action · Thriller", poster: "/oBgWY00bEFeZ9N25wWVyuQddbAo.jpg" },
  { id: 979, title: "Irreversible", year: 2002, genre: "Drama · Thriller", poster: "/rxeDxo8FvZpLu6iplNpxdtAVnfu.jpg" },
  { id: 3558, title: "Girl, Interrupted", year: 1999, genre: "Drama", poster: "/dOBdatHIVppvmRFw2z7bf9VKJr9.jpg" },
  { id: 324552, title: "John Wick: Chapter 2", year: 2017, genre: "Action · Thriller", poster: "/hXWBc0ioZP3cN4zCu6SN3YHXZVO.jpg" },
  { id: 466272, title: "Once Upon a Time... in Hollywood", year: 2019, genre: "Comedy · Drama", poster: "/8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg" },
  { id: 854, title: "The Mask", year: 1994, genre: "Comedy · Fantasy", poster: "/jPC2eYub74zwf2tPGVtzSlBW6Oy.jpg" },
  { id: 4232, title: "Scream", year: 1996, genre: "Crime · Horror", poster: "/lr9ZIrmuwVmZhpZuTCW8D9g0ZJe.jpg" },
  { id: 43347, title: "Love & Other Drugs", year: 2010, genre: "Drama · Comedy", poster: "/wZLM2uKJRYNchLmiCIjosX0rXy8.jpg" },
  { id: 505642, title: "Black Panther: Wakanda Forever", year: 2022, genre: "Action · Adventure", poster: "/sv1xJUazXeYqALzczSZ3O6nkH75.jpg" },
  { id: 345, title: "Eyes Wide Shut", year: 1999, genre: "Drama · Thriller", poster: "/knEIz1eNGl5MQDbrEAVWA7iRqF9.jpg" },
  { id: 321612, title: "Beauty and the Beast", year: 2017, genre: "Family · Fantasy", poster: "/hKegSKIDep2ewJWPUQD7u0KqFIp.jpg" },
  { id: 578, title: "Jaws", year: 1975, genre: "Horror · Thriller", poster: "/tjbLSFwi0I3phZwh8zoHWNfbsEp.jpg" },
  { id: 1294203, title: "My Fault: London", year: 2025, genre: "Drama · Romance", poster: "/ttN5D6GKOwKWHmCzDGctAvaNMAi.jpg" },
  { id: 812, title: "Aladdin", year: 1992, genre: "Animation · Family", poster: "/eLFfl7vS8dkeG1hKp5mwbm37V83.jpg" },
  { id: 637, title: "Life Is Beautiful", year: 1997, genre: "Comedy · Drama", poster: "/mfnkSeeVOBVheuyn2lo4tfmOPQb.jpg" },
  { id: 645710, title: "The Voyeurs", year: 2021, genre: "Thriller", poster: "/8Y4XOIWhpOvSOEn8XrxbkH9yAXO.jpg" },
  { id: 967941, title: "Wicked: For Good", year: 2025, genre: "Fantasy · Adventure", poster: "/si9tolnefLSUKaqQEGz1bWArOaL.jpg" },
  { id: 507086, title: "Jurassic World Dominion", year: 2022, genre: "Adventure · Action", poster: "/jbAvCACjLf1ZG0unB2tdmx5HAf1.jpg" },
  { id: 1242501, title: "Icefall", year: 2025, genre: "Action · Crime", poster: "/5Byv6nznAb2Izd0gHpODOXnuSbo.jpg" },
  { id: 490132, title: "Green Book", year: 2018, genre: "Drama · Comedy", poster: "/7BsvSuDQuoqhWmU2fL7W2GOcZHU.jpg" },
  { id: 629, title: "The Usual Suspects", year: 1995, genre: "Drama · Crime", poster: "/99X2SgyFunJFXGAYnDv3sb9pnUD.jpg" },
  { id: 6479, title: "I Am Legend", year: 2007, genre: "Drama · Science Fiction", poster: "/iPDkaSdKk2jRLTM65UOEoKtsIZ8.jpg" },
  { id: 1813, title: "The Devil's Advocate", year: 1997, genre: "Horror · Drama", poster: "/5ZzBGpxy55OQzHxKVY11IpY6a0o.jpg" },
  { id: 383498, title: "Deadpool 2", year: 2018, genre: "Action · Comedy", poster: "/to0spRl1CMDvyUbOnbb4fTk3VAd.jpg" },
  { id: 2109, title: "Rush Hour", year: 1998, genre: "Action · Comedy", poster: "/3WsLE6FtxEPRa6U9sbY1ckrn39s.jpg" },
  { id: 812037, title: "Last Summer", year: 2023, genre: "Drama", poster: "/a94IHwd6t2oXKy5KWTvaEnAs6Ux.jpg" },
  { id: 773543, title: "Fib the Truth", year: 2021, genre: "Drama · Thriller", poster: "/fPUI4KHQKggOdJg9YIBCFEecuU5.jpg" },
  { id: 458156, title: "John Wick: Chapter 3 - Parabellum", year: 2019, genre: "Action · Thriller", poster: "/ziEuG1essDuWuC5lpWUaw1uXY2O.jpg" },
  { id: 242582, title: "Nightcrawler", year: 2014, genre: "Crime · Drama", poster: "/j9HrX8f7GbZQm1BrBiR40uFQZSb.jpg" },
  { id: 10674, title: "Mulan", year: 1998, genre: "Animation · Family", poster: "/jAbexAtB0aSfP5Ay4TpWHARyVnG.jpg" },
  { id: 176, title: "Saw", year: 2004, genre: "Horror · Mystery", poster: "/rLNSOudrayDBo1uqXjrhxcjODIC.jpg" },
  { id: 75656, title: "Now You See Me", year: 2013, genre: "Thriller · Crime", poster: "/tWsNYbrqy1p1w6K9zRk0mSchztT.jpg" },
  { id: 12155, title: "Alice in Wonderland", year: 2010, genre: "Family · Fantasy", poster: "/o0kre9wRCZz3jjSjaru7QU0UtFz.jpg" },
  { id: 1359, title: "American Psycho", year: 2000, genre: "Thriller · Drama", poster: "/9uGHEgsiUXjCNq8wdq4r49YL8A1.jpg" },
  { id: 934433, title: "Scream VI", year: 2023, genre: "Horror · Thriller", poster: "/wDWwtvkRRlgTiUr6TyLSMX8FCuZ.jpg" },
  { id: 269955, title: "Obsessed", year: 2014, genre: "Drama", poster: "/fetCtoAvZShCk1nqAWZFuKZschR.jpg" },
  { id: 1426964, title: "State of Fear", year: 2026, genre: "Action · Thriller", poster: "/3Eaqedg8MAlnP51GYY8MCSIdTnV.jpg" },
  { id: 572802, title: "Aquaman and the Lost Kingdom", year: 2023, genre: "Action · Adventure", poster: "/7lTnXOy0iNtBAdRP3TZvaKJ77F6.jpg" },
  { id: 426063, title: "Nosferatu", year: 2024, genre: "Horror · Fantasy", poster: "/5qGIxdEO841C0tdY8vOdLoRVrr0.jpg" },
  { id: 920, title: "Cars", year: 2006, genre: "Animation · Adventure", poster: "/2Touk3m5gzsqr1VsvxypdyHY5ci.jpg" },
  { id: 298618, title: "The Flash", year: 2023, genre: "Action · Science Fiction", poster: "/rktDFPbfHfUbArZ6OOOKsXcv0Bm.jpg" },
  { id: 628847, title: "Trap House", year: 2025, genre: "Action · Crime", poster: "/6tpAPeuuqbVnYWWPoOLEDLSBU7a.jpg" },
  { id: 343611, title: "Jack Reacher: Never Go Back", year: 2016, genre: "Action · Thriller", poster: "/cOg3UT2NYWHZxp41vpxAnVCOC4M.jpg" },
  { id: 489, title: "Good Will Hunting", year: 1997, genre: "Drama", poster: "/z2FnLKpFi1HPO7BEJxdkv6hpJSU.jpg" },
  { id: 419430, title: "Get Out", year: 2017, genre: "Mystery · Thriller", poster: "/mE24wUCfjK8AoBBjaMjho7Rczr7.jpg" },
  { id: 64641, title: "Monika", year: 1974, genre: "Romance · Drama", poster: "/y8Byo8Mwd1a9JwISWLYR0zVxA5.jpg" },
  { id: 263115, title: "Logan", year: 2017, genre: "Action · Drama", poster: "/fnbjcRDYn6YviCcePDnGdyAkYsB.jpg" },
  { id: 76492, title: "Hotel Transylvania", year: 2012, genre: "Animation · Comedy", poster: "/eJGvzGrsfe2sqTUPv5IwLWXjVuR.jpg" },
  { id: 297762, title: "Wonder Woman", year: 2017, genre: "Action · Adventure", poster: "/v4ncgZjG2Zu8ZW5al1vIZTsSjqX.jpg" },
  { id: 57158, title: "The Hobbit: The Desolation of Smaug", year: 2013, genre: "Fantasy · Adventure", poster: "/xQYiXsheRCDBA39DOrmaw1aSpbk.jpg" },
  { id: 1381216, title: "Gator Lake", year: 2024, genre: "Horror · Comedy", poster: "/pmyZSaHKQZmASqKVqqGfy2agOaR.jpg" },
  { id: 616037, title: "Thor: Love and Thunder", year: 2022, genre: "Fantasy · Action", poster: "/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg" },
  { id: 36557, title: "Casino Royale", year: 2006, genre: "Adventure · Action", poster: "/lMrxYKKhd4lqRzwUHAy5gcx9PSO.jpg" },
  { id: 1735, title: "The Mummy: Tomb of the Dragon Emperor", year: 2008, genre: "Adventure · Action", poster: "/A3acM1lX5PNWQa6r5qeMAJOxbnT.jpg" },
  { id: 297802, title: "Aquaman", year: 2018, genre: "Action · Adventure", poster: "/ufl63EFcc5XpByEV2Ecdw6WJZAI.jpg" },
  { id: 1336770, title: "Vaazha II", year: 2026, genre: "Comedy · Drama", poster: "/1yLZ7kExd0UGGbaZW4LxmYD4OIf.jpg" },
  { id: 1302007, title: "Kaulayaw", year: 2024, genre: "Drama", poster: "/qifjfp5a2gHQ0WsGhTvlamPshnH.jpg" },
  { id: 530385, title: "Midsommar", year: 2019, genre: "Horror · Drama", poster: "/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg" },
  { id: 19404, title: "Dilwale Dulhania Le Jayenge", year: 1995, genre: "Comedy · Drama", poster: "/2CAL2433ZeIihfX1Hb2139CX0pW.jpg" },
  { id: 420817, title: "Aladdin", year: 2019, genre: "Adventure · Fantasy", poster: "/ykUEbfpkf8d0w49pHh0AD2KrT52.jpg" },
  { id: 296096, title: "Me Before You", year: 2016, genre: "Drama · Romance", poster: "/Ia3dzj5LnCj1ZBdlVeJrbKJQxG.jpg" },
  { id: 1422, title: "The Departed", year: 2006, genre: "Drama · Thriller", poster: "/nT97ifVT2J1yMQmeq20Qblg61T.jpg" },
  { id: 1522377, title: "Two Worlds One Wish", year: 2025, genre: "Romance · Drama", poster: "/mZcwX1aN2RdCLwamxdkoINIhVAm.jpg" },
  { id: 246655, title: "X-Men: Apocalypse", year: 2016, genre: "Science Fiction · Fantasy", poster: "/2mtQwJKVKQrZgTz49Dizb25eOQQ.jpg" },
  { id: 624860, title: "The Matrix Resurrections", year: 2021, genre: "Science Fiction · Action", poster: "/8c4a8kE7PizaGQQnditMmI1xbRp.jpg" },
  { id: 575264, title: "Mission: Impossible - Dead Reckoning Part One", year: 2023, genre: "Action · Thriller", poster: "/NNxYkU70HPurnNCSiCjYAmacwm.jpg" },
  { id: 812583, title: "Wake Up Dead Man: A Knives Out Mystery", year: 2025, genre: "Thriller · Mystery", poster: "/qCOGGi8JBVEZMc3DVby8rUivyXz.jpg" },
  { id: 62177, title: "Brave", year: 2012, genre: "Animation · Family", poster: "/1XAuDtMWpL0sYSFK0R6EZate2Ux.jpg" },
  { id: 85, title: "Raiders of the Lost Ark", year: 1981, genre: "Adventure · Action", poster: "/ceG9VzoRAVGwivFU403Wc3AHRys.jpg" },
  { id: 1010756, title: "The Strangers: Chapter 2", year: 2025, genre: "Horror · Thriller", poster: "/pqADzs5SJvI2jC0DThPVMuNJcWS.jpg" },
  { id: 9552, title: "The Exorcist", year: 1973, genre: "Horror · Drama", poster: "/5x0CeVHJI8tcDx8tUUwYHQSNILq.jpg" },
  { id: 22832, title: "Ninja Assassin", year: 2009, genre: "Action · Adventure", poster: "/ipJ4mgqse6uoTRsDyU3TXmva1rt.jpg" },
  { id: 11770, title: "Shaolin Soccer", year: 2001, genre: "Action · Comedy", poster: "/z6ZQqwoxWy9muIxwUP4K2zWw7BU.jpg" },
  { id: 1198984, title: "We Bury the Dead", year: 2026, genre: "Horror · Thriller", poster: "/xZqo0yPARmyF8TACVNyaOACkYWG.jpg" },
  { id: 696506, title: "Mickey 17", year: 2025, genre: "Science Fiction · Comedy", poster: "/edKpE9B5qN3e559OuMCLZdW1iBZ.jpg" },
  { id: 50646, title: "Crazy, Stupid, Love.", year: 2011, genre: "Comedy · Drama", poster: "/p4RafgAPk558muOjnBMHhMArjS2.jpg" },
  { id: 653346, title: "Kingdom of the Planet of the Apes", year: 2024, genre: "Science Fiction · Adventure", poster: "/gKkl37BQuKTanygYQG1pyYgLVgf.jpg" },
  { id: 64690, title: "Drive", year: 2011, genre: "Drama · Thriller", poster: "/602vevIURmpDfzbnv5Ubi6wIkQm.jpg" },
  { id: 500, title: "Reservoir Dogs", year: 1992, genre: "Crime · Thriller", poster: "/xi8Iu6qyTfyZVDVy60raIOYJJmk.jpg" },
  { id: 161, title: "Ocean's Eleven", year: 2001, genre: "Thriller · Crime", poster: "/hQQCdZrsHtZyR6NbKH2YyCqd2fR.jpg" },
  { id: 38575, title: "The Karate Kid", year: 2010, genre: "Action · Adventure", poster: "/b1RBy3l297N0c7PHjlz35cClWju.jpg" },
  { id: 701387, title: "Bugonia", year: 2025, genre: "Science Fiction · Thriller", poster: "/oxgsAQDAAxA92mFGYCZllgWkH9J.jpg" },
  { id: 8392, title: "My Neighbor Totoro", year: 1988, genre: "Fantasy · Animation", poster: "/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg" },
  { id: 181812, title: "Star Wars: The Rise of Skywalker", year: 2019, genre: "Adventure · Action", poster: "/db32LaOibwEliAmSL2jjDF6oDdj.jpg" },
  { id: 1215106, title: "Ko Ga Loak Village", year: 2025, genre: "Comedy · Horror", poster: "/jt31qZw5W1RFXfGyTJCpgjvq2h1.jpg" },
  { id: 1366, title: "Rocky", year: 1976, genre: "Drama", poster: "/hEjK9A9BkNXejFW4tfacVAEHtkn.jpg" },
  { id: 1011477, title: "Karate Kid: Legends", year: 2025, genre: "Action · Adventure", poster: "/c90Lt7OQGsOmhv6x4JoFdoHzw5l.jpg" },
  { id: 1248226, title: "Playdate", year: 2025, genre: "Action · Comedy", poster: "/fGodXWqJkkkbSebPIlxLSygV8GY.jpg" },
  { id: 621, title: "Grease", year: 1978, genre: "Romance · Comedy", poster: "/2rM7fQKpb7cs1Iq7IBqub9LFDzJ.jpg" },
  { id: 404368, title: "Ralph Breaks the Internet", year: 2018, genre: "Animation · Family", poster: "/iVCrhBcpDaHGvv7CLYbK6PuXZo1.jpg" },
  { id: 47971, title: "xXx: Return of Xander Cage", year: 2017, genre: "Action · Adventure", poster: "/hba8zREJpP1AYhaXgb2oJLQeO0K.jpg" },
  { id: 284052, title: "Doctor Strange", year: 2016, genre: "Fantasy · Adventure", poster: "/xf8PbyQcR5ucXErmZNzdKR0s8ya.jpg" },
  { id: 410119, title: "Yu Pui Tsuen II", year: 1987, genre: "Drama · Fantasy", poster: "/3NwBn6zPY6yXCqfxEHmEgGh8Jgc.jpg" },
  { id: 245891, title: "John Wick", year: 2014, genre: "Action · Thriller", poster: "/wXqWR7dHncNRbxoEGybEy7QTe9h.jpg" },
  { id: 10191, title: "How to Train Your Dragon", year: 2010, genre: "Fantasy · Adventure", poster: "/ygGmAO60t8GyqUo9xYeYxSZAR3b.jpg" },
  { id: 68726, title: "Pacific Rim", year: 2013, genre: "Action · Science Fiction", poster: "/8wo4eN8dWKaKlxhSvBz19uvj8gA.jpg" },
  { id: 10830, title: "Matilda", year: 1996, genre: "Comedy · Family", poster: "/wYoDpWInsBEVSmWStnRH06ddoyk.jpg" },
  { id: 10591, title: "The Girl Next Door", year: 2004, genre: "Comedy · Romance", poster: "/5mVyFHSY2rSsNgD4NfEwV82HigU.jpg" },
  { id: 840326, title: "Sisu", year: 2022, genre: "Action · War", poster: "/ygO9lowFMXWymATCrhoQXd6gCEh.jpg" },
  { id: 604, title: "The Matrix Reloaded", year: 2003, genre: "Adventure · Action", poster: "/aA5qHS0FbSXO8PxcxUIHbDrJyuh.jpg" },
  { id: 1401778, title: "Turbulence", year: 2025, genre: "Thriller · Action", poster: "/jRuiKL4S9UpLma2ZlM47xIu2gbe.jpg" },
  { id: 550988, title: "Free Guy", year: 2021, genre: "Comedy · Adventure", poster: "/dxraF0qPr1OEgJk17ltQTO84kQF.jpg" },
  { id: 14574, title: "The Boy in the Striped Pyjamas", year: 2008, genre: "Drama · War", poster: "/2C8QCXdMlojTxZjfBlINr4FWcb6.jpg" },
  { id: 1357449, title: "Ídolos", year: 2026, genre: "Drama · Romance", poster: "/j2gYxk9EQXh2hz1jNZQOe9WOUXU.jpg" },
  { id: 1724, title: "The Incredible Hulk", year: 2008, genre: "Science Fiction · Action", poster: "/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg" },
  { id: 318256, title: "Hot Girls Wanted", year: 2015, genre: "Documentary", poster: "/75ot83QOkc02vujyzmIbumQCU6Y.jpg" },
  { id: 10020, title: "Beauty and the Beast", year: 1991, genre: "Romance · Family", poster: "/hUJ0UvQ5tgE2Z9WpfuduVSdiCiU.jpg" },
  { id: 9769, title: "Lolita", year: 1997, genre: "Drama · Romance", poster: "/9INcC14WZjCMKGE360VXmklCLdZ.jpg" },
  { id: 667538, title: "Transformers: Rise of the Beasts", year: 2023, genre: "Science Fiction · Adventure", poster: "/gPbM0MK8CP8A174rmUwGsADNYKD.jpg" },
  { id: 1271, title: "300", year: 2007, genre: "Action · Adventure", poster: "/h7Lcio0c9ohxPhSZg42eTlKIVVY.jpg" },
  { id: 5236, title: "Kiss Kiss Bang Bang", year: 2005, genre: "Comedy · Crime", poster: "/aWfjIkpENFX6Uw82pET7EQ6jnrd.jpg" },
  { id: 87101, title: "Terminator Genisys", year: 2015, genre: "Science Fiction · Action", poster: "/oZRVDpNtmHk8M1VYy1aeOWUXgbC.jpg" },
  { id: 5175, title: "Rush Hour 2", year: 2001, genre: "Action · Comedy", poster: "/aBQf2vMiCINeVC9v6BGVYKXurTh.jpg" },
  { id: 49521, title: "Man of Steel", year: 2013, genre: "Action · Adventure", poster: "/cB46TSg3kGjq2eVy5kVUhlpUa1H.jpg" },
  { id: 399402, title: "Hunter Killer", year: 2018, genre: "Action · Adventure", poster: "/ng7ukqGaSHOuJZ4GwLJP6AH9ixc.jpg" },
  { id: 1542352, title: "Youth", year: 2026, genre: "Comedy · Romance", poster: "/rNzk0jlGRPnvZ26On5xhTmLaQhO.jpg" },
  { id: 286687, title: "Love Lesson", year: 2013, genre: "Romance · Drama", poster: "/yUQg6yvZIRQUSyQ36TQo0Tp1gzr.jpg" },
  { id: 170, title: "28 Days Later", year: 2002, genre: "Horror · Thriller", poster: "/sQckQRt17VaWbo39GIu0TMOiszq.jpg" },
  { id: 17653, title: "The Legend Of Fong Sai-yuk", year: 1993, genre: "Adventure · Action", poster: "/hdAqW3qn0Y9jNMjDob5ae0NRa0F.jpg" },
  { id: 537915, title: "After", year: 2019, genre: "Drama · Romance", poster: "/u3B2YKUjWABcxXZ6Nm9h10hLUbh.jpg" },
  { id: 1087891, title: "The Amateur", year: 2025, genre: "Thriller · Action", poster: "/SNEoUInCa5fAgwuEBMIMBGvkkh.jpg" },
  { id: 4248, title: "Scary Movie 2", year: 2001, genre: "Comedy", poster: "/7Eb1JWK0Cb0rbfsYjwfc9g0PbQH.jpg" },
  { id: 760104, title: "X", year: 2022, genre: "Horror · Thriller", poster: "/lopZSVtXzhFY603E9OqF7O1YKsh.jpg" },
  { id: 791373, title: "Zack Snyder's Justice League", year: 2021, genre: "Action · Adventure", poster: "/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg" },
  { id: 9470, title: "Kung Fu Hustle", year: 2004, genre: "Action · Comedy", poster: "/exbyTbrvRUDKN2mcNEuVor4VFQW.jpg" },
  { id: 675353, title: "Sonic the Hedgehog 2", year: 2022, genre: "Action · Adventure", poster: "/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg" },
  { id: 260514, title: "Cars 3", year: 2017, genre: "Animation · Drama", poster: "/zg5RDxvIIAKsucjuU2EZJIHEIvz.jpg" },
  { id: 73, title: "American History X", year: 1998, genre: "Drama", poster: "/x2drgoXYZ8484lqyDj7L1CEVR4T.jpg" },
  { id: 373571, title: "Godzilla: King of the Monsters", year: 2019, genre: "Science Fiction · Action", poster: "/mzOHg7Q5q9yUmY0b9Esu8Qe6Nnm.jpg" },
  { id: 101299, title: "The Hunger Games: Catching Fire", year: 2013, genre: "Adventure · Action", poster: "/vrQHDXjVmbYzadOXQ0UaObunoy2.jpg" },
  { id: 740300, title: "Hedon", year: 2019, genre: "Drama", poster: "/wm3o2zyf5inp0017JVVKRJUwxip.jpg" },
  { id: 580489, title: "Venom: Let There Be Carnage", year: 2021, genre: "Science Fiction · Action", poster: "/pzKsRuKLFmYrW5Q0q8E8G78Tcgo.jpg" },
  { id: 27, title: "9 Songs", year: 2004, genre: "Drama · Music", poster: "/91O7z0vo7MiNWd5xD2BoivwbQsb.jpg" },
  { id: 598, title: "City of God", year: 2002, genre: "Drama · Crime", poster: "/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg" },
  { id: 82690, title: "Wreck-It Ralph", year: 2012, genre: "Family · Animation", poster: "/zWoIgZ7mgmPkaZjG0102BSKFIqQ.jpg" },
  { id: 1091, title: "The Thing", year: 1982, genre: "Horror · Mystery", poster: "/tzGY49kseSE9QAKk47uuDGwnSCu.jpg" },
  { id: 843527, title: "The Idea of You", year: 2024, genre: "Music · Comedy", poster: "/Y5P4Q3q8nrruZ9aD3wXeJS2Plg.jpg" },
  { id: 1245347, title: "Twinless", year: 2025, genre: "Comedy · Drama", poster: "/9vaw9Az5tPLMjNLj426KgKsp0k8.jpg" },
  { id: 10192, title: "Shrek Forever After", year: 2010, genre: "Comedy · Adventure", poster: "/6HrfPZtKcGmX2tUWW3cnciZTaSD.jpg" },
  { id: 941109, title: "Play Dirty", year: 2025, genre: "Crime · Action", poster: "/ovZ0zq0NwRghtWI1oLaM0lWuoEw.jpg" },
  { id: 377, title: "A Nightmare on Elm Street", year: 1984, genre: "Horror", poster: "/wGTpGGRMZmyFCcrY2YoxVTIBlli.jpg" },
  { id: 82693, title: "Silver Linings Playbook", year: 2012, genre: "Drama · Comedy", poster: "/fhHB1uvfFKKFbj6bTKE8xdtsjKi.jpg" },
  { id: 745, title: "The Sixth Sense", year: 1999, genre: "Mystery · Thriller", poster: "/vOyfUXNFSnaTk7Vk5AjpsKTUWsu.jpg" },
  { id: 198184, title: "Chappie", year: 2015, genre: "Crime · Action", poster: "/uuDUpzlMFomdSfNWlpEPS9nVZWV.jpg" },
  { id: 764339, title: "An Affair: My Wife's Friend 2", year: 2019, genre: "Drama", poster: "/71F5nIcReEDckIY2FvHE54E0PvN.jpg" },
  { id: 126889, title: "Alien: Covenant", year: 2017, genre: "Horror · Science Fiction", poster: "/zecMELPbU5YMQpC81Z8ImaaXuf9.jpg" },
  { id: 140607, title: "Star Wars: The Force Awakens", year: 2015, genre: "Adventure · Action", poster: "/wqnLdwVXoBjKibFRR5U3y0aDUhs.jpg" },
  { id: 262500, title: "Insurgent", year: 2015, genre: "Action · Science Fiction", poster: "/dP5Fb6YRfzmCQtRbHOr2kO7tJW9.jpg" },
  { id: 1623125, title: "A Gorilla Story: Told by David Attenborough", year: 2026, genre: "Documentary", poster: "/5X6VyjG0YYMbJu94l6xEY2YQvss.jpg" },
  { id: 205587, title: "The Judge", year: 2014, genre: "Drama", poster: "/3K93GWotLXe4FqpErri0xkpLaD5.jpg" },
  { id: 2251, title: "Unfaithful", year: 2002, genre: "Thriller · Drama", poster: "/bjiHEhuiwhIygzjczbTPAA07cGc.jpg" },
  { id: 240832, title: "Lucy", year: 2014, genre: "Action · Science Fiction", poster: "/kRbpUTRNm6QbLQFPFWUcNC4czEm.jpg" },
  { id: 615656, title: "Meg 2: The Trench", year: 2023, genre: "Action · Science Fiction", poster: "/4m1Au3YkjqsxF8iwQy0fPYSxE0h.jpg" },
  { id: 242, title: "The Godfather Part III", year: 1990, genre: "Crime · Drama", poster: "/lm3pQ2QoQ16pextRsmnUbG2onES.jpg" },
  { id: 1406657, title: "Scarlet", year: 2025, genre: "Animation · Action", poster: "/2O2tOyS4kvO9GtFPHpWmbXvfRQv.jpg" },
  { id: 4247, title: "Scary Movie", year: 2000, genre: "Comedy", poster: "/fVQFPRuw3yWXojYDJvA5EoFjUOY.jpg" },
  { id: 152601, title: "Her", year: 2013, genre: "Romance · Science Fiction", poster: "/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg" },
  { id: 273481, title: "Sicario", year: 2015, genre: "Action · Crime", poster: "/lz8vNyXeidqqOdJW9ZjnDAMb5Vr.jpg" },
  { id: 27578, title: "The Expendables", year: 2010, genre: "Thriller · Adventure", poster: "/j09ZkH6R4JWVylBcDai1laCmGw7.jpg" },
  { id: 1455079, title: "You, Me & Tuscany", year: 2026, genre: "Romance · Comedy", poster: "/mJS0IF7Af3WpPRhSTDT6rGpiLzw.jpg" },
  { id: 6977, title: "No Country for Old Men", year: 2007, genre: "Crime · Thriller", poster: "/6d5XOczc226jECq0LIX0siKtgHR.jpg" },
  { id: 718930, title: "Bullet Train", year: 2022, genre: "Action · Comedy", poster: "/j8szC8OgrejDQjjMKSVXyaAjw3V.jpg" },
  { id: 16859, title: "Kiki's Delivery Service", year: 1989, genre: "Animation · Family", poster: "/Aufa4YdZIv4AXpR9rznwVA5SEfd.jpg" },
  { id: 426889, title: "Le Clitoris", year: 2017, genre: "Animation · Documentary", poster: "/osBGGlyIwsnSDIJ3vy83JpH1OUY.jpg" },
  { id: 507089, title: "Five Nights at Freddy's", year: 2023, genre: "Horror · Thriller", poster: "/7BpNtNfxuocYEVREzVMO75hso1l.jpg" },
  { id: 950, title: "Ice Age: The Meltdown", year: 2006, genre: "Animation · Family", poster: "/e23bfKyjOiKJ5uOufFgfO7JO5ug.jpg" },
  { id: 57800, title: "Ice Age: Continental Drift", year: 2012, genre: "Animation · Comedy", poster: "/dfp1BZF7FxbBUyzHvMOI9t8NWDD.jpg" },
  { id: 299537, title: "Captain Marvel", year: 2019, genre: "Action · Adventure", poster: "/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg" },
  { id: 10144, title: "The Little Mermaid", year: 1989, genre: "Animation · Family", poster: "/plcZXvI310FkbwIptvd6rqk63LP.jpg" },
  { id: 4348, title: "Pride & Prejudice", year: 2005, genre: "Drama · Romance", poster: "/o8UhmEbWPHmTUxP0lMuCoqNkbB3.jpg" },
  { id: 796, title: "Cruel Intentions", year: 1999, genre: "Drama · Romance", poster: "/76cCsRtQ5MJBAqoigojXsLXLJwh.jpg" },
  { id: 259693, title: "The Conjuring 2", year: 2016, genre: "Horror", poster: "/zEqyD0SBt6HL7W9JQoWwtd5Do1T.jpg" },
  { id: 359724, title: "Ford v Ferrari", year: 2019, genre: "Drama · Action", poster: "/dR1Ju50iudrOh3YgfwkAU1g2HZe.jpg" },
  { id: 102651, title: "Maleficent", year: 2014, genre: "Fantasy · Adventure", poster: "/bDG3yei6AJlEAK3A5wN7RwFXQ7V.jpg" },
  { id: 124905, title: "Godzilla", year: 2014, genre: "Action · Drama", poster: "/tphkjmQq8WebuVwNXelmjLUXuPJ.jpg" },
  { id: 978592, title: "Sleeping Dogs", year: 2024, genre: "Mystery · Thriller", poster: "/5DwQhh1HvTo7edaOeMX49NUyZqy.jpg" },
  { id: 1421552, title: "Panda Plan: The Magical Tribe", year: 2026, genre: "Action · Comedy", poster: "/asrLPsZMg75SxN1BooggGmpBwRO.jpg" },
  { id: 1418297, title: "The Last Shot", year: 2025, genre: "Crime · Drama", poster: "/3q8l68PtcEVm5KYjbljlcvzMsHH.jpg" },
  { id: 1439112, title: "Muzzle: City of Wolves", year: 2025, genre: "Action · Thriller", poster: "/8qTMRmC07XCGidnKQFLbRM3FoDU.jpg" },
  { id: 374720, title: "Dunkirk", year: 2017, genre: "War · Action", poster: "/b4Oe15CGLL61Ped0RAS9JpqdmCt.jpg" },
  { id: 1426297, title: "Play Dead", year: 2025, genre: "Horror", poster: "/ixWeYfvXT9AbfM0QPb9kwbVLbLV.jpg" },
  { id: 119450, title: "Dawn of the Planet of the Apes", year: 2014, genre: "Science Fiction · Action", poster: "/mSmAc9G25fhOHH45SLEeagR0qi7.jpg" },
  { id: 77, title: "Memento", year: 2000, genre: "Mystery · Thriller", poster: "/fKTPH2WvH8nHTXeBYBVhawtRqtR.jpg" },
  { id: 480530, title: "Creed II", year: 2018, genre: "Drama · Action", poster: "/v3QyboWRoA4O9RbcsqH8tJMe8EB.jpg" },
  { id: 345940, title: "The Meg", year: 2018, genre: "Action · Science Fiction", poster: "/eyWICPcxOuTcDDDbTMOZawoOn8d.jpg" },
  { id: 1630433, title: "The Red Line", year: 2026, genre: "Thriller · Crime", poster: "/q3ROA6OqVA9rWSsC2DzdkPQvxWW.jpg" },
  { id: 162, title: "Edward Scissorhands", year: 1990, genre: "Fantasy · Drama", poster: "/e0FqKFvGPdQNWG8tF9cZBtev9Em.jpg" },
  { id: 2832, title: "Identity", year: 2003, genre: "Mystery · Thriller", poster: "/sYgimsiBywqVwJI8H4sETke8m7v.jpg" },
  { id: 241259, title: "Alice Through the Looking Glass", year: 2016, genre: "Adventure · Family", poster: "/kbGamUkYfgKIYIrU8kW5oc0NatZ.jpg" },
  { id: 36647, title: "Blade", year: 1998, genre: "Horror · Action", poster: "/oWT70TvbsmQaqyphCZpsnQR7R32.jpg" },
  { id: 686, title: "Contact", year: 1997, genre: "Drama · Science Fiction", poster: "/bCpMIywuNZeWt3i5UMLEIc0VSwM.jpg" },
  { id: 73861, title: "A Serbian Film", year: 2010, genre: "Crime · Horror", poster: "/cToUzXZ9AcUylfIt8vnXhiy6Y9m.jpg" },
  { id: 619979, title: "Deep Water", year: 2022, genre: "Drama · Mystery", poster: "/6yRMyWwjuhKg6IU66uiZIGhaSc8.jpg" },
  { id: 1654429, title: "Crush The Wicked", year: 2026, genre: "Action · Crime", poster: "/o4Bq8KtU9hNdxPQOQFlgOC82HRp.jpg" },
  { id: 127585, title: "X-Men: Days of Future Past", year: 2014, genre: "Action · Adventure", poster: "/tYfijzolzgoMOtegh1Y7j2Enorg.jpg" },
  { id: 49530, title: "In Time", year: 2011, genre: "Action · Thriller", poster: "/3Mwj2sIONQckOZP3YwsUXF7U5I4.jpg" },
  { id: 297, title: "Meet Joe Black", year: 1998, genre: "Fantasy · Drama", poster: "/fDPAjvfPMomkKF7cMRmL5Anak61.jpg" },
  { id: 508442, title: "Soul", year: 2020, genre: "Animation · Family", poster: "/6jmppcaubzLF8wkXM36ganVISCo.jpg" },
  { id: 1402, title: "The Pursuit of Happyness", year: 2006, genre: "Drama", poster: "/lBYOKAMcxIvuk9s9hMuecB9dPBV.jpg" },
  { id: 810693, title: "Jujutsu Kaisen 0", year: 2021, genre: "Animation · Action", poster: "/23oJaeBh0FDk2mQ2P240PU9Xxfh.jpg" },
  { id: 1163956, title: "Key and Peele: Super Bowl Special", year: 2015, genre: "Drama", poster: "/mFXj9mINi2os3kGBxg7VtcvSkMa.jpg" },
  { id: 270946, title: "Penguins of Madagascar", year: 2014, genre: "Family · Animation", poster: "/dXbpNrPDZDMEbujFoOxmMNQVMHa.jpg" },
  { id: 508883, title: "The Boy and the Heron", year: 2023, genre: "Animation · Fantasy", poster: "/f4oZTcfGrVTXKTWg157AwikXqmP.jpg" },
  { id: 348893, title: "Boyka: Undisputed IV", year: 2016, genre: "Action · Drama", poster: "/7QGdIJWWTkPhVjpQ0zA6z69khod.jpg" },
  { id: 381288, title: "Split", year: 2017, genre: "Horror · Thriller", poster: "/lli31lYTFpvxVBeFHWoe5PMfW5s.jpg" },
  { id: 253376, title: "In Darkness We Fall", year: 2014, genre: "Horror · Adventure", poster: "/vQgUNCouT5frFxeXx5mXRskOhWJ.jpg" },
  { id: 140638, title: "Pussycat, Pussycat, I Love You", year: 1970, genre: "Comedy", poster: "/5NG3iF6mli8QMJYNsbzWxzW04t4.jpg" },
  { id: 257344, title: "Pixels", year: 2015, genre: "Action · Comedy", poster: "/d26S5EfVXLNxRXqyFy1yyl3qRq3.jpg" },
  { id: 76493, title: "The Dictator", year: 2012, genre: "Comedy", poster: "/n0W7kajF4GFMRk2c0wWwMQqTaDM.jpg" },
  { id: 146233, title: "Prisoners", year: 2013, genre: "Drama · Thriller", poster: "/jsS3a3ep2KyBVmmiwaz3LvK49b1.jpg" },
  { id: 1631917, title: "18th Rose", year: 2026, genre: "Drama · Romance", poster: "/6pUwaXT6tdA6sek8o6SdFYudJDj.jpg" },
  { id: 5879, title: "In the Realm of the Senses", year: 1976, genre: "Drama · Romance", poster: "/AiFQbgjgSXWPfbi9iIYT39iXWMW.jpg" },
  { id: 49519, title: "The Croods", year: 2013, genre: "Animation · Adventure", poster: "/27zvjVOtOi5ped1HSlJKNsKXkFH.jpg" },
  { id: 135397, title: "Jurassic World", year: 2015, genre: "Adventure · Science Fiction", poster: "/rhr4y79GpxQF9IsfJItRXVaoGs4.jpg" },
  { id: 2048, title: "I, Robot", year: 2004, genre: "Action · Science Fiction", poster: "/efwv6F2lGaghjPpBRSINHtoEiZB.jpg" },
  { id: 562, title: "Die Hard", year: 1988, genre: "Action · Thriller", poster: "/7Bjd8kfmDSOzpmhySpEhkUyK2oH.jpg" },
  { id: 280092, title: "Insidious: Chapter 3", year: 2015, genre: "Horror · Thriller", poster: "/iDdGfdNvY1EX0uDdA4Ru77fwMfc.jpg" },
  { id: 474350, title: "It Chapter Two", year: 2019, genre: "Horror · Thriller", poster: "/zfE0R94v1E8cuKAerbskfD3VfUt.jpg" },
  { id: 1949, title: "Zodiac", year: 2007, genre: "Crime · Mystery", poster: "/6YmeO4pB7XTh8P8F960O1uA14JO.jpg" },
  { id: 18, title: "The Fifth Element", year: 1997, genre: "Science Fiction · Action", poster: "/fPtlCO1yQtnoLHOwKtWz7db6RGU.jpg" },
  { id: 11688, title: "The Emperor's New Groove", year: 2000, genre: "Adventure · Animation", poster: "/wwbgkXQBEKtnyIJapk6gUgWkVw8.jpg" },
  { id: 165, title: "Back to the Future Part II", year: 1989, genre: "Adventure · Comedy", poster: "/hQq8xZe5uLjFzSBt4LanNP7SQjl.jpg" },
  { id: 107, title: "Snatch", year: 2000, genre: "Crime · Comedy", poster: "/kJZoAHq1SLDdWjeNGtlHAnGpmFV.jpg" },
  { id: 114, title: "Pretty Woman", year: 1990, genre: "Romance · Comedy", poster: "/hVHUfT801LQATGd26VPzhorIYza.jpg" },
  { id: 1562, title: "28 Weeks Later", year: 2007, genre: "Horror · Thriller", poster: "/oix0aNv1lvW3nUGspUyvSIBlpbs.jpg" },
  { id: 787, title: "Mr. & Mrs. Smith", year: 2005, genre: "Action · Comedy", poster: "/kjD700RtyhveN3ZbOnSvUSne0Qj.jpg" },
  { id: 70981, title: "Prometheus", year: 2012, genre: "Science Fiction · Mystery", poster: "/qsYQflQhOuhDpQ0W2aOcwqgDAeI.jpg" },
  { id: 153104, title: "Wicked Minds", year: 2003, genre: "Mystery · Drama", poster: "/A6A15cDR8mpdOxW4y7UzFanzbM0.jpg" },
  { id: 447332, title: "A Quiet Place", year: 2018, genre: "Horror · Drama", poster: "/nAU74GmpUk7t5iklEp3bufwDq4n.jpg" },
  { id: 308624, title: "The Story of Ong-nyeo", year: 2014, genre: "Romance · Drama", poster: "/rtl4hW2KJHInieeCiGgrDJmMG7s.jpg" },
  { id: 954, title: "Mission: Impossible", year: 1996, genre: "Adventure · Action", poster: "/l5uxY5m5OInWpcExIpKG6AR3rgL.jpg" },
  { id: 1542995, title: "Bonolota Express", year: 2026, genre: "Drama · Comedy", poster: "/wved9mxrbbae8eW0X5ydBfOWsba.jpg" },
  { id: 50620, title: "The Twilight Saga: Breaking Dawn - Part 2", year: 2012, genre: "Fantasy · Drama", poster: "/7IGdPaKujv0BjI0Zd0m0a4CzEjJ.jpg" },
  { id: 259316, title: "Fantastic Beasts and Where to Find Them", year: 2016, genre: "Fantasy · Adventure", poster: "/fLsaFKExQt05yqjoAvKsmOMYvJR.jpg" },
  { id: 49444, title: "Kung Fu Panda 2", year: 2011, genre: "Animation · Family", poster: "/mtqqD00vB4PGRt20gWtGqFhrkd0.jpg" },
  { id: 293167, title: "Kong: Skull Island", year: 2017, genre: "Action · Adventure", poster: "/r2517Vz9EhDhj88qwbDVj8DCRZN.jpg" },
  { id: 9836, title: "Happy Feet", year: 2006, genre: "Animation · Comedy", poster: "/za41IHkj6LnkilfTzv5B2qmthKD.jpg" },
  { id: 49529, title: "John Carter", year: 2012, genre: "Action · Adventure", poster: "/lCxz1Yus07QCQQCb6I0Dr3Lmqpx.jpg" },
  { id: 9902, title: "Wrong Turn", year: 2003, genre: "Horror · Thriller", poster: "/7lyxwOg7SdGff79yKCQmJ3AKWSf.jpg" },
  { id: 10198, title: "The Princess and the Frog", year: 2009, genre: "Animation · Romance", poster: "/v6nAUs62OJ4DXmnnmPFeVmMz8H9.jpg" },
  { id: 687259, title: "Ghost Stories", year: 1982, genre: "Horror", poster: "/m4ALMhsuqOOUkkABvgQWfrgoL8y.jpg" },
  { id: 330457, title: "Frozen II", year: 2019, genre: "Family · Animation", poster: "/mINJaa34MtknCYl5AjtNJzWj8cD.jpg" },
  { id: 301528, title: "Toy Story 4", year: 2019, genre: "Family · Comedy", poster: "/w9kR8qbmQ01HwnvK4alvnQ2ca0L.jpg" },
  { id: 15512, title: "Monsters vs Aliens", year: 2009, genre: "Animation · Family", poster: "/hpHarddVj34j53T7NsoUGdKj4mP.jpg" },
  { id: 588, title: "Silent Hill", year: 2006, genre: "Horror · Mystery", poster: "/r0bEDWO2w4a43K2xTNSF284qOsc.jpg" },
  { id: 257211, title: "The Intern", year: 2015, genre: "Comedy", poster: "/bTQ46fupPbjBfFBHuzfD3hxxL0Q.jpg" },
  { id: 1895, title: "Star Wars: Episode III - Revenge of the Sith", year: 2005, genre: "Adventure · Action", poster: "/xfSAoBEm9MNBjmlNcDYLvLSMlnq.jpg" },
  { id: 1891, title: "The Empire Strikes Back", year: 1980, genre: "Adventure · Action", poster: "/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg" },
  { id: 855, title: "Black Hawk Down", year: 2001, genre: "Action · War", poster: "/7fU5dSqKRL4XHeEUz62rCKBfYok.jpg" },
  { id: 393, title: "Kill Bill: Vol. 2", year: 2004, genre: "Action · Crime", poster: "/2yhg0mZQMhDyvUQ4rG1IZ4oIA8L.jpg" },
  { id: 11544, title: "Lilo & Stitch", year: 2002, genre: "Animation · Family", poster: "/cFuLvQJPoZpuruAtN3rVnMmLIH8.jpg" },
  { id: 439079, title: "The Nun", year: 2018, genre: "Horror", poster: "/sFC1ElvoKGdHJIWRpNB3xWJ9lJA.jpg" },
  { id: 48650, title: "Room in Rome", year: 2010, genre: "Drama · Romance", poster: "/w90ItYf9qagQKVEBr1uFxPomAtf.jpg" },
  { id: 351286, title: "Jurassic World: Fallen Kingdom", year: 2018, genre: "Action · Adventure", poster: "/x2Us3jR6ToMJjbcPbLimYoxf6xr.jpg" },
  { id: 185, title: "A Clockwork Orange", year: 1971, genre: "Science Fiction · Crime", poster: "/4sHeTAp65WrSSuc05nRBKddhBxO.jpg" },
  { id: 207703, title: "Kingsman: The Secret Service", year: 2015, genre: "Crime · Comedy", poster: "/r6q9wZK5a2K51KFj4LWVID6Ja1r.jpg" },
  { id: 206647, title: "Spectre", year: 2015, genre: "Action · Adventure", poster: "/zj8ongFhtWNsVlfjOGo8pSr7PQg.jpg" },
  { id: 298250, title: "Jigsaw", year: 2017, genre: "Horror · Mystery", poster: "/7RwHxhdUNS996JPFNB9a7CJtlwR.jpg" },
  { id: 102899, title: "Ant-Man", year: 2015, genre: "Science Fiction · Adventure", poster: "/rQRnQfUl3kfp78nCWq8Ks04vnq1.jpg" },
  { id: 141, title: "Donnie Darko", year: 2001, genre: "Fantasy · Drama", poster: "/sv7D4vlfIH25lNjQYoXzoOFCYaz.jpg" },
  { id: 9509, title: "Man on Fire", year: 2004, genre: "Action · Drama", poster: "/grCGLCcTHv9TChibzOwzUpykcjB.jpg" },
  { id: 87, title: "Indiana Jones and the Temple of Doom", year: 1984, genre: "Adventure · Action", poster: "/gpdVNUaa4LhRMLfJOPj1AZdhAZ3.jpg" },
  { id: 9426, title: "The Fly", year: 1986, genre: "Horror · Science Fiction", poster: "/8gZWMhJHRvaXdXsNhERtqNHYpH3.jpg" },
  { id: 519465, title: "Queen of Hearts", year: 2019, genre: "Drama", poster: "/dfFVDIgovEfQZn53VRKLV2JQnRJ.jpg" },
  { id: 35739, title: "Do or Die", year: 1991, genre: "Action · Thriller", poster: "/xrAgzeYhng1sQjfjJFJdrcZcFK3.jpg" },
  { id: 484641, title: "Anna", year: 2019, genre: "Action · Adventure", poster: "/2U0oAVAE0lDRhNmJPPYhDW9kQ8t.jpg" },
  { id: 49018, title: "Insidious", year: 2011, genre: "Horror · Thriller", poster: "/1egpmVXuXed58TH2UOnX1nATTrf.jpg" },
  { id: 205458, title: "The Diary of Di-Di", year: 1978, genre: "Drama", poster: "/xGvdOqTOKf3rWG6MQ7eoOGQgf75.jpg" },
  { id: 13186, title: "Wrong Turn 2: Dead End", year: 2007, genre: "Horror · Thriller", poster: "/ow3IMhTVLryZuCEoQznVTTmFYuu.jpg" },
  { id: 38055, title: "Megamind", year: 2010, genre: "Animation · Action", poster: "/uZ9ytt3sPTx62XTfN56ILSuYWRe.jpg" },
  { id: 616, title: "The Last Samurai", year: 2003, genre: "Drama · Action", poster: "/a8jmJPs5eZBARmnuEEvZwbjwyz4.jpg" },
  { id: 254, title: "King Kong", year: 2005, genre: "Adventure · Drama", poster: "/6a2HY6UmD7XiDD3NokgaBAXEsD2.jpg" },
  { id: 11970, title: "Hercules", year: 1997, genre: "Animation · Family", poster: "/dK9rNoC97tgX3xXg5zdxFisdfcp.jpg" },
  { id: 1284460, title: "Alpha", year: 2025, genre: "Horror · Drama", poster: "/PvdD2gTqSZfFWclP9ee4bqCn0B.jpg" },
  { id: 698508, title: "Redeeming Love", year: 2022, genre: "Romance · Drama", poster: "/2iu0lBF7sfAioLfSnSJtdKxlms6.jpg" },
  { id: 1368, title: "First Blood", year: 1982, genre: "Action · Adventure", poster: "/dR5fbo0ry5TsC7euEXFUkx2QzVk.jpg" },
  { id: 315837, title: "Ghost in the Shell", year: 2017, genre: "Science Fiction · Drama", poster: "/zCtL3UBgCoZzd7XTVGhvl6XY75E.jpg" },
  { id: 8358, title: "Cast Away", year: 2000, genre: "Adventure · Drama", poster: "/7lLJgKnAicAcR5UEuo8xhSMj18w.jpg" },
  { id: 6145, title: "Fracture", year: 2007, genre: "Thriller", poster: "/qNen8x5gaikjIg9CFihgxYcJwQe.jpg" },
  { id: 601, title: "E.T. the Extra-Terrestrial", year: 1982, genre: "Science Fiction · Adventure", poster: "/an0nD6uq6byfxXCfk6lQBzdL2J1.jpg" },
  { id: 9453, title: "Caligula", year: 1979, genre: "Drama · History", poster: "/vNXAY6r9Pb6WkMCGmNeW2PlznLQ.jpg" },
  { id: 185664, title: "Nun in Rope Hell", year: 1984, genre: "Drama · Horror", poster: "/nIkhJdIizqkNW58GImZLxOr3tW.jpg" },
  { id: 10494, title: "Perfect Blue", year: 1998, genre: "Animation · Thriller", poster: "/6WTiOCfDPP8XV4jqfloiVWf7KHq.jpg" },
  { id: 91586, title: "Insidious: Chapter 2", year: 2013, genre: "Horror · Thriller", poster: "/w5JjiB3O1CLDXbTJe1QpU5RHmlU.jpg" },
  { id: 698687, title: "Transformers One", year: 2024, genre: "Animation · Science Fiction", poster: "/iRCgqpdVE4wyLQvGYU3ZP7pAtUc.jpg" },
  { id: 8681, title: "Taken", year: 2008, genre: "Action · Thriller", poster: "/ognkaUSNgJe1a2pjB4UNdzEo5jT.jpg" },
  { id: 268, title: "Batman", year: 1989, genre: "Fantasy · Action", poster: "/cij4dd21v2Rk2YtUQbV5kW69WB2.jpg" },
  { id: 336843, title: "Maze Runner: The Death Cure", year: 2018, genre: "Science Fiction · Action", poster: "/drbERzlA4cuRWhsTXfFOY4mRR4f.jpg" },
  { id: 2501, title: "The Bourne Identity", year: 2002, genre: "Action · Drama", poster: "/aP8swke3gmowbkfZ6lmNidu0y9p.jpg" },
  { id: 91314, title: "Transformers: Age of Extinction", year: 2014, genre: "Science Fiction · Action", poster: "/jyzrfx2WaeY60kYZpPYepSjGz4S.jpg" },
  { id: 7512, title: "Idiocracy", year: 2006, genre: "Comedy · Science Fiction", poster: "/k75tEyoPbPlfHSKakJBOR5dx1Dp.jpg" },
  { id: 8961, title: "Bad Boys II", year: 2003, genre: "Action · Crime", poster: "/yCvB5fG5aEPqa1St7ihY6KEAsHD.jpg" },
  { id: 61791, title: "Rise of the Planet of the Apes", year: 2011, genre: "Thriller · Action", poster: "/oqA45qMyyo1TtrnVEBKxqmTPhbN.jpg" },
  { id: 76338, title: "Thor: The Dark World", year: 2013, genre: "Action · Adventure", poster: "/wp6OxE4poJ4G7c0U2ZIXasTSMR7.jpg" },
  { id: 398818, title: "Call Me by Your Name", year: 2017, genre: "Romance · Drama", poster: "/mZ4gBdfkhP9tvLH1DO4m4HYtiyi.jpg" },
  { id: 37799, title: "The Social Network", year: 2010, genre: "Drama", poster: "/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg" },
  { id: 602, title: "Independence Day", year: 1996, genre: "Action · Adventure", poster: "/p0BPQGSPoSa8Ml0DAf2mB2kCU0R.jpg" },
  { id: 9737, title: "Bad Boys", year: 1995, genre: "Action · Comedy", poster: "/x1ygBecKHfXX4M2kRhmFKWfWbJc.jpg" },
  { id: 137113, title: "Edge of Tomorrow", year: 2014, genre: "Action · Science Fiction", poster: "/nBM9MMa2WCwvMG4IJ3eiGUdbPe6.jpg" },
  { id: 37724, title: "Skyfall", year: 2012, genre: "Action · Adventure", poster: "/d0IVecFQvsGdSbnMAHqiYsNYaJT.jpg" },
  { id: 530915, title: "1917", year: 2019, genre: "War · History", poster: "/iZf0KyrE25z1sage4SYFLCCrMi9.jpg" },
  { id: 493922, title: "Hereditary", year: 2018, genre: "Horror · Mystery", poster: "/hjlZSXM86wJrfCv5VKfR5DI2VeU.jpg" },
  { id: 4327, title: "Charlie's Angels", year: 2000, genre: "Action · Comedy", poster: "/iHTmZs0BmkwMCYi8rhvMWC5G4EM.jpg" },
  { id: 32657, title: "Percy Jackson & the Olympians: The Lightning Thief", year: 2010, genre: "Adventure · Fantasy", poster: "/brzpTyZ5bnM7s53C1KSk1TmrMO6.jpg" },
  { id: 608, title: "Men in Black II", year: 2002, genre: "Action · Comedy", poster: "/enA22EPyzc2WQ1VVyY7zxresQQr.jpg" },
  { id: 2034, title: "Training Day", year: 2001, genre: "Action · Crime", poster: "/bUeiwBQdupBLQthMCHKV7zv56uv.jpg" },
  { id: 402, title: "Basic Instinct", year: 1992, genre: "Thriller · Mystery", poster: "/76Ts0yoHk8kVQj9MMnoMixhRWoh.jpg" },
  { id: 8467, title: "Dumb and Dumber", year: 1994, genre: "Comedy", poster: "/4LdpBXiCyGKkR8FGHgjKlphrfUc.jpg" },
  { id: 75780, title: "Jack Reacher", year: 2012, genre: "Crime · Drama", poster: "/uQBbjrLVsUibWxNDGA4Czzo8lwz.jpg" },
  { id: 260513, title: "Incredibles 2", year: 2018, genre: "Action · Adventure", poster: "/9lFKBtaVIhP7E2Pk0IY1CwTKTMZ.jpg" },
  { id: 1372, title: "Blood Diamond", year: 2006, genre: "Drama · Thriller", poster: "/bqKNoySmI4eOjsSjJEnLj4j2HAp.jpg" },
  { id: 141052, title: "Justice League", year: 2017, genre: "Action · Adventure", poster: "/eifGNCSDuxJeS1loAXil5bIGgvC.jpg" },
  { id: 600, title: "Full Metal Jacket", year: 1987, genre: "Drama · War", poster: "/kMKyx1k8hWWscYFnPbnxxN4Eqo4.jpg" },
  { id: 9340, title: "The Goonies", year: 1985, genre: "Adventure · Comedy", poster: "/eBU7gCjTCj9n2LTxvCSIXXOvHkD.jpg" },
  { id: 9072, title: "Little Man", year: 2006, genre: "Comedy · Crime", poster: "/9KzPw1VN0pMBnq1KIqBaLI8LAB7.jpg" },
  { id: 1089, title: "Point Break", year: 1991, genre: "Action · Thriller", poster: "/tlbERIghrQ4oofqlbF7H0K0EYnx.jpg" },
  { id: 792, title: "Platoon", year: 1986, genre: "Drama · War", poster: "/m3mmFkPQKvPZq5exmh0bDuXlD9T.jpg" },
  { id: 50546, title: "Just Go with It", year: 2011, genre: "Comedy · Romance", poster: "/3rz7bfGsPGcI6cfY002n9VrUgao.jpg" },
  { id: 381284, title: "Hidden Figures", year: 2016, genre: "Drama · History", poster: "/9lfz2W2uGjyow3am00rsPJ8iOyq.jpg" },
  { id: 46195, title: "Rio", year: 2011, genre: "Animation · Adventure", poster: "/4nJxhUknKV8Gqdhov8pU1YWDYfb.jpg" },
  { id: 62835, title: "Colombiana", year: 2011, genre: "Action · Thriller", poster: "/rEdGDgRB3gducezNSIyx2lbKQy4.jpg" },
  { id: 157350, title: "Divergent", year: 2014, genre: "Action · Adventure", poster: "/aNh4Q3iuPKDMPi2SL7GgOpiLukX.jpg" },
  { id: 8909, title: "Wanted", year: 2008, genre: "Action · Thriller", poster: "/njy7Pz7ZHZceO7lNfGIHKphY8Hd.jpg" },
  { id: 605, title: "The Matrix Revolutions", year: 2003, genre: "Adventure · Action", poster: "/bkkS61w94ZVMNVd8KEyyJl2tnY5.jpg" },
  { id: 296, title: "Terminator 3: Rise of the Machines", year: 2003, genre: "Action · Thriller", poster: "/nvsoLAclNfpyJSp73TiGKwZoqJW.jpg" },
  { id: 1102883, title: "Mother Mary", year: 2026, genre: "Music · Drama", poster: "/qMgUI6pxkPtIuoXX4DcJ6X7bdt2.jpg" },
  { id: 345887, title: "The Equalizer 2", year: 2018, genre: "Action · Thriller", poster: "/cQvc9N6JiMVKqol3wcYrGshsIdZ.jpg" },
  { id: 524, title: "Casino", year: 1995, genre: "Crime · Drama", poster: "/gziIkUSnYuj9ChCi8qOu2ZunpSC.jpg" },
  { id: 453, title: "A Beautiful Mind", year: 2001, genre: "Drama · Romance", poster: "/zwzWCmH72OSC9NA0ipoqw5Zjya8.jpg" },
  { id: 353081, title: "Mission: Impossible - Fallout", year: 2018, genre: "Action · Adventure", poster: "/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg" },
  { id: 405746, title: "Door", year: 1988, genre: "Horror · Mystery", poster: "/uNTZ9vp32AYd6kcAcm63jVg6u44.jpg" },
  { id: 14741, title: "The Goodbye Girl", year: 1977, genre: "Comedy · Drama", poster: "/xdaPFRARLPJuSdQIfxKVJSCOsmD.jpg" },
  { id: 146, title: "Crouching Tiger, Hidden Dragon", year: 2000, genre: "Adventure · Drama", poster: "/iNDVBFNz4XyYzM9Lwip6atSTFqf.jpg" },
  { id: 813, title: "Airplane!", year: 1980, genre: "Comedy", poster: "/7Q3efxd3AF1vQjlSxnlerSA7RzN.jpg" },
  { id: 168259, title: "Furious 7", year: 2015, genre: "Action · Crime", poster: "/ktofZ9Htrjiy0P6LEowsDaxd3Ri.jpg" },
  { id: 24021, title: "The Twilight Saga: Eclipse", year: 2010, genre: "Adventure · Fantasy", poster: "/dK4Gi1UdMiHzHc7r7CZQG4IQ9Sr.jpg" },
  { id: 1124566, title: "Sentimental Value", year: 2025, genre: "Drama", poster: "/pz9NCWxxOk3o0W3v1Zkhawrwb4i.jpg" },
  { id: 260346, title: "Taken 3", year: 2014, genre: "Thriller · Action", poster: "/vzvMXMypMq7ieDofKThsxjHj9hn.jpg" },
  { id: 316029, title: "The Greatest Showman", year: 2017, genre: "Drama", poster: "/b9CeobiihCx1uG1tpw8hXmpi7nm.jpg" },
  { id: 105825, title: "Erotic Ghost Story III", year: 1992, genre: "Horror · Drama", poster: "/2b1Y6NbZenY45DgC5CwncoLkpo.jpg" },
  { id: 339403, title: "Baby Driver", year: 2017, genre: "Action · Crime", poster: "/tYzFuYXmT8LOYASlFCkaPiAFAl0.jpg" },
  { id: 810, title: "Shrek the Third", year: 2007, genre: "Fantasy · Adventure", poster: "/n4SexGGQzI26E269tfpa80MZaGV.jpg" },
  { id: 74, title: "War of the Worlds", year: 2005, genre: "Adventure · Thriller", poster: "/6Biy7R9LfumYshur3YKhpj56MpB.jpg" },
  { id: 264660, title: "Ex Machina", year: 2015, genre: "Drama · Science Fiction", poster: "/dmJW8IAKHKxFNiUnoDR7JfsK7Rp.jpg" },
  { id: 44896, title: "Rango", year: 2011, genre: "Animation · Comedy", poster: "/A5MP1guV8pbruieG0tnpPIbaJtt.jpg" },
  { id: 1033148, title: "Die My Love", year: 2025, genre: "Drama", poster: "/kajpShbFhOdpl6yCrLezMrr9tB4.jpg" },
  { id: 131634, title: "The Hunger Games: Mockingjay - Part 2", year: 2015, genre: "Action · Adventure", poster: "/lImKHDfExAulp16grYm8zD5eONE.jpg" },
  { id: 38321, title: "Priest", year: 2011, genre: "Action · Fantasy", poster: "/fYHiA7LPGl9DG7m3DUs0Td1VMcO.jpg" },
  { id: 620, title: "Ghostbusters", year: 1984, genre: "Comedy · Fantasy", poster: "/7E8nLijS9AwwUEPu2oFYOVKhdFA.jpg" },
  { id: 7459, title: "Speed Racer", year: 2008, genre: "Family · Action", poster: "/fxRIpx9Op9h71q3tvuabx4GryyP.jpg" },
  { id: 8363, title: "Superbad", year: 2007, genre: "Comedy", poster: "/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg" },
  { id: 11631, title: "Mamma Mia!", year: 2008, genre: "Comedy · Romance", poster: "/zdUA4FNHbXPadzVOJiU0Rgn6cHR.jpg" },
  { id: 320288, title: "Dark Phoenix", year: 2019, genre: "Science Fiction · Action", poster: "/cCTJPelKGLhALq3r51A9uMonxKj.jpg" },
  { id: 11216, title: "Cinema Paradiso", year: 1988, genre: "Drama · Romance", poster: "/gCI2AeMV4IHSewhJkzsur5MEp6R.jpg" },
  { id: 93456, title: "Despicable Me 2", year: 2013, genre: "Animation · Comedy", poster: "/5Fh4NdoEnCjCK9wLjdJ9DJNFl2b.jpg" },
  { id: 339846, title: "Baywatch", year: 2017, genre: "Comedy · Action", poster: "/6HE4xd8zloDqmjMZuhUCCw2UcY1.jpg" },
  { id: 752, title: "V for Vendetta", year: 2006, genre: "Action · Thriller", poster: "/piZOwjyk1g51oPHonc7zaQY3WOv.jpg" },
  { id: 9792, title: "The Hills Have Eyes", year: 2006, genre: "Horror · Thriller", poster: "/2eJL1Ccr1FN3dm9OSDwyd8uaX1b.jpg" },
  { id: 56292, title: "Mission: Impossible - Ghost Protocol", year: 2011, genre: "Action · Thriller", poster: "/eRZTGx7GsiKqPch96k27LK005ZL.jpg" },
  { id: 1954, title: "The Butterfly Effect", year: 2004, genre: "Science Fiction · Thriller", poster: "/ea5iv7TWMh18fOKoRGgmtcg85Gx.jpg" },
  { id: 3933, title: "Corpse Bride", year: 2005, genre: "Romance · Fantasy", poster: "/isb2Qow76GpqYmsSyfdMfsYAjts.jpg" },
  { id: 57214, title: "Project X", year: 2012, genre: "Comedy", poster: "/lUPDGT3lyRrq8SvWuNWG2DP64bR.jpg" },
  { id: 28468, title: "The Key", year: 1983, genre: "Drama · Romance", poster: "/e6g2geNLgFzMbriH6EvSJZD78nx.jpg" },
  { id: 197, title: "Braveheart", year: 1995, genre: "Action · Drama", poster: "/or1gBugydmjToAEq7OZY0owwFk.jpg" },
  { id: 274855, title: "Geostorm", year: 2017, genre: "Action · Science Fiction", poster: "/nrsx0jEaBgXq4PWo7SooSnYJTv.jpg" },
  { id: 281957, title: "The Revenant", year: 2015, genre: "Western · Drama", poster: "/ji3ecJphATlVgWNY0B0RVXZizdf.jpg" },
  { id: 2493, title: "The Princess Bride", year: 1987, genre: "Adventure · Family", poster: "/2FC9L9MrjBoGHYjYZjdWQdopVYb.jpg" },
  { id: 300668, title: "Annihilation", year: 2018, genre: "Science Fiction · Horror", poster: "/4YRplSk6BhH6PRuE9gfyw9byUJ6.jpg" },
  { id: 80321, title: "Madagascar 3: Europe's Most Wanted", year: 2012, genre: "Animation · Family", poster: "/ekraj4ksvIKeuvQVEevEJkuybZd.jpg" },
  { id: 635302, title: "Demon Slayer -Kimetsu no Yaiba- The Movie: Mugen Train", year: 2020, genre: "Animation · Action", poster: "/h8Rb9gBr48ODIwYUttZNYeMWeUU.jpg" },
  { id: 838365, title: "Cloud", year: 2007, genre: "Drama · Romance", poster: "/39iGoBO0w2R4iY0SrdobkJhjZWT.jpg" },
  { id: 381283, title: "mother!", year: 2017, genre: "Horror · Drama", poster: "/fjny9chXPx69ln1LMJxbwi5yHMt.jpg" },
  { id: 587, title: "Big Fish", year: 2003, genre: "Adventure · Fantasy", poster: "/tjK063yCgaBAluVU72rZ6PKPH2l.jpg" },
  { id: 615453, title: "Ne Zha", year: 2019, genre: "Animation · Fantasy", poster: "/phM9bb6s9c60LA8qwsdk7U1N2cS.jpg" },
  { id: 427641, title: "Rampage", year: 2018, genre: "Action · Adventure", poster: "/MGADip4thVSErP34FAAfzFBTZ5.jpg" },
  { id: 282035, title: "The Mummy", year: 2017, genre: "Fantasy · Thriller", poster: "/zxkY8byBnCsXodEYpK8tmwEGXBI.jpg" },
  { id: 851644, title: "20th Century Girl", year: 2022, genre: "Romance · Drama", poster: "/od22ftNnyag0TTxcnJhlsu3aLoU.jpg" },
  { id: 23823, title: "Wrong Turn 3: Left for Dead", year: 2009, genre: "Horror · Thriller", poster: "/84s4LMWuGbm4xPWW5PSbHyQhh33.jpg" },
  { id: 2675, title: "Signs", year: 2002, genre: "Thriller · Science Fiction", poster: "/YtrIdrTxpRhvCnlw43dwOjfLqx.jpg" },
  { id: 34851, title: "Predators", year: 2010, genre: "Science Fiction · Action", poster: "/wdniP8NDaJIydi1hMxhpbJMUfr6.jpg" },
  { id: 44214, title: "Black Swan", year: 2010, genre: "Drama · Thriller", poster: "/viWheBd44bouiLCHgNMvahLThqx.jpg" },
  { id: 140300, title: "Kung Fu Panda 3", year: 2016, genre: "Animation · Action", poster: "/oajNi4Su39WAByHI6EONu8G8HYn.jpg" },
  { id: 217, title: "Indiana Jones and the Kingdom of the Crystal Skull", year: 2008, genre: "Adventure · Action", poster: "/56As6XEM1flWvprX4LgkPl8ii4K.jpg" },
  { id: 747, title: "Shaun of the Dead", year: 2004, genre: "Horror · Comedy", poster: "/dgXPhzNJH8HFTBjXPB177yNx6RI.jpg" },
  { id: 87827, title: "Life of Pi", year: 2012, genre: "Adventure · Drama", poster: "/iLgRu4hhSr6V1uManX6ukDriiSc.jpg" },
  { id: 115, title: "The Big Lebowski", year: 1998, genre: "Comedy · Crime", poster: "/3bv6WAp6BSxxYvB5ozKFUYuRA8C.jpg" },
  { id: 89, title: "Indiana Jones and the Last Crusade", year: 1989, genre: "Adventure · Action", poster: "/sizg1AU8f8JDZX4QIgE4pjUMBvx.jpg" },
  { id: 762975, title: "Purple Hearts", year: 2022, genre: "Romance · Drama", poster: "/4JyNWkryifWbWXJyxcWh3pVya6N.jpg" },
  { id: 194, title: "Amélie", year: 2001, genre: "Comedy · Romance", poster: "/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg" },
  { id: 166428, title: "How to Train Your Dragon: The Hidden World", year: 2019, genre: "Animation · Family", poster: "/xvx4Yhf0DVH8G4LzNISpMfFBDy2.jpg" },
  { id: 1220564, title: "The Secret Agent", year: 2025, genre: "Crime · Drama", poster: "/rZqolYhxMEe6TZZTjSmFw9crDTD.jpg" },
  { id: 273248, title: "The Hateful Eight", year: 2015, genre: "Drama · Mystery", poster: "/jIywvdPjia2t3eKYbjVTcwBQlG8.jpg" },
  { id: 563, title: "Starship Troopers", year: 1997, genre: "Adventure · Action", poster: "/cxCmv23O7p3hyHwqoktHYkZcGsY.jpg" },
  { id: 493125, title: "An Affair - Two Sisters", year: 2017, genre: "Drama · Romance", poster: "/hd53bYFpoWjojG08xLQBO8cP50h.jpg" },
  { id: 1412, title: "sex, lies, and videotape", year: 1989, genre: "Drama", poster: "/pj1uKm07svgXZDHbYE8AzRfNHcu.jpg" },
  { id: 11423, title: "Memories of Murder", year: 2003, genre: "Crime · Drama", poster: "/dsEoTJKM1s5OVDkS2P2JdoTxo4K.jpg" },
  { id: 10835, title: "The Killer", year: 1989, genre: "Action · Crime", poster: "/8hTxlSqMAHBXAh1eB69ir0BXhzE.jpg" },
  { id: 8355, title: "Ice Age: Dawn of the Dinosaurs", year: 2009, genre: "Animation · Comedy", poster: "/cXOLaxcNjNAYmEx1trZxOTKhK3Q.jpg" },
  { id: 927, title: "Gremlins", year: 1984, genre: "Fantasy · Horror", poster: "/6m0F7fsXjQvUbCZrPWcJNrjvIui.jpg" },
  { id: 28178, title: "Hachi: A Dog's Tale", year: 2009, genre: "Drama · Family", poster: "/lsy3aEsEfYIHdLRk4dontZ4s85h.jpg" },
  { id: 397243, title: "The Autopsy of Jane Doe", year: 2016, genre: "Horror · Mystery", poster: "/6K0wjP8kPCiPYy9PtXBGuypyt5I.jpg" },
  { id: 1924, title: "Superman", year: 1978, genre: "Science Fiction · Action", poster: "/d7px1FQxW4tngdACVRsCSaZq0Xl.jpg" },
  { id: 1239134, title: "Bhooth Bangla", year: 2026, genre: "Horror · Comedy", poster: "/79RBp8afL4u4z3nVGR78z6eIvBB.jpg" },
  { id: 5503, title: "The Fugitive", year: 1993, genre: "Action · Thriller", poster: "/b3rEtLKyOnF89mcK75GXDXdmOEf.jpg" },
  { id: 10527, title: "Madagascar: Escape 2 Africa", year: 2008, genre: "Adventure · Animation", poster: "/agRbLOHgN46TQO4YdKR462iR7To.jpg" },
  { id: 75612, title: "Oblivion", year: 2013, genre: "Action · Science Fiction", poster: "/bYLM3GpNUZnoFElPXp1zlhDPdtv.jpg" },
  { id: 13475, title: "Star Trek", year: 2009, genre: "Science Fiction · Action", poster: "/hN2ZtF3Uw6mhIHZiqL0SKzELtKn.jpg" },
  { id: 8835, title: "Legally Blonde", year: 2001, genre: "Comedy", poster: "/9ohlMrJHQqKhfUKh7Zr3JQqHNLZ.jpg" },
  { id: 239439, title: "A Matter of Perspective", year: 1987, genre: "Comedy", poster: "/hyrSxchu6gjEp3sgNarZ3dzicdA.jpg" },
  { id: 244998, title: "Senario XX", year: 2005, genre: "Comedy · Adventure", poster: "/scoQLzyPEsL7pSzN22Af2xKzl35.jpg" },
  { id: 955, title: "Mission: Impossible II", year: 2000, genre: "Adventure · Action", poster: "/hfnrual76gPeNFduhD4xzHWpfTw.jpg" },
  { id: 754, title: "Face/Off", year: 1997, genre: "Action · Crime", poster: "/69Xzn8UdPbVnmqSChKz2RTpoNfB.jpg" },
  { id: 339964, title: "Valerian and the City of a Thousand Planets", year: 2017, genre: "Adventure · Science Fiction", poster: "/vlc95gl3PtrjxSEuM8RhTtSm2xU.jpg" },
  { id: 10528, title: "Sherlock Holmes", year: 2009, genre: "Adventure · Crime", poster: "/momkKuWburNTqKBF6ez7rvhYVhE.jpg" },
  { id: 764, title: "The Evil Dead", year: 1981, genre: "Horror", poster: "/54C1qdaiSijIU5NeNb4WsPJdNkG.jpg" },
  { id: 644, title: "A.I. Artificial Intelligence", year: 2001, genre: "Drama · Science Fiction", poster: "/8MZSGX5JORoO72EfuAEcejH5yHn.jpg" },
  { id: 8078, title: "Alien Resurrection", year: 1997, genre: "Science Fiction · Horror", poster: "/9aRDMlU5Zwpysilm0WCWzU2PCFv.jpg" },
  { id: 941, title: "Lethal Weapon", year: 1987, genre: "Action · Thriller", poster: "/6gt44oqb4nE8vflPElffeGwsHVl.jpg" },
  { id: 438695, title: "Sing 2", year: 2021, genre: "Animation · Music", poster: "/aWeKITRFbbwY8txG5uCj4rMCfSP.jpg" },
  { id: 335797, title: "Sing", year: 2016, genre: "Animation · Music", poster: "/rwopfpHqPCYBSgBuZwkaXXqHp14.jpg" },
  { id: 149, title: "Akira", year: 1988, genre: "Animation · Science Fiction", poster: "/neZ0ykEsPqxamsX6o5QNUFILQrz.jpg" },
  { id: 9820, title: "The Parent Trap", year: 1998, genre: "Comedy · Family", poster: "/p4dGmi8u9W0HHyVXcgWPoiFfKTF.jpg" },
  { id: 9276, title: "The Faculty", year: 1998, genre: "Horror · Science Fiction", poster: "/5XetJwmAiDC0EtH23NIXaqFn3Wl.jpg" },
  { id: 82702, title: "How to Train Your Dragon 2", year: 2014, genre: "Fantasy · Action", poster: "/d13Uj86LdbDLrfDoHR5aDOFYyJC.jpg" },
  { id: 402900, title: "Ocean's Eight", year: 2018, genre: "Crime · Comedy", poster: "/MvYpKlpFukTivnlBhizGbkAe3v.jpg" },
  { id: 1669929, title: "The Gold Trail", year: 2026, genre: "Animation · Action", poster: "/ldroECj55Ay4Qh4gUlbKEttly4i.jpg" },
  { id: 44833, title: "Battleship", year: 2012, genre: "Thriller · Action", poster: "/9b0Im7SfedHiajTwzSL9zGyBI7M.jpg" },
  { id: 67395, title: "L.E.T.H.A.L. Ladies: Return to Savage Beach", year: 1998, genre: "Action · Thriller", poster: "/9z3hdYnDdfWGKD55kdDmshDojeP.jpg" },
  { id: 1607, title: "A Bronx Tale", year: 1993, genre: "Drama · Crime", poster: "/sDbO6LmLYtyqAoFTPpRcMgPSCEO.jpg" },
  { id: 384018, title: "Fast & Furious Presents: Hobbs & Shaw", year: 2019, genre: "Action · Adventure", poster: "/qRyy2UmjC5ur9bDi3kpNNRCc5nc.jpg" },
  { id: 6114, title: "Bram Stoker's Dracula", year: 1992, genre: "Romance · Horror", poster: "/jSxCIZXudp5q8wQO8VERGX8hRAl.jpg" },
  { id: 1893, title: "Star Wars: Episode I - The Phantom Menace", year: 1999, genre: "Adventure · Action", poster: "/6wkfovpn7Eq8dYNKaG5PY3q2oq6.jpg" },
  { id: 107846, title: "Escape Plan", year: 2013, genre: "Action · Thriller", poster: "/qOZPLflxDqKogu9v9hYw3lolxGs.jpg" },
  { id: 512200, title: "Jumanji: The Next Level", year: 2019, genre: "Adventure · Comedy", poster: "/jyw8VKYEiM1UDzPB7NsisUgBeJ8.jpg" },
  { id: 4588, title: "Lust, Caution", year: 2007, genre: "Action · Drama", poster: "/6c1tqfJEBuIyhQC19SLlLQAUAvJ.jpg" },
  { id: 10009, title: "Brother Bear", year: 2003, genre: "Adventure · Animation", poster: "/otptPbEY0vBostmo95xwiiumMJm.jpg" },
  { id: 180, title: "Minority Report", year: 2002, genre: "Science Fiction · Action", poster: "/ccqpHq5tk5W4ymbSbuoy4uYOxFI.jpg" },
  { id: 6312, title: "Brotherhood of the Wolf", year: 2001, genre: "Adventure · Horror", poster: "/Ahd4F7azhjsxgXYjVyFmVzJu9LB.jpg" },
  { id: 258489, title: "The Legend of Tarzan", year: 2016, genre: "Fantasy · Action", poster: "/eJrfz178xBGlxjDGxnBXTzWWa4w.jpg" },
  { id: 1573, title: "Die Hard 2", year: 1990, genre: "Action · Thriller", poster: "/ybki0UWO3OPhaM6MSniuKC7sy1R.jpg" },
  { id: 82695, title: "Les Misérables", year: 2012, genre: "History · Drama", poster: "/6CuzBs2Lb8At7qQr64mLXg2RYRb.jpg" },
  { id: 42337, title: "Beau Pere", year: 1981, genre: "Drama · Romance", poster: "/sF6wgE9Lg4CUsLzNMnuotESplFF.jpg" },
  { id: 11247, title: "A Cinderella Story", year: 2004, genre: "Comedy · Family", poster: "/ukwP7gDPWxj1R1dW5iN3mnxkL3D.jpg" },
  { id: 238636, title: "The Purge: Anarchy", year: 2014, genre: "Horror · Thriller", poster: "/qwqHHZLZSUvMkAMQ47ymtfjEifY.jpg" },
  { id: 13448, title: "Angels & Demons", year: 2009, genre: "Thriller · Mystery", poster: "/tFZQAuulEOtFTp0gHbVdEXwGrYe.jpg" },
  { id: 19908, title: "Zombieland", year: 2009, genre: "Comedy · Horror", poster: "/dUkAmAyPVqubSBNRjRqCgHggZcK.jpg" },
  { id: 70160, title: "The Hunger Games", year: 2012, genre: "Science Fiction · Adventure", poster: "/yXCbOiVDCxO71zI7cuwBRXdftq8.jpg" },
  { id: 120467, title: "The Grand Budapest Hotel", year: 2014, genre: "Comedy · Drama", poster: "/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg" },
  { id: 581, title: "Dances with Wolves", year: 1990, genre: "Adventure · Drama", poster: "/hw0ZEHAaTqTxSXGVwUFX7uvanSA.jpg" },
  { id: 1084736, title: "The Count of Monte Cristo", year: 2024, genre: "Adventure · Action", poster: "/sAT1P3FGhtJ68anUyJScnMu8t1l.jpg" },
  { id: 294254, title: "Maze Runner: The Scorch Trials", year: 2015, genre: "Science Fiction · Action", poster: "/mYw7ZyejqSCPFlrT2jHZOESZDU3.jpg" },
  { id: 1948, title: "Crank", year: 2006, genre: "Action · Thriller", poster: "/rsKmhnvzJezjwC1Ud2Hh37oNpdQ.jpg" },
  { id: 399055, title: "The Shape of Water", year: 2017, genre: "Drama · Fantasy", poster: "/9zfwPffUXpBrEP26yp0q1ckXDcj.jpg" },
  { id: 276907, title: "Legend", year: 2015, genre: "Crime · Thriller", poster: "/4shf5Alq4KWCKqrAAQe0JGJHYp5.jpg" },
  { id: 1278, title: "The Dreamers", year: 2003, genre: "Drama · Romance", poster: "/gBb7GGaFYPu7nEUYvC8G4LaJJN1.jpg" },
  { id: 1592, title: "Primal Fear", year: 1996, genre: "Crime · Drama", poster: "/qJf2TzE8nRTFbFMPJNW6c8mI0KU.jpg" },
  { id: 110415, title: "Snowpiercer", year: 2013, genre: "Action · Science Fiction", poster: "/kw6YQudA0TMcNmGUGy5XIw7zbnV.jpg" },
  { id: 64688, title: "21 Jump Street", year: 2012, genre: "Action · Comedy", poster: "/8v3Sqv9UcIUC4ebmpKWROqPBINZ.jpg" },
  { id: 158852, title: "Tomorrowland", year: 2015, genre: "Adventure · Family", poster: "/kziYpr5Nfw60P0My8aj1sgCEqed.jpg" },
  { id: 10431, title: "War", year: 2007, genre: "Action · Crime", poster: "/scFc8RD4sFxB2x0eIOaymphMnYh.jpg" },
  { id: 109428, title: "Evil Dead", year: 2013, genre: "Horror", poster: "/1gDV0Lm9y8ufIKzyf0h0GBgb9Zj.jpg" },
  { id: 142, title: "Brokeback Mountain", year: 2005, genre: "Drama · Romance", poster: "/aByfQOQBNa4CMFwIgq3QrqY2ZHh.jpg" },
  { id: 138103, title: "The Expendables 3", year: 2014, genre: "Action · Adventure", poster: "/utS5euWHlEdKBNnEFwjpZ2oGuhF.jpg" },
  { id: 11013, title: "Secretary", year: 2002, genre: "Romance · Drama", poster: "/mdRXSE7ho185SZlXj0JSwuecEd3.jpg" },
  { id: 1669051, title: "Kesong Puti", year: 2026, genre: "Drama", poster: "/8zYU8hlKR5111IToxXvv5575tZG.jpg" },
  { id: 400535, title: "Sicario: Day of the Soldado", year: 2018, genre: "Action · Crime", poster: "/qcLYofEhNh51Sk1jUWjmKHLzkqw.jpg" },
  { id: 9757, title: "Norbit", year: 2007, genre: "Comedy", poster: "/XcZ5NzygPp54csxCnzvQKuxFL2.jpg" },
  { id: 1669057, title: "Check-In", year: 2026, genre: "Drama", poster: "/r7tXZoO3rfkOpYQPCXftwugwny9.jpg" },
  { id: 522938, title: "Rambo: Last Blood", year: 2019, genre: "Action · Thriller", poster: "/kTQ3J8oTTKofAVLYnds2cHUz9KO.jpg" },
  { id: 274857, title: "King Arthur: Legend of the Sword", year: 2017, genre: "Action · Drama", poster: "/9kKXH6eJpzoFGhCbTN3FVwSQK3n.jpg" },
  { id: 50014, title: "The Help", year: 2011, genre: "Drama", poster: "/3kmfoWWEc9Vtyuaf9v5VipRgdjx.jpg" },
  { id: 65, title: "8 Mile", year: 2002, genre: "Drama · Music", poster: "/7BmQj8qE1FLuLTf7Xjf9sdIHzoa.jpg" },
  { id: 2503, title: "The Bourne Ultimatum", year: 2007, genre: "Action · Drama", poster: "/15rMz5MRXFp7CP4VxhjYw4y0FUn.jpg" },
  { id: 76757, title: "Jupiter Ascending", year: 2015, genre: "Science Fiction · Fantasy", poster: "/2NCcAZ3M3F0FxENYmammBknwpVn.jpg" },
  { id: 270303, title: "It Follows", year: 2015, genre: "Horror · Mystery", poster: "/iwnQ1JH1wdWrGYkgWySptJ5284A.jpg" },
  { id: 18239, title: "The Twilight Saga: New Moon", year: 2009, genre: "Adventure · Fantasy", poster: "/k2qTooPlHffgNABNWxeJdGMglPK.jpg" },
  { id: 565, title: "The Ring", year: 2002, genre: "Horror · Mystery", poster: "/AeRpUynJKDpJveklBJipOYrVxCS.jpg" },
  { id: 184315, title: "Hercules", year: 2014, genre: "Action · Adventure", poster: "/sKNIwY6UENCJ36FvYvnBW3Vdzt7.jpg" },
  { id: 63, title: "Twelve Monkeys", year: 1995, genre: "Science Fiction · Thriller", poster: "/gt3iyguaCIw8DpQZI1LIN5TohM2.jpg" },
  { id: 414419, title: "Kill Bill: The Whole Bloody Affair", year: 2011, genre: "Action · Crime", poster: "/nSOJfWJCdVFZQwXQA7RXn7FIIiY.jpg" },
  { id: 49047, title: "Gravity", year: 2013, genre: "Science Fiction · Thriller", poster: "/kZ2nZw8D681aphje8NJi8EfbL1U.jpg" },
  { id: 2502, title: "The Bourne Supremacy", year: 2004, genre: "Action · Drama", poster: "/jupG9sFT64YwM8PSkwkUD2wHcYD.jpg" },
  { id: 297090, title: "The Torture Club", year: 2014, genre: "Drama · Comedy", poster: "/p4MP2Xb2AOkyFSLjliMk0Hn4GeG.jpg" },
  { id: 622, title: "The Ninth Gate", year: 1999, genre: "Mystery · Thriller", poster: "/ls4HeCqp9gvvY7X1lOqlqazL3.jpg" },
  { id: 23483, title: "Kick-Ass", year: 2010, genre: "Action · Crime", poster: "/iHMbrTHJwocsNvo5murCBw0CwTo.jpg" },
  { id: 1641966, title: "Untold: The Shooting at Hawthorne Hill", year: 2026, genre: "Documentary", poster: "/6K0qTMozHAzzYVsWQrXxmqCC5wY.jpg" },
  { id: 22970, title: "The Cabin in the Woods", year: 2012, genre: "Horror · Mystery", poster: "/zZZe5wn0udlhMtdlDjN4NB72R6e.jpg" },
  { id: 364, title: "Batman Returns", year: 1992, genre: "Action · Fantasy", poster: "/jKBjeXM7iBBV9UkUcOXx3m7FSHY.jpg" },
  { id: 782, title: "Gattaca", year: 1997, genre: "Thriller · Science Fiction", poster: "/eSKr5Fl1MEC7zpAXaLWBWSBjgJq.jpg" },
  { id: 2024, title: "The Patriot", year: 2000, genre: "Drama · History", poster: "/fWZd815QxUCUcrWQZwUkAp9ljG.jpg" },
  { id: 187, title: "Sin City", year: 2005, genre: "Crime · Thriller", poster: "/i66G50wATMmPrvpP95f0XP6ZdVS.jpg" },
  { id: 8871, title: "How the Grinch Stole Christmas", year: 2000, genre: "Family · Comedy", poster: "/1WZbbPApEivA421gCOluuzMMKCk.jpg" },
  { id: 9532, title: "Final Destination", year: 2000, genre: "Horror", poster: "/1mXhlQMnlfvJ2frxTjZSQNnA9Vp.jpg" },
  { id: 9659, title: "Mad Max", year: 1979, genre: "Adventure · Action", poster: "/5LrI4GiCSrChgkdskVZiwv643Kg.jpg" },
  { id: 4638, title: "Hot Fuzz", year: 2007, genre: "Crime · Action", poster: "/zPib4ukTSdXvHP9pxGkFCe34f3y.jpg" },
  { id: 499191, title: "Call Boy", year: 2018, genre: "Drama", poster: "/3fVRb3uoRDjbA9X95C88FOJ0rlZ.jpg" },
  { id: 1430077, title: "Hokum", year: 2026, genre: "Horror · Mystery", poster: "/gC4FtEthYvx6XV2JHCQibf4P3FT.jpg" },
  { id: 8009, title: "Highlander", year: 1986, genre: "Adventure · Action", poster: "/8Z8dptJEypuLoOQro1WugD855YE.jpg" },
  { id: 90, title: "Beverly Hills Cop", year: 1984, genre: "Comedy · Crime", poster: "/eBJEvKkhQ0tUt1dBAcTEYW6kCle.jpg" },
  { id: 18491, title: "Neon Genesis Evangelion: The End of Evangelion", year: 1997, genre: "Animation · Science Fiction", poster: "/j6G24dqI4WgUtChhWjfnI4lnmiK.jpg" },
  { id: 278927, title: "The Jungle Book", year: 2016, genre: "Family · Adventure", poster: "/2Epx7F9X7DrFptn4seqn4mzBVks.jpg" },
  { id: 4478, title: "Indecent Proposal", year: 1993, genre: "Romance · Drama", poster: "/a39WoiTJEG5kNLIrr3kOMwg3LFg.jpg" },
  { id: 273477, title: "Scouts Guide to the Zombie Apocalypse", year: 2015, genre: "Comedy · Horror", poster: "/lUKvvSnjFlazrdh6wyHxHrdMknD.jpg" },
  { id: 380, title: "Rain Man", year: 1988, genre: "Drama", poster: "/iTNHwO896WKkaoPtpMMS74d8VNi.jpg" },
  { id: 79, title: "Hero", year: 2002, genre: "Drama · Adventure", poster: "/vxgZto2Cz7ILHAlmRXt50I2brB2.jpg" },
  { id: 2270, title: "Stardust", year: 2007, genre: "Adventure · Fantasy", poster: "/7zbFmxy3DqKYL2M8Hop6uylp2Uy.jpg" },
  { id: 11690, title: "Bloodsport", year: 1988, genre: "Action · Thriller", poster: "/kndxR9TRK0kJ5hxzDprRSS80F2W.jpg" },
  { id: 96721, title: "Rush", year: 2013, genre: "Drama · Action", poster: "/95BDrWmcfJDEa2WCfjmLgi67jhi.jpg" },
  { id: 1927, title: "Hulk", year: 2003, genre: "Science Fiction · Adventure", poster: "/UllIft2jLSBaay3zQyMV4GNdfy.jpg" },
  { id: 2668, title: "Sleepy Hollow", year: 1999, genre: "Fantasy · Thriller", poster: "/1GuK965FLJxqUw9fd1pmvjbFAlv.jpg" },
  { id: 14, title: "American Beauty", year: 1999, genre: "Drama", poster: "/wby9315QzVKdW9BonAefg8jGTTb.jpg" },
  { id: 163, title: "Ocean's Twelve", year: 2004, genre: "Thriller · Crime", poster: "/pE5anFf7nf6ah7V3VRezQ1KSovi.jpg" },
  { id: 3291, title: "Good Night, and Good Luck.", year: 2005, genre: "Drama · History", poster: "/w4QSEno2xxHqMtSr3mPUhJpO3F2.jpg" },
  { id: 521844, title: "The Wedding Year", year: 2019, genre: "Comedy", poster: "/pUeMpXt2iJIevr8qWq81tpacL2R.jpg" },
  { id: 22803, title: "Law Abiding Citizen", year: 2009, genre: "Drama · Crime", poster: "/fcEXcip7v0O1ndV4VUdFqJSqbOg.jpg" },
  { id: 9738, title: "Fantastic Four", year: 2005, genre: "Action · Fantasy", poster: "/8HLQLILZLhDQWO6JDpvY6XJLH75.jpg" },
  { id: 558, title: "Spider-Man 2", year: 2004, genre: "Action · Adventure", poster: "/eg8XHjA7jkM3ulBLnfGTczR9ytI.jpg" },
  { id: 4982, title: "American Gangster", year: 2007, genre: "Drama · Crime", poster: "/sX9idXDqRUxE5ffww3n3RV5gL55.jpg" },
  { id: 1291335, title: "Solo Mio", year: 2026, genre: "Romance · Comedy", poster: "/efSsZJaddeq0LOABZqpCXdMxv9P.jpg" },
  { id: 5876, title: "The Mist", year: 2007, genre: "Horror · Science Fiction", poster: "/1CvJ6diBACKPVGOpcWuY4XPQdqX.jpg" },
  { id: 1018, title: "Mulholland Drive", year: 2001, genre: "Thriller · Drama", poster: "/x7A59t6ySylr1L7aubOQEA480vM.jpg" },
  { id: 395992, title: "Life", year: 2017, genre: "Horror · Science Fiction", poster: "/wztfli5NgYDgurVgShNflvnyA3Z.jpg" },
  { id: 6957, title: "The 40 Year Old Virgin", year: 2005, genre: "Comedy · Romance", poster: "/mVeoqL37gzhMXQVpONi9DGOQ3tZ.jpg" },
  { id: 39513, title: "Paul", year: 2011, genre: "Adventure · Comedy", poster: "/dKhexH8nS08lVlSmwSs00cHFxbY.jpg" },
  { id: 153518, title: "The Angry Birds Movie", year: 2016, genre: "Animation · Adventure", poster: "/iOH0fEFtV9z9rZp9zmBFGGeWicv.jpg" },
  { id: 109418, title: "Grown Ups 2", year: 2013, genre: "Comedy", poster: "/hT6ijOtjtYrnyDhN7VA2QWyGFAm.jpg" },
  { id: 68735, title: "Warcraft", year: 2016, genre: "Action · Adventure", poster: "/nZIIOs06YigBnvmlJ2hxZeA8eTO.jpg" },
  { id: 1341137, title: "A Great Awakening", year: 2026, genre: "Drama · History", poster: "/rd7BsFaHO7JaYlz3WHUvqHjgm60.jpg" },
  { id: 10607, title: "Don't Be a Menace to South Central While Drinking Your Juice in the Hood", year: 1996, genre: "Comedy · Crime", poster: "/HZQBF7JDd2e9p4rPSbSHuWHaCC.jpg" },
  { id: 1381027, title: "Good Boy", year: 2026, genre: "Thriller · Drama", poster: "/x0wD4Qxe0wulV0bxarsQ05PqDNF.jpg" },
  { id: 17654, title: "District 9", year: 2009, genre: "Science Fiction", poster: "/tuGlQkqLxnodDSk6mp5c2wvxUEd.jpg" },
  { id: 1830, title: "Lord of War", year: 2005, genre: "Crime · Drama", poster: "/3MGQD4yXokufNlW1AyRXdiy7ytP.jpg" },
  { id: 88751, title: "Journey to the Center of the Earth", year: 2008, genre: "Action · Science Fiction", poster: "/kL55wY0s2H9JdwfjoWIp9plvYnl.jpg" },
  { id: 4108, title: "The Transporter", year: 2002, genre: "Action · Crime", poster: "/dncJ81z1BahrT3ogLvlxOUC5n4u.jpg" },
  { id: 8856, title: "The Karate Kid Part II", year: 1986, genre: "Adventure · Drama", poster: "/k0OwgRR6PNu7h3SiqpCbRdZWNaG.jpg" },
  { id: 710, title: "GoldenEye", year: 1995, genre: "Adventure · Action", poster: "/z0ljRnNxIO7CRBhLEO0DvLgAFPR.jpg" },
  { id: 1050035, title: "Monster", year: 2023, genre: "Mystery · Thriller", poster: "/kvUJUyUGOhEoiWWNH04IXoExPE2.jpg" },
  { id: 1427, title: "Perfume: The Story of a Murderer", year: 2006, genre: "Crime · Fantasy", poster: "/2wrFrUej8ri5EpjgIkjKTAnr686.jpg" },
  { id: 9602, title: "Coming to America", year: 1988, genre: "Comedy · Romance", poster: "/8YZiA1o264dk0cr1USyMdph6SZl.jpg" },
  { id: 9880, title: "The Princess Diaries", year: 2001, genre: "Comedy · Family", poster: "/qSw4lzhDGeM5MjQc86BLzJALhBs.jpg" },
  { id: 2280, title: "Big", year: 1988, genre: "Fantasy · Drama", poster: "/eWhCDJiwxvx3YXkAFRiHjimnF0j.jpg" },
  { id: 87428, title: "That's My Boy", year: 2012, genre: "Comedy", poster: "/oaLhdRsZ5Mq8VfZtA4Wlvjzzn0X.jpg" },
  { id: 64682, title: "The Great Gatsby", year: 2013, genre: "Drama · Romance", poster: "/tyxfCBQv6Ap74jcu3xd7aBiaa29.jpg" },
  { id: 37265, title: "All Ladies Do It", year: 1992, genre: "Comedy · Drama", poster: "/7MKmQ9TdHQdiYpVGyZFBu6aFTvE.jpg" },
  { id: 20526, title: "TRON: Legacy", year: 2010, genre: "Adventure · Action", poster: "/8Nc6R8k7bG8frSiDJo0oLucF7dN.jpg" },
  { id: 62213, title: "Dark Shadows", year: 2012, genre: "Comedy · Fantasy", poster: "/fd9Ck4cxVlmtXsbeGtQW7WFuUFI.jpg" },
  { id: 534, title: "Terminator Salvation", year: 2009, genre: "Action · Science Fiction", poster: "/gw6JhlekZgtKUFlDTezq3j5JEPK.jpg" },
  { id: 118340, title: "Guardians of the Galaxy", year: 2014, genre: "Action · Science Fiction", poster: "/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg" },
  { id: 8914, title: "Deep Blue Sea", year: 1999, genre: "Action · Horror", poster: "/fyn0zyCI4kIlbDoHH0Hzv09hDC5.jpg" },
  { id: 861, title: "Total Recall", year: 1990, genre: "Action · Adventure", poster: "/wVbeL6fkbTKSmNfalj4VoAUUqJv.jpg" },
  { id: 591, title: "The Da Vinci Code", year: 2006, genre: "Thriller · Mystery", poster: "/9ejKfNk0LBhSI9AahH4f9NJNZNM.jpg" },
  { id: 43949, title: "Flipped", year: 2010, genre: "Romance · Drama", poster: "/6zDYFigohwncqFL00MKbFV01dWb.jpg" },
  { id: 122906, title: "About Time", year: 2013, genre: "Drama · Romance", poster: "/ls6zswrOZVhCXQBh96DlbnLBajM.jpg" },
  { id: 88, title: "Dirty Dancing", year: 1987, genre: "Drama · Music", poster: "/9Jw6jys7q9gjzVX5zm1z0gC8gY9.jpg" },
  { id: 2108, title: "The Breakfast Club", year: 1985, genre: "Comedy · Drama", poster: "/gp4zlj7wgbiofLMNsTPndMuO3PN.jpg" },
  { id: 7551, title: "Déjà Vu", year: 2006, genre: "Action · Thriller", poster: "/eTX6hklzFOiEVqVukNCEedZKhix.jpg" },
  { id: 9016, title: "Treasure Planet", year: 2002, genre: "Science Fiction · Adventure", poster: "/kNhZkR3UNbXfvESQo7mJpOi4tGd.jpg" },
  { id: 9732, title: "The Lion King II: Simba's Pride", year: 1998, genre: "Family · Adventure", poster: "/sWR1x6UCMCGN9xEf8RGhPS934X0.jpg" },
  { id: 9277, title: "The Sting", year: 1973, genre: "Comedy · Crime", poster: "/ckmYng37zey8INYf6d10cVgIG93.jpg" },
  { id: 19994, title: "Jennifer's Body", year: 2009, genre: "Horror · Comedy", poster: "/wrkjsGcFJxcQqR56kJUYAEKKg2T.jpg" },
  { id: 9383, title: "Hollow Man", year: 2000, genre: "Action · Science Fiction", poster: "/sd3qUIv5uoP2oTbqv66CzXSPjKG.jpg" },
  { id: 2756, title: "The Abyss", year: 1989, genre: "Adventure · Thriller", poster: "/2dCit3XAtv9KWCJvRKdPkJ0FAkH.jpg" },
  { id: 755, title: "From Dusk Till Dawn", year: 1996, genre: "Horror · Action", poster: "/sV3kIAmvJ9tPz4Lq5fuf9LLMxte.jpg" },
  { id: 676, title: "Pearl Harbor", year: 2001, genre: "War · Romance", poster: "/y8A0Cvp8WQmZ3bjbnsL53lY0dsC.jpg" },
  { id: 9928, title: "Robots", year: 2005, genre: "Animation · Comedy", poster: "/fnKCh67l2DDG9NxxIlk9IpsXQ99.jpg" },
  { id: 322, title: "Mystic River", year: 2003, genre: "Thriller · Crime", poster: "/hCHVDbo6XJGj3r2i4hVjKhE0GKF.jpg" },
  { id: 54989, title: "Love Strange Love", year: 1982, genre: "Drama · History", poster: "/9CNnxpI6H8ynyOlACRc25vqgJBY.jpg" },
  { id: 1359607, title: "Miss Kobayashi's Dragon Maid: A lonely dragon wants to be loved", year: 2025, genre: "Animation · Comedy", poster: "/kN0V877loq6kkDybVbi3KcrjwgE.jpg" },
  { id: 279, title: "Amadeus", year: 1984, genre: "History · Music", poster: "/gQRfiyfGvr1az0quaYyMram3Aqt.jpg" },
  { id: 9804, title: "Waterworld", year: 1995, genre: "Adventure · Action", poster: "/X4UyUO5jgzs3c5YafnmYKLKKYw.jpg" },
  { id: 568, title: "Apollo 13", year: 1995, genre: "Drama · History", poster: "/tVeKscCm2fY1xDXZk8PgnZ87h9S.jpg" },
  { id: 10483, title: "Death Race", year: 2008, genre: "Action · Thriller", poster: "/5A79GeOb3uChQ0l0ZDjDyODKQp3.jpg" },
  { id: 1892, title: "Return of the Jedi", year: 1983, genre: "Adventure · Action", poster: "/jQYlydvHm3kUix1f8prMucrplhm.jpg" },
  { id: 129123, title: "Erotic Nightmare", year: 1999, genre: "Horror", poster: "/oAhoJB26AFudZjHigoAV6tBaPtM.jpg" },
  { id: 33, title: "Unforgiven", year: 1992, genre: "Western", poster: "/54roTwbX9fltg85zjsmrooXAs12.jpg" },
  { id: 137, title: "Groundhog Day", year: 1993, genre: "Romance · Fantasy", poster: "/gCgt1WARPZaXnq523ySQEUKinCs.jpg" },
  { id: 18069, title: "8 Seconds", year: 1994, genre: "Drama · Romance", poster: "/wqKVkOveZrK6zwfrptGLVPmnMpR.jpg" },
  { id: 670435, title: "Female Teacher Diary: Forbidden Sex", year: 1995, genre: "Romance · Drama", poster: "/wD7Xtfd91hfl66pMDWp1i8dVyX0.jpg" },
  { id: 10764, title: "Quantum of Solace", year: 2008, genre: "Adventure · Action", poster: "/e3DXXLJHGqMx9yYpXsql1XNljmM.jpg" },
  { id: 1593, title: "Night at the Museum", year: 2006, genre: "Fantasy · Family", poster: "/pDsAAYf6Zn0yiAGJ6lYGs6hoZ4E.jpg" },
  { id: 37135, title: "Tarzan", year: 1999, genre: "Animation · Family", poster: "/bTvHlcqiOjGa3lFtbrTLTM3zasY.jpg" },
  { id: 310, title: "Bruce Almighty", year: 2003, genre: "Fantasy · Comedy", poster: "/3XJKBKh9Km89EoUEitVTSnrlAkZ.jpg" },
  { id: 7555, title: "Rambo", year: 2008, genre: "Action · Thriller", poster: "/3mInub5c8o00H7EJ1TrjAqOzIuc.jpg" },
  { id: 2118, title: "L.A. Confidential", year: 1997, genre: "Crime · Mystery", poster: "/lWCgf5sD5FpMljjpkRhcC8pXcch.jpg" },
  { id: 570595, title: "Russian Nymphet: Temptation", year: 2004, genre: "Drama · Romance", poster: "/dYrocmJO2bCFI5aYkuaYogkrgmu.jpg" },
  { id: 843, title: "In the Mood for Love", year: 2000, genre: "Drama · Romance", poster: "/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg" },
  { id: 9339, title: "Click", year: 2006, genre: "Comedy · Drama", poster: "/oL0k5JA53PyoHSZqKb3cNkhwBCE.jpg" },
  { id: 2057, title: "Original Sin", year: 2001, genre: "Thriller · Drama", poster: "/7wB76uteIjw95oygMdCkmcibJg3.jpg" },
  { id: 10054, title: "Spy Kids", year: 2001, genre: "Family · Action", poster: "/j3rUkHIAAoKr6jU30q3Db4fcIF9.jpg" },
  { id: 1933, title: "The Others", year: 2001, genre: "Horror · Mystery", poster: "/p8g1vlTvpM6nr2hMMiZ1fUlKF0D.jpg" },
  { id: 1450527, title: "Forbidden Fruits", year: 2026, genre: "Horror · Comedy", poster: "/t3hvrrrqvRoURz4y1A1aCys6WD9.jpg" },
  { id: 1637, title: "Speed", year: 1994, genre: "Action · Thriller", poster: "/82PkCE4R95KhHICUDF7G4Ly2z3l.jpg" },
  { id: 1209511, title: "Love Insurance Kompany", year: 2026, genre: "Romance · Science Fiction", poster: "/dHEuGKZBkEx4RcaVV8rYahORNPA.jpg" },
  { id: 4476, title: "Legends of the Fall", year: 1994, genre: "Drama · Western", poster: "/t1KPGlW0UGd0m515LPQmk2F4nu1.jpg" },
  { id: 693, title: "Meet the Fockers", year: 2004, genre: "Comedy · Romance", poster: "/59fXm6N2x7QSbvt6BaBxTNBXGL8.jpg" },
  { id: 19173, title: "Diary of a Nymphomaniac", year: 2008, genre: "Drama · Romance", poster: "/yVYTeiFv7oQsSQF9OBRngg7ZqLg.jpg" },
  { id: 21542, title: "Love Don't Co$t a Thing", year: 2003, genre: "Comedy · Drama", poster: "/88zspc72LIkfiuMnGpHnsWCuqEH.jpg" },
  { id: 1894, title: "Star Wars: Episode II - Attack of the Clones", year: 2002, genre: "Adventure · Action", poster: "/oZNPzxqM2s5DyVWab09NTQScDQt.jpg" },
  { id: 11362, title: "The Count of Monte Cristo", year: 2002, genre: "Adventure · Drama", poster: "/ifMgDAUXVQLY4DeOu3VTTi55jSP.jpg" },
  { id: 9286, title: "Final Destination 3", year: 2006, genre: "Horror · Mystery", poster: "/p7ARuNKUGPGvkBiDtIDvAzYzonX.jpg" },
  { id: 117, title: "The Untouchables", year: 1987, genre: "Crime · History", poster: "/tPq0R4jTO4Ey8ZspFaWK9wGA4Ls.jpg" },
  { id: 7345, title: "There Will Be Blood", year: 2007, genre: "Drama", poster: "/fa0RDkAlCec0STeMNAhPaF89q6U.jpg" },
  { id: 1635, title: "The Island", year: 2005, genre: "Action · Thriller", poster: "/9MaZYEyFmQwNeDTxZGQEN8E0e4p.jpg" },
  { id: 12222, title: "Horton Hears a Who!", year: 2008, genre: "Animation · Comedy", poster: "/6k47Z3A5zI2rxubTMwiLyIqQLLr.jpg" },
  { id: 1364, title: "Sex and Lucía", year: 2001, genre: "Drama · Romance", poster: "/gvErAg9bv7xOO3B40gottv6Bqip.jpg" },
  { id: 2649, title: "The Game", year: 1997, genre: "Drama · Thriller", poster: "/4UOa079915QjiTA2u5hT2yKVgUu.jpg" },
  { id: 9679, title: "Gone in Sixty Seconds", year: 2000, genre: "Action · Crime", poster: "/fToQDmkBtiXYGh9xfgAh3gpo6GZ.jpg" },
  { id: 1374, title: "Rocky IV", year: 1985, genre: "Drama", poster: "/2MHUit4H6OK5adcOjnCN6suCKOl.jpg" },
  { id: 628, title: "Interview with the Vampire", year: 1994, genre: "Horror · Drama", poster: "/2162lAT2MP36MyJd2sttmj5du5T.jpg" },
  { id: 37136, title: "The Naked Gun: From the Files of Police Squad!", year: 1988, genre: "Comedy · Crime", poster: "/zT0mhZqZQJE1gSY5Eg9qcGP4NYo.jpg" },
  { id: 13494, title: "Red Sonja", year: 2025, genre: "Adventure · Action", poster: "/aE3yh4y0h96CZZpLo0UDFMWZAA9.jpg" },
  { id: 1369, title: "Rambo: First Blood Part II", year: 1985, genre: "Action · Adventure", poster: "/pzPdwOitmTleVE3YPMfIQgLh84p.jpg" },
  { id: 2268, title: "The Golden Compass", year: 2007, genre: "Adventure · Fantasy", poster: "/mIHV28g4Zhbc8yhnhOixa8m4p5O.jpg" },
  { id: 38142, title: "5 Centimeters per Second", year: 2007, genre: "Animation · Romance", poster: "/dFipUR6W0y3PPkuVS8gjFd929m2.jpg" },
  { id: 5174, title: "Rush Hour 3", year: 2007, genre: "Action · Comedy", poster: "/mp9CzKxLa2i7yblMXUrzVfGqsCo.jpg" },
  { id: 4257, title: "Scary Movie 4", year: 2006, genre: "Comedy", poster: "/sEqFdw1wLtY94RKCSPolsHWzn6r.jpg" },
  { id: 2907, title: "The Addams Family", year: 1991, genre: "Comedy · Fantasy", poster: "/qFf8anju5f2epI0my8RdwwIXFIP.jpg" },
  { id: 235, title: "Stand by Me", year: 1986, genre: "Crime · Drama", poster: "/vz0w9BSehcqjDcJOjRaCk7fgJe7.jpg" },
  { id: 1729, title: "The Forbidden Kingdom", year: 2008, genre: "Action · Adventure", poster: "/z8chF1Z7hyuSVqLYTgElkQZh2VB.jpg" },
  { id: 9378, title: "Thir13en Ghosts", year: 2001, genre: "Horror · Thriller", poster: "/6yrrddjIjx0ElCRZp5pTZeqrj3k.jpg" },
  { id: 11104, title: "Chungking Express", year: 1994, genre: "Drama · Comedy", poster: "/43I9DcNoCzpyzK8JCkJYpHqHqGG.jpg" },
  { id: 9487, title: "A Bug's Life", year: 1998, genre: "Family · Animation", poster: "/Ah3J9OJVc2CNCuH2zMydXy9fmIC.jpg" },
  { id: 104894, title: "A Garden Without Birds", year: 1992, genre: "Horror", poster: "/7BkL7rz9cyVZAlvxKmeMLAnNvd9.jpg" },
  { id: 70345, title: "Sssssss", year: 1973, genre: "Horror · Science Fiction", poster: "/fIKiHta0LrDpb2f80u7ybPFesoy.jpg" },
  { id: 865, title: "The Running Man", year: 1987, genre: "Action · Thriller", poster: "/GTAUOhO4BN0peJVvxGEQydJvUO.jpg" },
  { id: 956, title: "Mission: Impossible III", year: 2006, genre: "Adventure · Action", poster: "/vKGYCpmQyV9uHybWDzXuII8Los5.jpg" },
  { id: 9335, title: "Transporter 2", year: 2005, genre: "Action · Thriller", poster: "/cdm17vK8PxHfTi7ayZf6WKbOgUO.jpg" },
  { id: 9358, title: "Final Destination 2", year: 2003, genre: "Horror · Mystery", poster: "/vnFgxRlLTA9fDNcGXLiHmgwmIEo.jpg" },
  { id: 13183, title: "Watchmen", year: 2009, genre: "Mystery · Action", poster: "/u0ROjy3KPzMDTipqCrwD8LwkKSQ.jpg" },
  { id: 9341, title: "The Core", year: 2003, genre: "Science Fiction · Adventure", poster: "/iMPR3OFhKNVvJw4eZoRhf9RzfHJ.jpg" },
  { id: 856, title: "Who Framed Roger Rabbit", year: 1988, genre: "Fantasy · Animation", poster: "/lYfRc57Kx9VgLZ48iulu0HKnM15.jpg" },
  { id: 1541, title: "Thelma & Louise", year: 1991, genre: "Drama · Crime", poster: "/gQSUVGR80RVHxJywtwXm2qa1ebi.jpg" },
  { id: 1131759, title: "Omniscient Reader: The Prophecy", year: 2025, genre: "Action · Adventure", poster: "/uXdKubg6wHG9poAsKweUM1zQpdy.jpg" },
  { id: 1637319, title: "Hannah Montana 20th Anniversary Special", year: 2026, genre: "Documentary · Music", poster: "/2BZ0bij5ORSvfDepCDD8CqVcpaG.jpg" },
  { id: 275, title: "Fargo", year: 1996, genre: "Crime · Drama", poster: "/rt7cpEr1uP6RTZykBFhBTcRaKvG.jpg" },
  { id: 36586, title: "Blade II", year: 2002, genre: "Fantasy · Horror", poster: "/yDHwo3eWcMiy5LnnEnlGV9iLu9k.jpg" },
  { id: 1370, title: "Rambo III", year: 1988, genre: "Action · Adventure", poster: "/uycbt9iVlAnKkQIisqUWuO8hVcm.jpg" },
  { id: 942, title: "Lethal Weapon 2", year: 1989, genre: "Action · Thriller", poster: "/ZsUGxTnZ4TzTrHSAfUPJcliL1K.jpg" },
  { id: 1244517, title: "Tow", year: 2026, genre: "Drama", poster: "/wMd9UIyRYjnZLP0VcadMCeFHwKp.jpg" },
  { id: 4488, title: "Friday the 13th", year: 1980, genre: "Horror", poster: "/uGGpnWHOmWTARVN9wbC1nPxNgps.jpg" },
  { id: 79871, title: "Crazy Love", year: 1993, genre: "Comedy · Romance", poster: "/vM4Tb2Wxk2X0Sgfy1wAS9bzSZsa.jpg" },
  { id: 817, title: "Austin Powers: The Spy Who Shagged Me", year: 1999, genre: "Comedy · Adventure", poster: "/jiF7UShERJFn5RtgfBK2lIJrOTc.jpg" },
  { id: 1250, title: "Ghost Rider", year: 2007, genre: "Thriller · Action", poster: "/1pyU94dAY7npDQCKuxCSyX9KthN.jpg" },
  { id: 853, title: "Enemy at the Gates", year: 2001, genre: "War · History", poster: "/cHRAbVdsCWFaQrswRsBP7Bn255W.jpg" },
  { id: 19912, title: "The Final Destination", year: 2009, genre: "Horror · Mystery", poster: "/5vxXrr1MqGsT4NNeRITpfDnl4Rq.jpg" },
  { id: 5548, title: "RoboCop", year: 1987, genre: "Action · Thriller", poster: "/esmAU0fCO28FbS6bUBKLAzJrohZ.jpg" },
  { id: 10555, title: "Shark Tale", year: 2004, genre: "Animation · Action", poster: "/r08DpyPyhXcJTfNZAICNGMzcQ8l.jpg" },
  { id: 32292, title: "Guinea Pig: Mermaid in the Manhole", year: 1988, genre: "Horror · Romance", poster: "/vN2JcO9ZIn00DbuDbNjCWtqwqS6.jpg" },
  { id: 535, title: "Flashdance", year: 1983, genre: "Drama · Romance", poster: "/ziiy6ORt8BlxWFXskBChBMInvDA.jpg" },
  { id: 1824, title: "50 First Dates", year: 2004, genre: "Comedy · Romance", poster: "/lzUI2Cg7OMfcUNv3f7MywYNBjs6.jpg" },
  { id: 1571, title: "Live Free or Die Hard", year: 2007, genre: "Action · Thriller", poster: "/31TT47YjBl7a7uvJ3ff1nrirXhP.jpg" },
  { id: 522627, title: "The Gentlemen", year: 2020, genre: "Comedy · Crime", poster: "/jtrhTYB7xSrJxR1vusu99nvnZ1g.jpg" },
  { id: 30497, title: "The Texas Chain Saw Massacre", year: 1974, genre: "Horror", poster: "/mpgkRPH1GNkMCgdPk2OMyHzAks7.jpg" },
  { id: 12244, title: "9", year: 2009, genre: "Action · Adventure", poster: "/3uqXGOH4BQ2CLJWkDJZ0PzbUzOn.jpg" },
  { id: 1538, title: "Collateral", year: 2004, genre: "Drama · Crime", poster: "/nV5316WUsVij8sVXLCF1g7TFitg.jpg" },
  { id: 60898, title: "Erotic Ghost Story", year: 1990, genre: "Fantasy · Drama", poster: "/fTUCwsxVoLFuodAtlL6aITP1B45.jpg" },
  { id: 1356039, title: "Counterattack", year: 2025, genre: "Action · Adventure", poster: "/38I76hGcFY6xB47pjm7pZwkfuAF.jpg" },
  { id: 9387, title: "Conan the Barbarian", year: 1982, genre: "Adventure · Fantasy", poster: "/qw2A587Ee61IwcSOLNFRhuOACZZ.jpg" },
  { id: 76, title: "Before Sunrise", year: 1995, genre: "Drama · Romance", poster: "/kf1Jb1c2JAOqjuzA3H4oDM263uB.jpg" },
  { id: 503, title: "Poseidon", year: 2006, genre: "Adventure · Action", poster: "/fDPdjGc8SUEDWfTwMaZlCE6NSi3.jpg" },
  { id: 1417, title: "Pan's Labyrinth", year: 2006, genre: "Fantasy · Drama", poster: "/z7xXihu5wHuSMWymq5VAulPVuvg.jpg" },
  { id: 215, title: "Saw II", year: 2005, genre: "Horror", poster: "/gTnaTysN8HsvVQqTRUh8m35mmUA.jpg" },
  { id: 93685, title: "Swingers", year: 2002, genre: "Romance · Drama", poster: "/cEIVkvx6mGSjnkOxlXh6eHd1Y4K.jpg" },
  { id: 4977, title: "Paprika", year: 2006, genre: "Science Fiction · Thriller", poster: "/bLUUr474Go1DfeN1HLjE3rnZXBq.jpg" },
  { id: 53064, title: "Midori", year: 1992, genre: "Animation · Drama", poster: "/iv3TU7RAuWnMwhsYd7eaAIJ3NuO.jpg" },
  { id: 400928, title: "Gifted", year: 2017, genre: "Drama · Comedy", poster: "/9Ts7Vc4wLlpI9oox9mkVUE1tBHy.jpg" },
  { id: 9390, title: "Jerry Maguire", year: 1996, genre: "Comedy · Drama", poster: "/lABvGN7fDk5ifnwZoxij6G96t2w.jpg" },
  { id: 255709, title: "Hope", year: 2013, genre: "Drama", poster: "/x9yjkm9gIz5qI5fJMUTfBnWiB2o.jpg" },
  { id: 9312, title: "Mortal Kombat", year: 1995, genre: "Action · Fantasy", poster: "/fcK7tzSSXMYiMN8E9KlZJL1BYyp.jpg" },
  { id: 7340, title: "Carrie", year: 1976, genre: "Horror · Thriller", poster: "/8tT1rqlsTguyfUBMrbHR9cv1rxM.jpg" },
  { id: 8077, title: "Alien³", year: 1992, genre: "Science Fiction · Action", poster: "/xh5wI0UoW7DfS1IyLy3d2CgrCEP.jpg" },
  { id: 1677, title: "Ray", year: 2004, genre: "Drama · Music", poster: "/tSPC7sO2XYNL9QcMmK88tuUALL5.jpg" },
  { id: 1643, title: "Last Tango in Paris", year: 1972, genre: "Drama · Romance", poster: "/dNgdUdNOWfHsZI3lDu6Epig7H2P.jpg" },
  { id: 1244492, title: "Look Back", year: 2024, genre: "Animation · Drama", poster: "/4f2EcNkp1Mvp9wE5w7HKxcmACWg.jpg" },
  { id: 196, title: "Back to the Future Part III", year: 1990, genre: "Adventure · Comedy", poster: "/crzoVQnMzIrRfHtQw0tLBirNfVg.jpg" },
  { id: 6477, title: "Alvin and the Chipmunks", year: 2007, genre: "Comedy · Family", poster: "/3s3WvpKPXXeKAPketDDqiQTi20S.jpg" },
  { id: 8810, title: "Mad Max 2", year: 1981, genre: "Adventure · Action", poster: "/l1KVEhkGDpWRzQ0VqIhZqDDuOim.jpg" },
  { id: 776503, title: "CODA", year: 2021, genre: "Drama · Music", poster: "/BzVjmm8l23rPsijLiNLUzuQtyd.jpg" },
  { id: 19673, title: "Sexmission", year: 1984, genre: "Science Fiction · Adventure", poster: "/8zh3AuXBxGbgtebL5DpaDxJgMeW.jpg" },
  { id: 8656, title: "Deep Impact", year: 1998, genre: "Action · Drama", poster: "/a3vQS7JKqlOb3MdVJHuTCP9s7Mg.jpg" },
  { id: 7518, title: "Over the Hedge", year: 2006, genre: "Family · Comedy", poster: "/jtZnymorbnHY7mOiBXR14ZDJseM.jpg" },
  { id: 2770, title: "American Pie 2", year: 2001, genre: "Comedy · Romance", poster: "/854ZZxXdeabAs90mrV72NqShJqR.jpg" },
  { id: 406997, title: "Wonder", year: 2017, genre: "Family · Drama", poster: "/sONh3LYGFcVDTy8pm1tbSOB13Li.jpg" },
  { id: 9374, title: "Death Becomes Her", year: 1992, genre: "Comedy · Fantasy", poster: "/kkWxyyyWFK5KNk9WVwQuGEC9H9H.jpg" },
  { id: 10585, title: "Child's Play", year: 1988, genre: "Horror", poster: "/wvpgvcWNkF2HLuTEMIM7K83MvZ.jpg" },
  { id: 155601, title: "True Story of a Woman in Jail: Continues", year: 1975, genre: "Action · Drama", poster: "/cvyKtFoyxLdPYB4NjL7VlJRnNXN.jpg" },
  { id: 11969, title: "Tombstone", year: 1993, genre: "Western · Action", poster: "/wGFCvylul8iEQhJOKfwZGGvXMzA.jpg" },
  { id: 59210, title: "The Mother", year: 2003, genre: "Drama · Romance", poster: "/uCoIolCRu8edvQidFDMOdKLPH3t.jpg" },
  { id: 9739, title: "Demolition Man", year: 1993, genre: "Crime · Action", poster: "/dq6AmlVFo92PRuoLCcIyFdoRuxf.jpg" },
  { id: 9479, title: "The Nightmare Before Christmas", year: 1993, genre: "Fantasy · Animation", poster: "/oQffRNjK8e19rF7xVYEN8ew0j7b.jpg" },
  { id: 2059, title: "National Treasure", year: 2004, genre: "Adventure · Action", poster: "/pxL6E4GBOPUG6CdkO9cUQN5VMwI.jpg" },
  { id: 15092, title: "Crank: High Voltage", year: 2009, genre: "Action · Thriller", poster: "/tzTC4EEvF0OPL63frEiogxL2T8M.jpg" },
  { id: 16320, title: "Serenity", year: 2005, genre: "Science Fiction · Action", poster: "/4sqUOaPFoP2W81mq1UYqZqf5WzA.jpg" },
  { id: 8839, title: "Casper", year: 1995, genre: "Fantasy · Comedy", poster: "/2ah8fNJFZVU3vcXhU5xfAYi2eym.jpg" },
  { id: 1272, title: "Sunshine", year: 2007, genre: "Science Fiction · Thriller", poster: "/oKGGeJ8qvm0UmClz43VJ31fzPP7.jpg" },
  { id: 916224, title: "Suzume", year: 2022, genre: "Animation · Drama", poster: "/yStW1TXF5s7Tbtu9KjIZEaWl6HL.jpg" },
  { id: 36669, title: "Die Another Day", year: 2002, genre: "Adventure · Action", poster: "/bZmGqOhMhaLn8AoFMvFDct4tbrL.jpg" },
  { id: 75, title: "Mars Attacks!", year: 1996, genre: "Comedy · Fantasy", poster: "/hll4O5vSAfnZDb6JbnP06GPtz7b.jpg" },
  { id: 620249, title: "The Legend of Hei", year: 2019, genre: "Animation · Fantasy", poster: "/4jfbKKLpqts3i2h2obkrONcjTg1.jpg" },
  { id: 11713, title: "Fist of Fury", year: 1972, genre: "Drama · Action", poster: "/dlcipCOa9hlfBBz7kCAyjsf3q0E.jpg" },
  { id: 1885, title: "The Karate Kid", year: 1984, genre: "Action · Drama", poster: "/1mp4ViklKvA0WXXsNvNx0RBuiit.jpg" },
  { id: 9495, title: "The Crow", year: 1994, genre: "Fantasy · Action", poster: "/rMMB3v6jYHjsvXRNJYESacoTD7j.jpg" },
  { id: 581528, title: "The Gangster, the Cop, the Devil", year: 2019, genre: "Action · Crime", poster: "/oHlM4abRm6BzrRcz9Nup1uidw9H.jpg" },
  { id: 21208, title: "Orphan", year: 2009, genre: "Horror · Thriller", poster: "/lCGpOgoTOGLtZnBiGY9HRg5Xnjd.jpg" },
  { id: 9462, title: "The Way of the Dragon", year: 1972, genre: "Action · Crime", poster: "/m7AIITQ624sfldI4SsX4htXPH1f.jpg" },
  { id: 943, title: "Lethal Weapon 3", year: 1992, genre: "Action · Thriller", poster: "/smzJxEnusgqv3bvHIWwf4cuwPcr.jpg" },
  { id: 7446, title: "Tropic Thunder", year: 2008, genre: "Action · Comedy", poster: "/zAurB9mNxfYRoVrVjAJJwGV3sPg.jpg" },
  { id: 929, title: "Godzilla", year: 1998, genre: "Science Fiction · Action", poster: "/xJVl1I95StraYAwaNbBkVoWE2qA.jpg" },
  { id: 298, title: "Ocean's Thirteen", year: 2007, genre: "Crime · Thriller", poster: "/pBsZs4zYUiUTemqbikTZ76iQRaU.jpg" },
  { id: 7220, title: "The Punisher", year: 2004, genre: "Action · Crime", poster: "/7rmA1HwYp2GKM85BL0cVwCaosGr.jpg" },
  { id: 829, title: "Chinatown", year: 1974, genre: "Crime · Drama", poster: "/kZRSP3FmOcq0xnBulqpUQngJUXY.jpg" },
  { id: 8247, title: "Jumper", year: 2008, genre: "Action · Adventure", poster: "/3pPZ9JhNz3VMmASVir5SMHvTDUU.jpg" },
  { id: 4347, title: "Atonement", year: 2007, genre: "Drama · Romance", poster: "/hMRIyBjPzxaSXWM06se3OcNjIQa.jpg" },
  { id: 9360, title: "Anaconda", year: 1997, genre: "Adventure · Horror", poster: "/33NysOnLpLZY0ewHTcfpalzAsRG.jpg" },
  { id: 9476, title: "A Knight's Tale", year: 2001, genre: "Adventure · Drama", poster: "/srb1XnrlDZHcdpjBKqUu4qAzxKU.jpg" },
  { id: 714, title: "Tomorrow Never Dies", year: 1997, genre: "Adventure · Action", poster: "/gZm002w7q9yLOkltxT76TWGfdZX.jpg" },
  { id: 9475, title: "Scent of a Woman", year: 1992, genre: "Drama", poster: "/4adI7IaveWb7EidYXfLb3MK3CgO.jpg" },
  { id: 9355, title: "Mad Max Beyond Thunderdome", year: 1985, genre: "Action · Adventure", poster: "/jJlxcEVVUHnrUeEkQ0077VeHQpb.jpg" },
  { id: 2322, title: "Sneakers", year: 1992, genre: "Comedy · Crime", poster: "/l2pIGwCvpZEpBuMb55YBl6A04Jv.jpg" },
  { id: 1584, title: "School of Rock", year: 2003, genre: "Comedy · Music", poster: "/zXLXaepIBvFVLU25DH3wv4IPSbe.jpg" },
  { id: 9316, title: "Ong-Bak", year: 2003, genre: "Action · Crime", poster: "/oagqAwp48dMPoCT94yDJUDOCVPi.jpg" },
  { id: 10665, title: "The Strangers", year: 2008, genre: "Horror · Thriller", poster: "/gwsg4qFmLOvlhwXj4OZuxfFUdP0.jpg" },
  { id: 37169, title: "The Human Centipede (First Sequence)", year: 2009, genre: "Horror", poster: "/gMtjxIkEi0hnTV5lPHbgeZ4ZpUZ.jpg" },
  { id: 55721, title: "Bridesmaids", year: 2011, genre: "Comedy · Romance", poster: "/gJtA7hYsBMQ7EM3sPBMUdBfU7a0.jpg" },
  { id: 1624, title: "Liar Liar", year: 1997, genre: "Comedy", poster: "/p1habYSdC7oD3WygQ5lynU5G5rV.jpg" },
  { id: 9874, title: "Cobra", year: 1986, genre: "Action · Crime", poster: "/rCN9c1NfxjfgMkTPFATOzUkNEyg.jpg" },
  { id: 11674, title: "101 Dalmatians", year: 1996, genre: "Family · Comedy", poster: "/8o2ADoAyG796UwTjwBFjPyBz0yG.jpg" },
  { id: 329, title: "Jurassic Park", year: 1993, genre: "Adventure · Science Fiction", poster: "/maFjKnJ62hDQ9E66dKqDZgbUy0H.jpg" },
  { id: 2666, title: "Dark City", year: 1998, genre: "Mystery · Science Fiction", poster: "/tNPEGju4DpTdbhBphNmZoEi9Bd3.jpg" },
  { id: 9291, title: "The Longest Yard", year: 2005, genre: "Drama · Comedy", poster: "/nbKcVBcxF96ARW2oKHqDYAcLdu.jpg" },
  { id: 11220, title: "Fallen Angels", year: 1995, genre: "Action · Romance", poster: "/yyM9BPdwttK5LKZSLvHae7QPKo1.jpg" },
  { id: 9833, title: "The Phantom of the Opera", year: 2004, genre: "Thriller · Drama", poster: "/aTsp2VTaCBiGs8w05OTXfD97FRZ.jpg" },
  { id: 25237, title: "Come and See", year: 1985, genre: "Drama · War", poster: "/qNbMsKVzigERgJUbwf8pKyZogpb.jpg" },
  { id: 30112, title: "Lost in Beijing", year: 2007, genre: "Romance · Drama", poster: "/2LZ7qbdnCqlOzlngcj5wdvnLfjA.jpg" },
  { id: 331482, title: "Little Women", year: 2019, genre: "Drama · Romance", poster: "/yn5ihODtZ7ofn8pDYfxCmxh8AXI.jpg" },
  { id: 957, title: "Spaceballs", year: 1987, genre: "Comedy · Science Fiction", poster: "/kNbaxEsnCyWBTfANVPHayujBsxp.jpg" },
  { id: 1995, title: "Lara Croft: Tomb Raider", year: 2001, genre: "Adventure · Action", poster: "/ye5h6fhfz8TkKV4QeuTucvFzxB9.jpg" },
  { id: 10999, title: "Commando", year: 1985, genre: "Action · Adventure", poster: "/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg" },
  { id: 594, title: "The Terminal", year: 2004, genre: "Comedy · Drama", poster: "/cPB3ZMM4UdsSAhNdS4c7ps5nypY.jpg" },
  { id: 1658217, title: "Sawsawan", year: 2026, genre: "Drama", poster: "/6L9hxSBK7JNISnvhrnnHb4BYRd6.jpg" },
  { id: 1620, title: "Hitman", year: 2007, genre: "Action · Thriller", poster: "/h69UJOOKlrHcvhl5H2LY74N61DQ.jpg" },
  { id: 9705, title: "Swordfish", year: 2001, genre: "Action · Crime", poster: "/mM6h4jMqC4q5IaFgBIGKQDLnRU.jpg" },
  { id: 10897, title: "The Little Rascals", year: 1994, genre: "Romance · Comedy", poster: "/qI7PKX2JSw4yD2iQm3pyHvKir28.jpg" },
  { id: 2123, title: "Me, Myself & Irene", year: 2000, genre: "Comedy", poster: "/rvRrcbLbpn7UJGRH1JupgHOeJFq.jpg" },
  { id: 8329, title: "[REC]", year: 2007, genre: "Horror · Mystery", poster: "/hgyJR4sgMsee6xMFM3xYiG6cDCh.jpg" },
  { id: 944, title: "Lethal Weapon 4", year: 1998, genre: "Action · Crime", poster: "/rtCfqVtEXaC7HJ0dJjUECZNzW3S.jpg" },
  { id: 9392, title: "The Descent", year: 2005, genre: "Adventure · Horror", poster: "/mxFPI4KYBk5ri9cPteIS8jiDFgj.jpg" },
  { id: 698, title: "Moonraker", year: 1979, genre: "Action · Adventure", poster: "/6LrJdXNmu5uHOVALZxVYd44Lva0.jpg" },
  { id: 9741, title: "Unbreakable", year: 2000, genre: "Thriller · Drama", poster: "/mLuehrGLiK5zFCyRmDDOH6gbfPf.jpg" },
  { id: 6947, title: "The Village", year: 2004, genre: "Drama · Mystery", poster: "/v7UvYtKfIVaHLaHwVgfalyrK7Ho.jpg" },
  { id: 6637, title: "National Treasure: Book of Secrets", year: 2007, genre: "Action · Adventure", poster: "/dc9F1vNOGbgeZrO9ejNkbgHPlfw.jpg" },
  { id: 11130, title: "The Princess Diaries 2: Royal Engagement", year: 2004, genre: "Comedy · Drama", poster: "/5XToqGcE4qdfOSaCPWI7kAb1bm7.jpg" },
  { id: 525, title: "The Blues Brothers", year: 1980, genre: "Music · Comedy", poster: "/rhYJKOt6UrQq7JQgLyQcSWW5R86.jpg" },
  { id: 1991, title: "Death Proof", year: 2007, genre: "Action · Thriller", poster: "/vtu6H4NWnQVqEp3aanUq3hNeeot.jpg" },
  { id: 36955, title: "True Lies", year: 1994, genre: "Action · Thriller", poster: "/pweFTnzzTfGK68woSVkiTgjLzWm.jpg" },
  { id: 440, title: "Aliens vs Predator: Requiem", year: 2007, genre: "Action · Science Fiction", poster: "/5iTwPDNtvK6ZZF607BHBbU3HO0B.jpg" },
  { id: 2454, title: "The Chronicles of Narnia: Prince Caspian", year: 2008, genre: "Adventure · Family", poster: "/qxz3WIyjZiSKUhaTIEJ3c1GcC9z.jpg" },
  { id: 319, title: "True Romance", year: 1993, genre: "Action · Crime", poster: "/39lXk6ud6KiJgGbbWI2PUKS7y2.jpg" },
  { id: 9522, title: "Wedding Crashers", year: 2005, genre: "Comedy · Romance", poster: "/lFM3lk2zVzC1YFnKm0r6LbFPyRu.jpg" },
  { id: 841, title: "Dune", year: 1984, genre: "Action · Science Fiction", poster: "/4kJmUCE7mkVJjXa7A0g2rY4IGTm.jpg" },
  { id: 9377, title: "Ferris Bueller's Day Off", year: 1986, genre: "Comedy", poster: "/9LTQNCvoLsKXP0LtaKAaYVtRaQL.jpg" },
  { id: 14262, title: "Desperate Living", year: 1977, genre: "Comedy · Crime", poster: "/nVus5axqx1MBldy5RO2Rf5AEUqu.jpg" },
  { id: 4011, title: "Beetlejuice", year: 1988, genre: "Fantasy · Comedy", poster: "/nnl6OWkyPpuMm595hmAxNW3rZFn.jpg" },
  { id: 1620551, title: "Feel My Voice", year: 2026, genre: "Music · Drama", poster: "/4Tf0qTA73XLhBnfP6YgvqtLZBnt.jpg" },
  { id: 1634949, title: "Lorne", year: 2026, genre: "Documentary", poster: "/u1Jdy5JfQpYUFA76hX5qcZyLKXD.jpg" },
  { id: 9798, title: "Enemy of the State", year: 1998, genre: "Action · Drama", poster: "/x9pXrMKLsBGGOFyyZ0Gwt9YpVub.jpg" },
  { id: 81, title: "Nausicaä of the Valley of the Wind", year: 1984, genre: "Adventure · Animation", poster: "/tcrkfB8SRPQCgwI88hQScua6nxh.jpg" },
  { id: 9702, title: "Bound by Honor", year: 1993, genre: "Crime · Drama", poster: "/gvP6R6juhe2IpCG7QGDgjyUvm0g.jpg" },
  { id: 10515, title: "Castle in the Sky", year: 1986, genre: "Adventure · Fantasy", poster: "/41XxSsJc5OrulP0m7TrrUeO2hoz.jpg" },
  { id: 619, title: "The Bodyguard", year: 1992, genre: "Action · Drama", poster: "/ihWF0uY1xnKqw9YK7ZHNLUZOhcO.jpg" },
  { id: 11230, title: "Drunken Master", year: 1978, genre: "Action · Comedy", poster: "/cf43J2SH8tECZVl9N5n0Q6Ckche.jpg" },
  { id: 639, title: "When Harry Met Sally...", year: 1989, genre: "Comedy · Romance", poster: "/rFOiFUhTMtDetqCGClC9PIgnC1P.jpg" },
  { id: 8367, title: "Robin Hood: Prince of Thieves", year: 1991, genre: "Action · Adventure", poster: "/hbRnWUNJkKKVN5mkcuC5ooqjE4e.jpg" },
  { id: 766, title: "Army of Darkness", year: 1992, genre: "Fantasy · Horror", poster: "/xsgTuAtR2zSH8Umg3jWZcZjlDpe.jpg" },
  { id: 9366, title: "Donnie Brasco", year: 1997, genre: "Crime · Drama", poster: "/xtKLvpOfARi1XVm8u2FTdhY5Piq.jpg" },
  { id: 24402, title: "Emmanuelle", year: 1974, genre: "Drama · Romance", poster: "/kFq1ffM4ruQmWH6C3SjVWJoqMi6.jpg" },
  { id: 9482, title: "Judge Dredd", year: 1995, genre: "Science Fiction · Action", poster: "/cfSnKn8NDU3m8UxihjVcYprA0Aq.jpg" },
  { id: 9323, title: "Ghost in the Shell", year: 1995, genre: "Action · Animation", poster: "/9gC88zYUBARRSThcG93MvW14sqx.jpg" },
  { id: 9872, title: "Explorers", year: 1985, genre: "Science Fiction · Adventure", poster: "/oFJosj5ECYjf1jkvpTEjGNzPx2x.jpg" },
  { id: 36643, title: "The World Is Not Enough", year: 1999, genre: "Adventure · Action", poster: "/wCb2msgoZPK01WIqry24M4xsM73.jpg" },
  { id: 11778, title: "The Deer Hunter", year: 1978, genre: "Drama · War", poster: "/bbGtogDZOg09bm42KIpCXUXICkh.jpg" },
  { id: 10222, title: "Kickboxer", year: 1989, genre: "Action · Thriller", poster: "/58ZbhxPT8UrUpxEZVvLtinXDB1a.jpg" },
  { id: 820067, title: "The Quintessential Quintuplets Movie", year: 2022, genre: "Animation · Comedy", poster: "/sg7klpt1xwK1IJirBI9EHaqQwJ5.jpg" },
  { id: 1700, title: "Misery", year: 1990, genre: "Drama · Thriller", poster: "/klPO5oh1LOxiPpdDXZo1ADgpKcw.jpg" },
  { id: 1421609, title: "Now I Met Her", year: 2026, genre: "Family · Comedy", poster: "/jv5NlASaYmGkaIad07g0iu0s75B.jpg" },
  { id: 609, title: "Poltergeist", year: 1982, genre: "Horror", poster: "/m5AKo8iZAYulI87Uzxkn87vRY07.jpg" },
  { id: 881, title: "A Few Good Men", year: 1992, genre: "Drama", poster: "/rLOk4z9zL1tTukIYV56P94aZXKk.jpg" },
  { id: 46853, title: "Playing with Love", year: 1977, genre: "Drama", poster: "/nu5uj47KSF73VPEiIRYdPLJ96j7.jpg" },
  { id: 9560, title: "A Walk in the Clouds", year: 1995, genre: "Drama · Romance", poster: "/xencQzZnUWDRAOUydjf9PWet8Ae.jpg" },
  { id: 10428, title: "Hackers", year: 1995, genre: "Action · Crime", poster: "/w8H2KpRtpzwlxz5KrvINCVihok1.jpg" },
  { id: 253, title: "Live and Let Die", year: 1973, genre: "Adventure · Action", poster: "/39qkrjqMZs6utwNmihVImC3ghas.jpg" },
  { id: 241, title: "Natural Born Killers", year: 1994, genre: "Crime · Thriller", poster: "/fEKZwT91gxvkAoyPgpNXo8W5fu0.jpg" },
  { id: 62201, title: "Shahenshah", year: 1988, genre: "Action", poster: "/2ZUpj73MzEh2YwVzJNVUqBSu2LZ.jpg" },
  { id: 1487320, title: "The Giant Falls", year: 2026, genre: "Drama", poster: "/lARMzlnHtusEnY8LrTmNID92CJo.jpg" },
  { id: 9837, title: "The Prince of Egypt", year: 1998, genre: "Adventure · Animation", poster: "/2xUjYwL6Ol7TLJPPKs7sYW5PWLX.jpg" },
  { id: 3049, title: "Ace Ventura: Pet Detective", year: 1994, genre: "Comedy · Mystery", poster: "/pqiRuETmuSybfnVZ7qyeoXhQyN1.jpg" },
  { id: 9342, title: "The Mask of Zorro", year: 1998, genre: "Action · Adventure", poster: "/bdMufwGDDzqu4kTSQwrKc5WR4bu.jpg" },
  { id: 1404404, title: "Crayon Shin-chan the Movie: Super Hot! The Spicy Kasukabe Dancers", year: 2025, genre: "Animation · Adventure", poster: "/6IAvfDmAqsFTFi66Qpf0GwpLiZP.jpg" },
  { id: 515001, title: "Jojo Rabbit", year: 2019, genre: "Comedy · War", poster: "/7GsM4mtM0worCtIVeiQt28HieeN.jpg" },
  { id: 2300, title: "Space Jam", year: 1996, genre: "Family · Animation", poster: "/4RN5El3Pj2W4gpwgiAGLVfSJv2g.jpg" },
  { id: 4233, title: "Scream 2", year: 1997, genre: "Horror · Mystery", poster: "/dORlVasiaDkJXTqt9bdH7nFNs6C.jpg" },
  { id: 227, title: "The Outsiders", year: 1983, genre: "Crime · Drama", poster: "/l9os0HcXY8BOkvUWAx4rvby3j6L.jpg" },
  { id: 45030, title: "Hard Hunted", year: 1992, genre: "Action · Thriller", poster: "/esVXyG6o2tD42XmPKgAhPCfdEUY.jpg" },
  { id: 4032, title: "My Girl", year: 1991, genre: "Comedy · Drama", poster: "/qyJJNHteA7BUwQSey05t7qP4vRV.jpg" },
  { id: 10112, title: "The Aristocats", year: 1970, genre: "Animation · Comedy", poster: "/1BVOSmQUhphMgnTxnXyfQ9tL1Sc.jpg" },
  { id: 1587, title: "What's Eating Gilbert Grape", year: 1993, genre: "Romance · Drama", poster: "/8FxWgsfDNosewo7H65oE4QkOb7g.jpg" },
  { id: 1669, title: "The Hunt for Red October", year: 1990, genre: "Action · Thriller", poster: "/yVl7zidse4KiWtGMqHFtZCx4X3N.jpg" },
  { id: 27098, title: "All Things Fair", year: 1995, genre: "Drama · Romance", poster: "/y1oFNynXrIzlPUe4CXKMR2dpNep.jpg" },
  { id: 568160, title: "Weathering with You", year: 2019, genre: "Animation · Drama", poster: "/qgrk7r1fV4IjuoeiGS5HOhXNdLJ.jpg" },
  { id: 8741, title: "The Thin Red Line", year: 1998, genre: "Drama · History", poster: "/seMydAaoxQP6F0xbE1jOcTmn5Jr.jpg" },
  { id: 359940, title: "Three Billboards Outside Ebbing, Missouri", year: 2017, genre: "Crime · Drama", poster: "/bRYLt8fV82tdVoDppSFTZIcJiLN.jpg" },
  { id: 292238, title: "Horrible High Heels", year: 1996, genre: "Horror", poster: "/3aAjnQIfN10t6vuYHuflQAMbDYm.jpg" },
  { id: 9631, title: "The Negotiator", year: 1998, genre: "Action · Crime", poster: "/dUMHEymATOGbs2K3E4dmNSVBgFQ.jpg" },
  { id: 11667, title: "Street Fighter", year: 1994, genre: "Action · Adventure", poster: "/6yh95dD2Y6uWAlPfWCZZygBM1ec.jpg" },
  { id: 10439, title: "Hocus Pocus", year: 1993, genre: "Fantasy · Comedy", poster: "/by4D4Q9NlUjFSEUA1yrxq6ksXmk.jpg" },
  { id: 97, title: "Tron", year: 1982, genre: "Science Fiction · Action", poster: "/jigY9B6TKz4qlfikZcd18qtzTK4.jpg" },
  { id: 414, title: "Batman Forever", year: 1995, genre: "Action · Crime", poster: "/i0fJS8M5UKoETjjJ0zwUiKaR8tr.jpg" },
  { id: 6950, title: "Outbreak", year: 1995, genre: "Action · Drama", poster: "/4KymNvlWR0XF0sqX2BWRd9Z3yXR.jpg" },
  { id: 2005, title: "Sister Act", year: 1992, genre: "Music · Comedy", poster: "/xZvVSZ0RTxIjblLV87vs7ADM12m.jpg" },
  { id: 293172, title: "La svergognata", year: 1974, genre: "Romance · Comedy", poster: "/7SfuAJik0PcLXlBPaAsE7rpKuSz.jpg" },
  { id: 765, title: "Evil Dead II", year: 1987, genre: "Horror · Comedy", poster: "/4zqCKJVHUolGs6C5AZwAZqLWixW.jpg" },
  { id: 530254, title: "The Witch: Part 1. The Subversion", year: 2018, genre: "Action · Mystery", poster: "/4i2wo2ja5g2PmUxWa1a2eYIboZf.jpg" },
  { id: 2019, title: "Hard Target", year: 1993, genre: "Action · Thriller", poster: "/mXCM7pmUFUGp7QzSmare3RITe6n.jpg" },
  { id: 688, title: "The Bridges of Madison County", year: 1995, genre: "Drama · Romance", poster: "/aCBrhOQjhG397GLkEZ49zReQEKX.jpg" },
  { id: 788, title: "Mrs. Doubtfire", year: 1993, genre: "Comedy · Drama", poster: "/shHrSmXS5140o6sQzgzXxn3KqSm.jpg" },
  { id: 522402, title: "Finch", year: 2021, genre: "Science Fiction · Drama", poster: "/eEJtzD1F05xDipFEDY98CTH5yZn.jpg" },
  { id: 9489, title: "You've Got Mail", year: 1998, genre: "Comedy · Romance", poster: "/e2uVtH6TpMfUl7WeOM70ezkcjsU.jpg" },
  { id: 627, title: "Trainspotting", year: 1996, genre: "Drama · Crime", poster: "/y0HmDV0bZDTtXWHqqYYbT9XoshB.jpg" },
  { id: 8224, title: "8MM", year: 1999, genre: "Thriller · Crime", poster: "/mhr9xRpjOBqlBjgDwtiOx6FsLvV.jpg" },
  { id: 6075, title: "Carlito's Way", year: 1993, genre: "Crime · Drama", poster: "/g6D7mjQtndu768cusGmoEQY9fTB.jpg" },
  { id: 1422562, title: "The Moment", year: 2026, genre: "Music · Comedy", poster: "/dYgCgTqqMnWdsnP2XirdcFB28ch.jpg" },
  { id: 6978, title: "Big Trouble in Little China", year: 1986, genre: "Action · Comedy", poster: "/gI2Qs1yTTj3NcESJyttCkbmJ4k9.jpg" },
  { id: 700, title: "Octopussy", year: 1983, genre: "Adventure · Action", poster: "/yoosZitM9igSk3Sd0sBXIhKlAh1.jpg" },
  { id: 2758, title: "Addams Family Values", year: 1993, genre: "Comedy · Family", poster: "/sdxT2VjVSx9DRicwnuECUdBHeE7.jpg" },
  { id: 707, title: "A View to a Kill", year: 1985, genre: "Adventure · Action", poster: "/arJF829RP9cYvh0NU70dC5TtXSa.jpg" },
  { id: 10995, title: "The Lover", year: 1992, genre: "Drama · Romance", poster: "/lgBGy8QaIFD9jQJWgi837czobEp.jpg" },
  { id: 682, title: "The Man with the Golden Gun", year: 1974, genre: "Adventure · Action", poster: "/xVkbKwGnBVNQ122GN5bCTMyPbWz.jpg" },
  { id: 533514, title: "Violet Evergarden: The Movie", year: 2020, genre: "Animation · Drama", poster: "/bajajkoErDst0JxdFyBkABiF9rW.jpg" },
  { id: 820, title: "JFK", year: 1991, genre: "Drama · Thriller", poster: "/r0VWVTYlqdRCK5ZoOdNnHdqM2gt.jpg" },
  { id: 8393, title: "The Gods Must Be Crazy", year: 1980, genre: "Action · Comedy", poster: "/wntGWN2mpeS3QaUm1PTKAcTM9K7.jpg" },
  { id: 10802, title: "Showgirls", year: 1995, genre: "Drama", poster: "/o4HT3Ap5c99W4FYpdXUtTvxGgPc.jpg" },
  { id: 1285965, title: "Dangerous Animals", year: 2025, genre: "Horror · Thriller", poster: "/9tk3Si960hg4E49eMt81dS7Qe9Z.jpg" },
  { id: 9268, title: "Eraser", year: 1996, genre: "Action · Mystery", poster: "/uu2gBpFElDfxTI6BI9bT4pZ4kvw.jpg" },
  { id: 709, title: "Licence to Kill", year: 1989, genre: "Adventure · Action", poster: "/8nzJve63EXA79HGAyidZwivZrQ2.jpg" },
  { id: 878608, title: "Resurrection", year: 2025, genre: "Science Fiction · Drama", poster: "/n4YEPanrb976XfPKjSsHaIrlSt9.jpg" },
  { id: 10061, title: "Escape from L.A.", year: 1996, genre: "Action · Thriller", poster: "/3L9lL2eUsmLNNfENPwNOc82Hzpw.jpg" },
  { id: 1042834, title: "Eden", year: 2025, genre: "Thriller · Drama", poster: "/jbFEESMVbpJU8IjZBjiWGJdEsxR.jpg" },
  { id: 76203, title: "12 Years a Slave", year: 2013, genre: "Drama · History", poster: "/xdANQijuNrJaw1HA61rDccME4Tm.jpg" },
  { id: 8769, title: "Christine", year: 1983, genre: "Horror", poster: "/mMtUJke2TtIoT6JB9hkvERmsSu8.jpg" },
  { id: 699, title: "For Your Eyes Only", year: 1981, genre: "Adventure · Action", poster: "/xV4Nnr6DjjERlqNikqDQX8LUgua.jpg" },
  { id: 2667, title: "The Blair Witch Project", year: 1999, genre: "Horror · Mystery", poster: "/9050VGrYjYrEjpOvDZVAngLbg1f.jpg" },
  { id: 11932, title: "Bride of Chucky", year: 1998, genre: "Horror · Comedy", poster: "/yaIPNOcC7ZRuwH3maNwP9qzIo5G.jpg" },
  { id: 1825, title: "Over the Top", year: 1987, genre: "Action · Drama", poster: "/a926UPf4EYbHfjdzf012M5YHiQ5.jpg" },
  { id: 1578, title: "Raging Bull", year: 1980, genre: "Drama · History", poster: "/1WV7WlTS8LI1L5NkCgjWT9GSW3O.jpg" },
  { id: 2671, title: "Ring", year: 1998, genre: "Horror · Thriller", poster: "/1YINof6kN5yRdePEbcU5360ejoq.jpg" },
  { id: 64084, title: "Scorned", year: 1993, genre: "Drama · Thriller", poster: "/latrrZjz5kwVz3Am3ajLaCrJ1LW.jpg" },
  { id: 2039, title: "Moonstruck", year: 1987, genre: "Comedy · Drama", poster: "/2mnVWpvsHEHHnfvLn1NXYVvBGl5.jpg" },
  { id: 13223, title: "Gran Torino", year: 2008, genre: "Drama", poster: "/zUybYvxWdAJy5hhYovsXtHSWI1l.jpg" },
  { id: 10386, title: "The Iron Giant", year: 1999, genre: "Animation · Science Fiction", poster: "/ct04FCFLPImNG5thcPLRnVsZlmS.jpg" },
  { id: 1371, title: "Rocky III", year: 1982, genre: "Drama · Action", poster: "/lklrplDDuALhY3k8IDFdRqtpZPk.jpg" },
  { id: 1572, title: "Die Hard: With a Vengeance", year: 1995, genre: "Action · Thriller", poster: "/buqmCdFQEWwEpL3agGgg2GVjN2d.jpg" },
  { id: 64530, title: "Chinese Erotic Ghost Story", year: 1998, genre: "Fantasy", poster: "/m6y5exiIeJz5L8G5nWdaimdBn3d.jpg" },
  { id: 8337, title: "They Live", year: 1988, genre: "Science Fiction · Action", poster: "/ngnybFTuopfbfmmEeX9jjBQQmF6.jpg" },
  { id: 1186532, title: "The Forge", year: 2024, genre: "Drama · Family", poster: "/oranxontIQRmhuyQlkoAwxpeBYz.jpg" },
  { id: 10530, title: "Pocahontas", year: 1995, genre: "Adventure · Animation", poster: "/kZ1ft0QZ4e3zDUPMBftEkwI9ftd.jpg" },
  { id: 10315, title: "Fantastic Mr. Fox", year: 2009, genre: "Adventure · Animation", poster: "/euZyZb6iGreujYKrGyZHRddhUYh.jpg" },
  { id: 13597, title: "Labyrinth", year: 1986, genre: "Adventure · Family", poster: "/hbSdA1DmNA9IlfVoqJkIWYF2oYm.jpg" },
  { id: 1461254, title: "Salmokji: Whispering Water", year: 2026, genre: "Horror", poster: "/bOl0rJ86WWxVYlQlGttHhHuYiPQ.jpg" },
  { id: 10634, title: "Friday", year: 1995, genre: "Comedy · Drama", poster: "/2lReF53F8trkC68piGSfk0JVwWU.jpg" },
  { id: 1213, title: "The Talented Mr. Ripley", year: 1999, genre: "Thriller · Crime", poster: "/6ojHgqtIR41O2qLKa7LFUVj0cZa.jpg" },
  { id: 1151272, title: "Sirāt", year: 2025, genre: "Drama · Thriller", poster: "/bzBtsLi17rK4G6kDvOXfUZfAhca.jpg" },
  { id: 816, title: "Austin Powers: International Man of Mystery", year: 1997, genre: "Comedy · Crime", poster: "/5uD4dxNX8JKFjWKYMHyOsqhi5pN.jpg" },
  { id: 9273, title: "Ace Ventura: When Nature Calls", year: 1995, genre: "Crime · Comedy", poster: "/wcinCf1ov2D6M3P7BBZkzQFOiIb.jpg" },
  { id: 9399, title: "Lionheart", year: 1990, genre: "Action", poster: "/h4hdR6YSe0zRg8JuTpvW9kqXXlN.jpg" },
  { id: 509, title: "Notting Hill", year: 1999, genre: "Romance · Comedy", poster: "/hHRIf2XHeQMbyRb3HUx19SF5Ujw.jpg" },
  { id: 678512, title: "Sound of Freedom", year: 2023, genre: "Action · Drama", poster: "/qA5kPYZA7FkVvqcEfJRoOy4kpHg.jpg" },
  { id: 1116201, title: "Iron Lung", year: 2026, genre: "Horror · Mystery", poster: "/sIwakdbMGS1krtgendTWpxTY9Hw.jpg" },
  { id: 839, title: "Duel", year: 1971, genre: "Action · Thriller", poster: "/w9Vk1Txx14vWvACELFYFlixrsfr.jpg" },
  { id: 1299655, title: "Blue Moon", year: 2025, genre: "Music · History", poster: "/dVU7SNc6dgStTVdtbPLQncWxsyZ.jpg" },
  { id: 18334, title: "Guinea Pig: Devil's Experiment", year: 1985, genre: "Horror", poster: "/gyloAdASwFB0Ksm9Ky9xHLYsgZk.jpg" },
  { id: 532639, title: "Pinocchio", year: 2022, genre: "Fantasy · Adventure", poster: "/zaZhjKrJeWczQ3AotKoQObppEbH.jpg" },
  { id: 1194963, title: "Noise", year: 2025, genre: "Horror · Thriller", poster: "/uU3NXe7QqjJNxVpYPdz8dscFWlj.jpg" },
  { id: 6069, title: "The Witches of Eastwick", year: 1987, genre: "Comedy · Fantasy", poster: "/p5OivnZuXfy5E3BKKFIeSidmwys.jpg" },
  { id: 681, title: "Diamonds Are Forever", year: 1971, genre: "Action · Thriller", poster: "/ooDT0eKrWCxJCsn9JehPkD0QYNj.jpg" },
  { id: 34584, title: "The NeverEnding Story", year: 1984, genre: "Adventure · Fantasy", poster: "/lWJC8om086h01f0CMGR9ombdpnI.jpg" },
  { id: 37094, title: "Falling Down", year: 1993, genre: "Crime · Drama", poster: "/7ujqyF96Zg3rfrsh9M0cEF0Yzqj.jpg" },
  { id: 1103, title: "Escape from New York", year: 1981, genre: "Action · Thriller", poster: "/vH9llaphjAssRGi0k7e75tD40Ce.jpg" },
  { id: 1159206, title: "Father Mother Sister Brother", year: 2025, genre: "Comedy · Drama", poster: "/96O3Ol3f2veMxAxYqsML8rOumB9.jpg" },
  { id: 5689, title: "The Blue Lagoon", year: 1980, genre: "Adventure · Drama", poster: "/k6KsThCeoxxHDbVnlHLdTlf5wsy.jpg" },
  { id: 847, title: "Willow", year: 1988, genre: "Fantasy · Adventure", poster: "/pAIRGMIdN7ZdZhflazdV2ezuJ9f.jpg" },
  { id: 4995, title: "Boogie Nights", year: 1997, genre: "Drama", poster: "/wnE24UPCPQsQnbBOu4zVE2qaDNm.jpg" },
  { id: 96, title: "Beverly Hills Cop II", year: 1987, genre: "Action · Comedy", poster: "/egDakU8O5yUwpUJP9IMAUVtIDll.jpg" },
  { id: 3595, title: "Ransom", year: 1996, genre: "Action · Thriller", poster: "/4nmOA5ZOY2VlHzwSlKY03sF2JUz.jpg" },
  { id: 1090, title: "The Thirteenth Floor", year: 1999, genre: "Thriller · Science Fiction", poster: "/7oaie3ZBc9UuWZLF24crro1pone.jpg" },
  { id: 8913, title: "Pet Sematary", year: 1989, genre: "Horror", poster: "/a1gIACZb04bL8EvLqMpofW2Eqeo.jpg" },
  { id: 1367, title: "Rocky II", year: 1979, genre: "Drama", poster: "/nMaiiu0CzT77U4JZkUYV7KqdAjK.jpg" },
  { id: 37233, title: "The Firm", year: 1993, genre: "Drama · Mystery", poster: "/kFexXCzidkm4LwlgZqxsJsDQB5v.jpg" },
  { id: 9361, title: "The Last of the Mohicans", year: 1992, genre: "Action · History", poster: "/qzJMPWRtZveBkxXOv3ucWhoJuyj.jpg" },
  { id: 2112, title: "Payback", year: 1999, genre: "Action · Drama", poster: "/8Bqlv2kbOyZFqfiPNgzdBscqYPn.jpg" },
  { id: 9349, title: "Universal Soldier", year: 1992, genre: "Thriller · Action", poster: "/fp0mWrHl1SW9PhP8QcsgYPoVYFc.jpg" },
  { id: 531428, title: "Portrait of a Lady on Fire", year: 2019, genre: "Drama · Romance", poster: "/2LquGwEhbg3soxSCs9VNyh5VJd9.jpg" },
  { id: 458220, title: "Palmer", year: 2021, genre: "Drama", poster: "/xSDdRAjxKAGi8fUBLOqSrBhJmF0.jpg" },
  { id: 4824, title: "The Jackal", year: 1997, genre: "Action · Crime", poster: "/oXF26QmDEaRaH9Fbhs3NXtcnryx.jpg" },
  { id: 794, title: "The Omen", year: 1976, genre: "Horror · Thriller", poster: "/mDcjjEu1fMNmsXi4l4D8IftlTix.jpg" },
  { id: 10673, title: "Wall Street", year: 1987, genre: "Crime · Drama", poster: "/2tQYq9ntzn2dEwDIGLBSipYPenv.jpg" },
  { id: 1598, title: "Cape Fear", year: 1991, genre: "Drama · Crime", poster: "/meJZAAuVcjic2ipvbOPz5UlE4P9.jpg" },
  { id: 793, title: "Blue Velvet", year: 1986, genre: "Mystery · Thriller", poster: "/6v1zYh2FKOYVddY5pCQhd4PO9uX.jpg" },
  { id: 9584, title: "Convoy", year: 1978, genre: "Action · Comedy", poster: "/xjowoBInlikSlvfAYDRN9ubaODB.jpg" },
  { id: 9481, title: "The Bone Collector", year: 1999, genre: "Crime · Thriller", poster: "/7atMCqRaDpAOnGsteTRm17zmvN3.jpg" },
  { id: 840, title: "Close Encounters of the Third Kind", year: 1977, genre: "Science Fiction · Drama", poster: "/yaPx3cK9zGFX3SbcKwxWM1QIbUh.jpg" },
  { id: 283566, title: "Evangelion: 3.0+1.0 Thrice Upon a Time", year: 2021, genre: "Animation · Action", poster: "/md5wZRRj8biHrGtyitgBZo7674t.jpg" },
  { id: 762, title: "Monty Python and the Holy Grail", year: 1975, genre: "Adventure · Comedy", poster: "/h3rksLHevpCbHfSoaUXm85nt2CH.jpg" },
  { id: 10068, title: "Nine 1/2 Weeks", year: 1986, genre: "Drama · Romance", poster: "/aE1iunrgO8UHfoXKJcjCy4Ih17n.jpg" },
  { id: 9433, title: "The Edge", year: 1997, genre: "Action · Adventure", poster: "/zplJqfuUyqzW0D4jX3W1afl0d7b.jpg" },
  { id: 21183, title: "Fluke", year: 1995, genre: "Drama · Adventure", poster: "/9cdyiQQK4JwghWVWWB6hEqx4okB.jpg" },
  { id: 812225, title: "Black Clover: Sword of the Wizard King", year: 2023, genre: "Animation · Fantasy", poster: "/9YEGawvjaRgnyW6QVcUhFJPFDco.jpg" },
  { id: 10545, title: "The Hunchback of Notre Dame", year: 1996, genre: "Drama · Animation", poster: "/hImMgT9B27evYSRmfztqdDtX6qi.jpg" },
  { id: 926, title: "Galaxy Quest", year: 1999, genre: "Comedy · Science Fiction", poster: "/fZXSwgZknp81vmciTb86rw0MejV.jpg" },
  { id: 1645, title: "A Time to Kill", year: 1996, genre: "Crime · Drama", poster: "/w8UCke112E9jrhjKcwG32kyhTx5.jpg" },
  { id: 652837, title: "Josee, the Tiger and the Fish", year: 2020, genre: "Animation · Drama", poster: "/z1D8xi9x4uEhyFruo7uEHXUMD4K.jpg" },
  { id: 8068, title: "Desperado", year: 1995, genre: "Thriller · Action", poster: "/e3gwpBeXpvGZsxUya9zNym5QXrw.jpg" },
  { id: 1276704, title: "53 Sundays", year: 2026, genre: "Comedy · Drama", poster: "/olk6MkfHFWEpWmhQn6Mb4jNqspm.jpg" },
  { id: 1215020, title: "American Sweatshop", year: 2025, genre: "Thriller · Mystery", poster: "/38OuhBN7yga2nJSP16VPSOJ2Mwz.jpg" },
  { id: 9326, title: "Romancing the Stone", year: 1984, genre: "Romance · Comedy", poster: "/qaCLbDs6Ace4I1lAbBNWPQAm75h.jpg" },
  { id: 8536, title: "Superman II", year: 1980, genre: "Science Fiction · Action", poster: "/3xk5cno9BHcnwc97XO9k21aI1Zi.jpg" },
  { id: 1788, title: "Footloose", year: 1984, genre: "Drama · Romance", poster: "/9JEDjBCXCx3eKTSkXwispf0UN3O.jpg" },
  { id: 928, title: "Gremlins 2: The New Batch", year: 1990, genre: "Comedy · Horror", poster: "/35F5yD7MljvBE2AC0NHAVCoPGEi.jpg" },
  { id: 4584, title: "Sense and Sensibility", year: 1995, genre: "Drama · Romance", poster: "/cBK2yL3HqhFvIVd7lLtazWlRZPR.jpg" },
  { id: 458376, title: "Neo Chinpira 2: Zoom Goes the Bullet", year: 1991, genre: "Drama", poster: "/rNxItOXexbqwpXBSOGbrH6VHsS0.jpg" },
  { id: 8413, title: "Event Horizon", year: 1997, genre: "Horror · Science Fiction", poster: "/qfluaDXv0cIdLwgQWzNB2piHL2q.jpg" },
  { id: 712, title: "Four Weddings and a Funeral", year: 1994, genre: "Comedy · Drama", poster: "/qa72G2VS0bpxms6yo0tI9vsHm2e.jpg" },
  { id: 12106, title: "The Quick and the Dead", year: 1995, genre: "Western · Action", poster: "/yxKhjWsFTyegjD7vDAg7jSN2uv3.jpg" },
  { id: 842924, title: "The Life of Chuck", year: 2025, genre: "Fantasy · Drama", poster: "/oumprkO9bThExP8NwxBIBnvBu2v.jpg" },
  { id: 2636, title: "The Specialist", year: 1994, genre: "Action · Thriller", poster: "/9CVAjtkSaFs9FyddGfThj11ZuQq.jpg" },
  { id: 11808, title: "U.S. Marshals", year: 1998, genre: "Thriller · Crime", poster: "/5ST0BydDSXtW5AtfDDhTVS13pTt.jpg" },
  { id: 9603, title: "Clueless", year: 1995, genre: "Comedy · Romance", poster: "/8AwVTcgpTnmeOs4TdTWqcFDXEsA.jpg" },
  { id: 10734, title: "Escape from Alcatraz", year: 1979, genre: "Drama · Thriller", poster: "/uORr2GXQnyqgBOg6tVsRCJD2qxc.jpg" },
  { id: 334543, title: "Lion", year: 2016, genre: "Drama", poster: "/iBGRbLvg6kVc7wbS8wDdVHq6otm.jpg" },
  { id: 617, title: "Wild Things", year: 1998, genre: "Mystery · Thriller", poster: "/wrcTDD9T7Ga5c9MW7kaOo2qwIvW.jpg" },
  { id: 614930, title: "Teenage Mutant Ninja Turtles: Mutant Mayhem", year: 2023, genre: "Animation · Comedy", poster: "/gyh0eECE2IqrW8GWl3KoHBfc45j.jpg" },
  { id: 691, title: "The Spy Who Loved Me", year: 1977, genre: "Adventure · Action", poster: "/3ZxHKFxMYvAko680DsRgAZKWcLi.jpg" },
  { id: 10137, title: "Stuart Little", year: 1999, genre: "Family · Fantasy", poster: "/362lcwTJlNyAhitTlp2UraECISR.jpg" },
  { id: 2330, title: "Taxi", year: 1998, genre: "Action · Comedy", poster: "/egBxj3ude84theXc3cLbBHrWOkQ.jpg" },
  { id: 860, title: "WarGames", year: 1983, genre: "Thriller · Science Fiction", poster: "/zZ1rN4LoPxKNfAp67Xl300WxVeD.jpg" },
  { id: 770156, title: "Lucy Shimmers and the Prince of Peace", year: 2020, genre: "Drama · Family", poster: "/yfnJ5qIYx7q33fY4jqv9Pu95RSg.jpg" },
  { id: 454, title: "Romeo + Juliet", year: 1996, genre: "Drama · Romance", poster: "/eLf4jclPijOqfEp6bDAmezRFxk5.jpg" },
  { id: 1652947, title: "Tuklas", year: 2026, genre: "Drama", poster: "/pJiNDWSEguOY8m5x2vbgnl9DPme.jpg" },
  { id: 9604, title: "Red Heat", year: 1988, genre: "Action · Crime", poster: "/AoJTHXmO01EZgT0p1YTsGBEQxLj.jpg" },
  { id: 1646, title: "Freedom Writers", year: 2007, genre: "Crime · Drama", poster: "/81AdeUQT99N0xPg3j6RVh0YGOTk.jpg" },
  { id: 11069, title: "Tremors 2: Aftershocks", year: 1996, genre: "Action · Horror", poster: "/hvBYCgG62Fk8cYIsUtrfP5iw3K8.jpg" },
  { id: 708, title: "The Living Daylights", year: 1987, genre: "Action · Adventure", poster: "/1oRlmWX9hewpn2B44wawBjHd7dx.jpg" },
  { id: 9303, title: "Bound", year: 1996, genre: "Drama · Thriller", poster: "/9qAy6UWVw44dGrsyKrdEMt5qIUM.jpg" },
  { id: 9208, title: "Broken Arrow", year: 1996, genre: "Action · Thriller", poster: "/iBPMwYYJFvdCBkXrwV75peo5Lz2.jpg" },
  { id: 9944, title: "The Pelican Brief", year: 1993, genre: "Thriller · Crime", poster: "/7B1HS0SqfJR1jbeHS6V0ZWdzLXP.jpg" },
  { id: 7305, title: "Alive", year: 1993, genre: "Adventure · Drama", poster: "/uQACcCZqd7WCTRin9xRIW5gr1bd.jpg" },
  { id: 192, title: "The Name of the Rose", year: 1986, genre: "Drama · Thriller", poster: "/d6dlbTBb3N7nXDz7tQslDJs2jgv.jpg" },
  { id: 9350, title: "Cliffhanger", year: 1993, genre: "Action · Adventure", poster: "/b28DOM54OHb1c7Lsk6Nu7Kwuonj.jpg" },
  { id: 70, title: "Million Dollar Baby", year: 2004, genre: "Drama", poster: "/jcfEqKdWF1zeyvECPqp3mkWLct2.jpg" },
  { id: 10731, title: "The Client", year: 1994, genre: "Drama · Thriller", poster: "/oLdkJ4ZjxPtFSUChdjDQvHM9l75.jpg" },
  { id: 9576, title: "Tootsie", year: 1982, genre: "Comedy · Romance", poster: "/ngyCzZwb9y5sMUCig5JQT4Y33Q.jpg" },
  { id: 2119, title: "Days of Thunder", year: 1990, genre: "Adventure · Action", poster: "/8UvcoeMJag8UWGF8sg7eYspzq0Q.jpg" },
  { id: 842675, title: "The Wandering Earth II", year: 2023, genre: "Science Fiction · Action", poster: "/hEA7bpWw5IRKOW2MVjvx46SWevU.jpg" },
  { id: 9595, title: "Hot Shots!", year: 1991, genre: "Action · Comedy", poster: "/koLIB5263emHxewmwgBBK26vjeS.jpg" },
  { id: 1086260, title: "The Astronaut", year: 2025, genre: "Horror · Science Fiction", poster: "/souvvkJHYhztC1UqZ8lEVUiJa3J.jpg" },
  { id: 11645, title: "Ran", year: 1985, genre: "Action · Drama", poster: "/1gKWXRVgesduqHDfR8siXppfELO.jpg" },
  { id: 37797, title: "Whisper of the Heart", year: 1995, genre: "Animation · Drama", poster: "/5FROLD8zpWFs9ja7aYho1uOMJHg.jpg" },
  { id: 54065, title: "Bambola", year: 1996, genre: "Comedy · Drama", poster: "/8o2xRDWl9DTmSTpdLCN0GHl9zqJ.jpg" },
  { id: 36593, title: "Naked Gun 33⅓: The Final Insult", year: 1994, genre: "Comedy · Crime", poster: "/p0AYsdgkudR9P5fNV5AjzbwQt8W.jpg" },
  { id: 12481, title: "The Big Boss", year: 1971, genre: "Action", poster: "/9VFYDWYnAhXAgyqgs94lwNmMBbk.jpg" },
  { id: 79645, title: "The Grissom Gang", year: 1971, genre: "Crime · Drama", poster: "/4gZQqXBEbrUhzNoPP8cUqysdn9c.jpg" },
  { id: 1404684, title: "Juste une illusion", year: 2026, genre: "Comedy · Drama", poster: "/my4QdEBuhYpYLR4M7AkJWJGcxxx.jpg" },
  { id: 1242937, title: "The Dreadful", year: 2026, genre: "Horror", poster: "/nhhJkYau8nQMFgauvOudDjwj9vA.jpg" },
  { id: 9772, title: "Air Force One", year: 1997, genre: "Action · Thriller", poster: "/evO1iENjLpUnbwjnt5XK85jRYob.jpg" },
  { id: 9040, title: "Serpico", year: 1973, genre: "Crime · Drama", poster: "/76rLcn53Fjdh4Dji9EIeJ98aYj1.jpg" },
  { id: 1634, title: "Free Willy", year: 1993, genre: "Family · Adventure", poster: "/9iBgd9gi9ztWiVcYSG6zl8wDFBN.jpg" },
  { id: 12139, title: "Dennis the Menace", year: 1993, genre: "Family · Comedy", poster: "/t642WwGifbQ2fEuKTJRgpPzsgtX.jpg" },
  { id: 15573, title: "The Cowboys", year: 1972, genre: "Western · Adventure", poster: "/srdRiGV9tYFzWd2C4IjPJNtLrmr.jpg" },
  { id: 9319, title: "The Last Boy Scout", year: 1991, genre: "Action · Thriller", poster: "/glPswihcZYoAQ4YM2uJF4UACy8T.jpg" },
  { id: 9587, title: "Little Women", year: 1994, genre: "Drama · Romance", poster: "/1ZzH1XMcKAe5NdrKL5MfcqZHHsZ.jpg" },
  { id: 1160360, title: "If I Had Legs I'd Kick You", year: 2025, genre: "Drama", poster: "/va0TQ9WprMXRqQAzY56vyqY0Yd5.jpg" },
  { id: 1064307, title: "Spermageddon", year: 2024, genre: "Animation · Adventure", poster: "/n7SFxle8CVzMXzfV8GNCXqdg78m.jpg" },
  { id: 59440, title: "Warrior", year: 2011, genre: "Drama · Action", poster: "/iM8n4nZJPR2abpnyZ36FUgHiRjr.jpg" },
  { id: 600354, title: "The Father", year: 2020, genre: "Drama", poster: "/pr3bEQ517uMb5loLvjFQi8uLAsp.jpg" },
  { id: 664767, title: "Mortal Kombat Legends: Scorpion's Revenge", year: 2020, genre: "Animation · Action", poster: "/iBvo3qOPcmhlqAaJcXcQHtx2qLk.jpg" },
  { id: 411088, title: "The Invisible Guest", year: 2017, genre: "Drama · Mystery", poster: "/fptnZJbLzKUHeNlYrAynbyoL5YJ.jpg" },
  { id: 637920, title: "Miracle in Cell No. 7", year: 2019, genre: "Drama", poster: "/bOth4QmNyEkalwahfPCfiXjNh1r.jpg" },
  { id: 11976, title: "Legend", year: 1985, genre: "Adventure · Fantasy", poster: "/6n3PQSYpZRK5YPk2w8JEwED7AZk.jpg" },
  { id: 527641, title: "Five Feet Apart", year: 2019, genre: "Romance · Drama", poster: "/kreTuJBkUjVWePRfhHZuYfhNE1T.jpg" },
  { id: 14684, title: "School Ties", year: 1992, genre: "Drama", poster: "/h9u6VSyEPlF5L69QSzOh1eo4F5q.jpg" },
  { id: 13333, title: "Game of Death", year: 1978, genre: "Drama · Action", poster: "/c6jgLHaQpdIPH1rC94KkjAqgE7O.jpg" },
  { id: 1965, title: "A Perfect Murder", year: 1998, genre: "Crime · Thriller", poster: "/wC0ax12N9GQ8vMXPEs4nES5AAiB.jpg" },
  { id: 1307373, title: "Wasteman", year: 2026, genre: "Crime · Drama", poster: "/lKK9ImwpoTCwDZKgYpjIIJCnlf0.jpg" },
  { id: 1122573, title: "In the Grey", year: 2026, genre: "Action · Thriller", poster: "/5RLfZ3loOcIaZRRM0TIujrQyfpY.jpg" },
  { id: 9529, title: "Candyman", year: 1992, genre: "Drama · Horror", poster: "/jQtgkgDZE7egMq532sOt83DnT83.jpg" },
  { id: 858, title: "Sleepless in Seattle", year: 1993, genre: "Comedy · Drama", poster: "/jAXfku1u1uaLGh4cUmK0ESf1pPu.jpg" },
  { id: 2277, title: "Bicentennial Man", year: 1999, genre: "Science Fiction · Drama", poster: "/wrs23eO0VEWwOQpXoOasMnlW9Y4.jpg" },
  { id: 9946, title: "End of Days", year: 1999, genre: "Action · Horror", poster: "/pY8FbKKl3VD0jRI1iDFrwN6alLa.jpg" },
  { id: 168538, title: "Nana", year: 1983, genre: "Drama · Comedy", poster: "/8KZ9ryjH0DEvqbXQqWiwgPiiTig.jpg" },
  { id: 9671, title: "Crocodile Dundee", year: 1986, genre: "Adventure · Comedy", poster: "/pduPduL1ub5kok3lPYT15ryC9L6.jpg" },
  { id: 2978, title: "Ghostbusters II", year: 1989, genre: "Comedy · Fantasy", poster: "/yObYPMA58DnTMvJooFW7GG6jWAt.jpg" },
  { id: 10398, title: "Double Jeopardy", year: 1999, genre: "Thriller · Crime", poster: "/dPd9QvEeMQpgHO6iLB1LqALTZl.jpg" },
  { id: 1287141, title: "Pillion", year: 2025, genre: "Romance · Drama", poster: "/7Pd6ChSQjSXy4snJiorSdzg2cG3.jpg" },
  { id: 551, title: "The Poseidon Adventure", year: 1972, genre: "Adventure · Drama", poster: "/6RGiA5BfhelU9zoD0b1GAG4GWWf.jpg" },
  { id: 9411, title: "Fallen", year: 1998, genre: "Crime · Drama", poster: "/nEDvTB9cP2oIKY0M1ZdDvuUEJ8d.jpg" },
  { id: 397567, title: "Along with the Gods: The Two Worlds", year: 2017, genre: "Action · Adventure", poster: "/gJSvIsI6oQfFim0PGyuuiCYfqKs.jpg" },
  { id: 550205, title: "Wish Dragon", year: 2021, genre: "Animation · Family", poster: "/lnPf6hzANL6pVQTxUlsNYSuhT5l.jpg" },
  { id: 9331, title: "Clear and Present Danger", year: 1994, genre: "Action · Drama", poster: "/6xTM8FPxrLRYwz6I3fqtwh7xybs.jpg" },
  { id: 1710, title: "Copycat", year: 1995, genre: "Thriller · Crime", poster: "/oMgwJb016znNZcpDR20eXxZoW8A.jpg" },
  { id: 12207, title: "The Legend of Drunken Master", year: 1994, genre: "Action · Comedy", poster: "/xqUBrSBtPYLvCtfqHF5sapU6Div.jpg" },
  { id: 9535, title: "Analyze This", year: 1999, genre: "Comedy · Crime", poster: "/eqa4TEgkx63WRhqyD8eTwmL7bUi.jpg" },
  { id: 11412, title: "The Long Kiss Goodnight", year: 1996, genre: "Crime · Action", poster: "/yREdXX5lMFUKhTvb0ofI7mzUHlR.jpg" },
  { id: 17467, title: "Riki-Oh: The Story of Ricky", year: 1991, genre: "Action · Crime", poster: "/dzG0PAbBDLbJSYuv2SM2Mjxw2MH.jpg" },
  { id: 9317, title: "The Cabbage Soup", year: 1981, genre: "Comedy · Science Fiction", poster: "/eT52CpkNpVrFqamL2WD6iMZuChf.jpg" },
  { id: 9362, title: "Tremors", year: 1990, genre: "Horror · Action", poster: "/cA4ggkZ3r1d5r9hOAUWC8x5ul2i.jpg" },
  { id: 11474, title: "The Warriors", year: 1979, genre: "Action · Thriller", poster: "/d6YZpBq4BhQr1K985J3CuL1cA8J.jpg" },
  { id: 11186, title: "Child's Play 2", year: 1990, genre: "Horror · Thriller", poster: "/2tPQbPQeHEYAGoXFSW61IWNmoce.jpg" },
  { id: 1911, title: "The 13th Warrior", year: 1999, genre: "Adventure · History", poster: "/pj1IQQ7ajwaOrjjTCxyM1L4mSnX.jpg" },
  { id: 105397, title: "Daughter of Darkness 2", year: 1994, genre: "Comedy · Crime", poster: "/xXR6FJNfH77B3KfzMU9HgjXRSMB.jpg" },
  { id: 298094, title: "Hidden Desire", year: 1991, genre: "Romance · Drama", poster: "/1tQM77zgd3XKRnF1JtgH4EFyoHN.jpg" },
  { id: 9594, title: "Double Impact", year: 1991, genre: "Thriller · Action", poster: "/66VzKmFljD5SKAIvdSSCAGz4HwL.jpg" },
  { id: 984, title: "Dirty Harry", year: 1971, genre: "Action · Crime", poster: "/scl2JDHzYoIEs5xyYy5ITCfyY0G.jpg" },
  { id: 1635276, title: "Eat Pray Bark", year: 2026, genre: "Comedy", poster: "/kZ0ntedjG2X6hZ7upzupeUe2g5n.jpg" },
  { id: 2164, title: "Stargate", year: 1994, genre: "Action · Adventure", poster: "/4T6Po0XnZlevmhfPh3ZfEs5butR.jpg" },
  { id: 9618, title: "Tango & Cash", year: 1989, genre: "Action · Thriller", poster: "/jxxxjTu87OSmQYkMFF7MgOEDXRn.jpg" },
  { id: 16113, title: "The Delta Force", year: 1986, genre: "Action · Thriller", poster: "/lW94s7xxkdOzYcueaqGJwcVVvjt.jpg" },
  { id: 112929, title: "School on Fire", year: 1988, genre: "Drama · Crime", poster: "/uTVfcol62NROZw2W2Q7ykbFgPQ.jpg" },
  { id: 544, title: "There's Something About Mary", year: 1998, genre: "Romance · Comedy", poster: "/slJD1Dvnsf15LoeqhERsyzisAdn.jpg" },
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
  // Poster paths are baked into MOVIE_LIST at build time, so we just expand
  // them to full image URLs here — no network calls, no rate limiting.
  // We still consult the cache as a fallback in case a baked path is missing.
  const cache = loadPostersCache();
  for (const m of MOVIES) {
    if (m.poster && !m.poster.startsWith("http")) {
      // baked-in TMDB poster_path like "/abc.jpg"
      m.poster = `${TMDB_IMG}${m.poster}`;
    } else if (!m.poster && cache[m.id]) {
      m.poster = `${TMDB_IMG}${cache[m.id]}`;
    }
  }
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
    // Pull live theme colors so the favicon matches the active theme.
    const c1 = getCssVar("--accent-1") || "#22d3ee";
    const c2 = getCssVar("--accent-2") || "#a78bfa";
    fav.href = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><circle cx='32' cy='32' r='28' fill='url(#g)'/><path d='M22 20 L46 32 L22 44 Z' fill='#0a0a18'/></svg>`
    );
  }
}

function bindSettings() {
  document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((s) => {
    s.addEventListener("click", () => {
      settings.theme = s.dataset.theme as Settings["theme"];
      applyTheme();
      applyCloak(); // refresh favicon so it picks up the new accent colors
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
