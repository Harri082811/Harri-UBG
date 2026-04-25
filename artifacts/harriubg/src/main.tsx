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
  { id: 1226863, title: "The Super Mario Galaxy Movie"                            , year: 2026, genre: "Family · Comedy" },
  { id: 1523145, title: "Your Heart Will Be Broken"                               , year: 2026, genre: "Romance · Drama" },
  { id: 1198994, title: "Send Help"                                               , year: 2026, genre: "Horror · Thriller" },
  { id:  980431, title: "Avatar Aang: The Last Airbender"                         , year: 2026, genre: "Animation · Action" },
  { id:   83533, title: "Avatar: Fire and Ash"                                    , year: 2025, genre: "Science Fiction · Adventure" },
  { id: 1613798, title: "Vengeance"                                               , year: 2026, genre: "Action · Thriller" },
  { id: 1318447, title: "Apex"                                                    , year: 2026, genre: "Thriller · Action" },
  { id:  687163, title: "Project Hail Mary"                                       , year: 2026, genre: "Science Fiction · Adventure" },
  { id:  936075, title: "Michael"                                                 , year: 2026, genre: "Music · Drama" },
  { id: 1470130, title: "The Mortuary Assistant"                                  , year: 2026, genre: "Horror · Mystery" },
  { id: 1290821, title: "Shelter"                                                 , year: 2026, genre: "Action · Crime" },
  { id: 1327819, title: "Hoppers"                                                 , year: 2026, genre: "Animation · Family" },
  { id: 1352874, title: "The Crucifix: Blood of the Exorcist"                     , year: 2025, genre: "Horror" },
  { id: 1297842, title: "GOAT"                                                    , year: 2026, genre: "Animation · Comedy" },
  { id: 1171145, title: "Crime 101"                                               , year: 2026, genre: "Crime · Thriller" },
  { id: 1304313, title: "Lee Cronin's The Mummy"                                  , year: 2026, genre: "Horror · Mystery" },
  { id: 1641319, title: "Sniper: No Nation"                                       , year: 2026, genre: "Action · Thriller" },
  { id:  840464, title: "Greenland 2: Migration"                                  , year: 2026, genre: "Adventure · Thriller" },
  { id: 1311031, title: "Demon Slayer: Kimetsu no Yaiba Infinity Castle"          , year: 2025, genre: "Animation · Action" },
  { id: 1084577, title: "Balls Up"                                                , year: 2026, genre: "Comedy · Action" },
  { id: 1290417, title: "Thrash"                                                  , year: 2026, genre: "Horror · Thriller" },
  { id:  848116, title: "Rocky Aur Rani Kii Prem Kahaani"                         , year: 2023, genre: "Comedy · Drama" },
  { id: 1010755, title: "The Strangers: Chapter 3"                                , year: 2026, genre: "Horror · Thriller" },
  { id:     350, title: "The Devil Wears Prada"                                   , year: 2006, genre: "Drama · Comedy" },
  { id: 1601797, title: "¿Quieres Ser Mi Novia?"                                  , year: 2026, genre: "Comedy · Romance" },
  { id: 1084242, title: "Zootopia 2"                                              , year: 2025, genre: "Animation · Family" },
  { id:  502356, title: "The Super Mario Bros. Movie"                             , year: 2023, genre: "Family · Comedy" },
  { id: 1159559, title: "Scream 7"                                                , year: 2026, genre: "Horror · Mystery" },
  { id: 1480387, title: "undertone"                                               , year: 2026, genre: "Horror · Mystery" },
  { id: 1368166, title: "The Housemaid"                                           , year: 2025, genre: "Mystery · Thriller" },
  { id: 1419406, title: "The Shadow's Edge"                                       , year: 2025, genre: "Action · Crime" },
  { id: 1107166, title: "Psycho Killer"                                           , year: 2026, genre: "Crime · Horror" },
  { id: 1193501, title: "Whistle"                                                 , year: 2026, genre: "Horror · Mystery" },
  { id:  755898, title: "War of the Worlds"                                       , year: 2025, genre: "Science Fiction · Thriller" },
  { id: 1234731, title: "Anaconda"                                                , year: 2025, genre: "Adventure · Comedy" },
  { id: 1265609, title: "War Machine"                                             , year: 2026, genre: "Action · Science Fiction" },
  { id: 1659087, title: "180"                                                     , year: 2026, genre: "Thriller · Crime" },
  { id:  634649, title: "Spider-Man: No Way Home"                                 , year: 2021, genre: "Action · Adventure" },
  { id: 1242898, title: "Predator: Badlands"                                      , year: 2025, genre: "Action · Science Fiction" },
  { id:   10867, title: "Malena"                                                  , year: 2000, genre: "Drama" },
  { id: 1511057, title: "Roommates"                                               , year: 2026, genre: "Comedy" },
  { id: 1418657, title: "The Yeti"                                                , year: 2026, genre: "Horror · Thriller" },
  { id:  440249, title: "After Porn Ends 2"                                       , year: 2017, genre: "Documentary" },
  { id:    7451, title: "xXx"                                                     , year: 2002, genre: "Action · Adventure" },
  { id:  680493, title: "Return to Silent Hill"                                   , year: 2026, genre: "Mystery · Drama" },
  { id:  662707, title: "Starbright"                                              , year: 2026, genre: "Adventure · Action" },
  { id: 1367642, title: "Reminders of Him"                                        , year: 2026, genre: "Romance · Drama" },
  { id:  157336, title: "Interstellar"                                            , year: 2014, genre: "Adventure · Drama" },
  { id: 1084187, title: "Pretty Lethal"                                           , year: 2026, genre: "Music · Thriller" },
  { id: 1115544, title: "Mike & Nick & Nick & Alice"                              , year: 2026, genre: "Comedy · Science Fiction" },
  { id: 1234821, title: "Jurassic World Rebirth"                                  , year: 2025, genre: "Science Fiction · Adventure" },
  { id: 1159831, title: "The Bride!"                                              , year: 2026, genre: "Science Fiction · Horror" },
  { id: 1268127, title: "Humint"                                                  , year: 2026, genre: "Thriller · Action" },
  { id: 1526650, title: "Mudborn"                                                 , year: 2025, genre: "Horror · Thriller" },
  { id:   24428, title: "The Avengers"                                            , year: 2012, genre: "Science Fiction · Action" },
  { id: 1272837, title: "28 Years Later: The Bone Temple"                         , year: 2026, genre: "Horror · Thriller" },
  { id: 1316092, title: "\"Wuthering Heights\""                                   , year: 2026, genre: "Romance · Drama" },
  { id: 1168190, title: "The Wrecking Crew"                                       , year: 2026, genre: "Action · Comedy" },
  { id:  329505, title: "Lola's Secret"                                           , year: 1984, genre: "Drama · Comedy" },
  { id:  252969, title: "Secret Pleasures"                                        , year: 2002, genre: "Drama · Crime" },
  { id:  299536, title: "Avengers: Infinity War"                                  , year: 2018, genre: "Adventure · Action" },
  { id: 1049471, title: "Outcome"                                                 , year: 2026, genre: "Comedy · Drama" },
  { id:     278, title: "The Shawshank Redemption"                                , year: 1994, genre: "Drama · Crime" },
  { id: 1646787, title: "Sundutan"                                                , year: 2026, genre: "Drama" },
  { id: 1658216, title: "Stepdaddy"                                               , year: 2026, genre: "Drama" },
  { id:   28322, title: "Madness"                                                 , year: 1980, genre: "Thriller · Action" },
  { id: 1314481, title: "The Devil Wears Prada 2"                                 , year: 2026, genre: "Drama · Comedy" },
  { id: 1266992, title: "Balinsasayaw"                                            , year: 2024, genre: "Drama" },
  { id: 1266127, title: "Ready or Not 2: Here I Come"                             , year: 2026, genre: "Horror · Comedy" },
  { id: 1110034, title: "Kraken"                                                  , year: 2026, genre: "Horror · Action" },
  { id:  425274, title: "Now You See Me: Now You Don't"                           , year: 2025, genre: "Crime · Thriller" },
  { id:     238, title: "The Godfather"                                           , year: 1972, genre: "Drama · Crime" },
  { id: 1306368, title: "The Rip"                                                 , year: 2026, genre: "Action · Thriller" },
  { id:  803796, title: "KPop Demon Hunters"                                      , year: 2025, genre: "Fantasy · Music" },
  { id:   81774, title: "Exploits of a Young Don Juan"                            , year: 1986, genre: "Comedy · Drama" },
  { id: 1010581, title: "My Fault"                                                , year: 2023, genre: "Drama · Romance" },
  { id:  533535, title: "Deadpool & Wolverine"                                    , year: 2024, genre: "Action · Comedy" },
  { id: 1088434, title: "Hellfire"                                                , year: 2026, genre: "Action · Thriller" },
  { id: 1038392, title: "The Conjuring: Last Rites"                               , year: 2025, genre: "Horror" },
  { id:  875828, title: "Peaky Blinders: The Immortal Man"                        , year: 2026, genre: "Crime · Drama" },
  { id:    1579, title: "Apocalypto"                                              , year: 2006, genre: "Action · Drama" },
  { id:  441168, title: "From Straight A's to XXX"                                , year: 2017, genre: "Drama · TV Movie" },
  { id: 1246049, title: "Dracula"                                                 , year: 2025, genre: "Horror · Fantasy" },
  { id:  879945, title: "The Unknown Man"                                         , year: 2021, genre: "Drama" },
  { id:  299534, title: "Avengers: Endgame"                                       , year: 2019, genre: "Adventure · Science Fiction" },
  { id: 1236153, title: "Mercy"                                                   , year: 2026, genre: "Science Fiction · Action" },
  { id: 1610418, title: "The House on Haunted Grounds"                            , year: 2026, genre: "Horror" },
  { id: 1539104, title: "JUJUTSU KAISEN: Execution"                               , year: 2025, genre: "Animation · Action" },
  { id:  400155, title: "Hotel Transylvania 3: Summer Vacation"                   , year: 2018, genre: "Animation · Comedy" },
  { id:  744275, title: "After We Fell"                                           , year: 2021, genre: "Drama · Romance" },
  { id:   73353, title: "Man in the Mirror: The Michael Jackson Story"            , year: 2004, genre: "Drama · TV Movie" },
  { id:  858024, title: "Hamnet"                                                  , year: 2025, genre: "Drama · Romance" },
  { id:  911430, title: "F1"                                                      , year: 2025, genre: "Action · Drama" },
  { id:  181808, title: "Star Wars: The Last Jedi"                                , year: 2017, genre: "Adventure · Action" },
  { id: 1011985, title: "Kung Fu Panda 4"                                         , year: 2024, genre: "Action · Adventure" },
  { id: 1572073, title: "The Deadly Little Mermaid"                               , year: 2026, genre: "Horror" },
  { id: 1119449, title: "Good Luck, Have Fun, Don't Die"                          , year: 2026, genre: "Science Fiction · Action" },
  { id: 1424965, title: "Ice Skater"                                              , year: 2026, genre: "Drama · Thriller" },
  { id: 1472951, title: "Infiltrate"                                              , year: 2026, genre: "Action · Thriller" },
  { id:  496243, title: "Parasite"                                                , year: 2019, genre: "Comedy · Thriller" },
  { id:   50619, title: "The Twilight Saga: Breaking Dawn - Part 1"               , year: 2011, genre: "Adventure · Fantasy" },
  { id: 1325734, title: "The Drama"                                               , year: 2026, genre: "Romance · Comedy" },
  { id: 1669050, title: "Tayuan 2"                                                , year: 2026, genre: "Drama" },
  { id:     120, title: "The Lord of the Rings: The Fellowship of the Ring"       , year: 2001, genre: "Adventure · Fantasy" },
  { id:   20222, title: "Sex with Love"                                           , year: 2003, genre: "Comedy · Romance" },
  { id:     155, title: "The Dark Knight"                                         , year: 2008, genre: "Action · Crime" },
  { id:     597, title: "Titanic"                                                 , year: 1997, genre: "Drama · Romance" },
  { id:  226674, title: "The Adolescent"                                          , year: 1979, genre: "Drama" },
  { id:   27205, title: "Inception"                                               , year: 2010, genre: "Action · Science Fiction" },
  { id:   19995, title: "Avatar"                                                  , year: 2009, genre: "Science Fiction · Action" },
  { id:  361743, title: "Top Gun: Maverick"                                       , year: 2022, genre: "Action · Drama" },
  { id:  214756, title: "Ted 2"                                                   , year: 2015, genre: "Comedy · Fantasy" },
  { id:     680, title: "Pulp Fiction"                                            , year: 1994, genre: "Thriller · Crime" },
  { id:  950387, title: "A Minecraft Movie"                                       , year: 2025, genre: "Family · Fantasy" },
  { id:     122, title: "The Lord of the Rings: The Return of the King"           , year: 2003, genre: "Adventure · Fantasy" },
  { id:     603, title: "The Matrix"                                              , year: 1999, genre: "Action · Science Fiction" },
  { id: 1061474, title: "Superman"                                                , year: 2025, genre: "Science Fiction · Adventure" },
  { id:  967998, title: "Fatal Conspiracy"                                        , year: 2022, genre: "Horror" },
  { id:   76600, title: "Avatar: The Way of Water"                                , year: 2022, genre: "Action · Adventure" },
  { id:     129, title: "Spirited Away"                                           , year: 2001, genre: "Animation · Family" },
  { id:  950396, title: "The Gorge"                                               , year: 2025, genre: "Romance · Science Fiction" },
  { id:  232078, title: "Triple Crossed"                                          , year: 2013, genre: "Mystery" },
  { id: 1383731, title: "Protector"                                               , year: 2026, genre: "Action · Thriller" },
  { id:   14836, title: "Coraline"                                                , year: 2009, genre: "Animation · Family" },
  { id: 1339876, title: "Mardaani 3"                                              , year: 2026, genre: "Action · Crime" },
  { id: 1387382, title: "Hunting Season"                                          , year: 2025, genre: "Action · Drama" },
  { id:  999136, title: "Do Not Enter"                                            , year: 2026, genre: "Horror" },
  { id: 1087192, title: "How to Train Your Dragon"                                , year: 2025, genre: "Fantasy · Family" },
  { id:   58008, title: "Night Nurse"                                             , year: 1979, genre: "Comedy" },
  { id: 1233413, title: "Sinners"                                                 , year: 2025, genre: "Horror · Action" },
  { id:     550, title: "Fight Club"                                              , year: 1999, genre: "Drama · Thriller" },
  { id: 1207162, title: "Rise of the Conqueror"                                   , year: 2026, genre: "History · Action" },
  { id:     671, title: "Harry Potter and the Philosopher's Stone"                , year: 2001, genre: "Adventure · Fantasy" },
  { id:   10138, title: "Iron Man 2"                                              , year: 2010, genre: "Adventure · Action" },
  { id:  969681, title: "Spider-Man: Brand New Day"                               , year: 2026, genre: "Science Fiction · Action" },
  { id:  402431, title: "Wicked"                                                  , year: 2024, genre: "Drama · Romance" },
  { id: 1218925, title: "Chainsaw Man - The Movie: Reze Arc"                      , year: 2025, genre: "Animation · Action" },
  { id:     348, title: "Alien"                                                   , year: 1979, genre: "Horror · Science Fiction" },
  { id:  569094, title: "Spider-Man: Across the Spider-Verse"                     , year: 2023, genre: "Animation · Action" },
  { id:     240, title: "The Godfather Part II"                                   , year: 1974, genre: "Drama · Crime" },
  { id:  872585, title: "Oppenheimer"                                             , year: 2023, genre: "Drama · History" },
  { id:      38, title: "Eternal Sunshine of the Spotless Mind"                   , year: 2004, genre: "Science Fiction · Drama" },
  { id:  991494, title: "The SpongeBob Movie: Search for SquarePants"             , year: 2025, genre: "Adventure · Animation" },
  { id:  912649, title: "Venom: The Last Dance"                                   , year: 2024, genre: "Science Fiction · Action" },
  { id: 1223601, title: "Sisu: Road to Revenge"                                   , year: 2025, genre: "Action · War" },
  { id:      13, title: "Forrest Gump"                                            , year: 1994, genre: "Comedy · Drama" },
  { id: 1408208, title: "Exit 8"                                                  , year: 2025, genre: "Horror · Mystery" },
  { id:     807, title: "Se7en"                                                   , year: 1995, genre: "Crime · Mystery" },
  { id: 1582770, title: "Dhurandhar: The Revenge"                                 , year: 2026, genre: "Action · Crime" },
  { id: 1620996, title: "The Blue Box"                                            , year: 2026, genre: "Romance · Thriller" },
  { id:     564, title: "The Mummy"                                               , year: 1999, genre: "Adventure · Action" },
  { id:     497, title: "The Green Mile"                                          , year: 1999, genre: "Fantasy · Drama" },
  { id: 1241982, title: "Moana 2"                                                 , year: 2024, genre: "Animation · Adventure" },
  { id: 1022789, title: "Inside Out 2"                                            , year: 2024, genre: "Animation · Adventure" },
  { id:     808, title: "Shrek"                                                   , year: 2001, genre: "Animation · Comedy" },
  { id: 1241470, title: "Osiris"                                                  , year: 2025, genre: "Science Fiction · Action" },
  { id: 1174024, title: "Maybe More"                                              , year: 2024, genre: "Comedy · Drama" },
  { id:  106646, title: "The Wolf of Wall Street"                                 , year: 2013, genre: "Crime · Drama" },
  { id:  315635, title: "Spider-Man: Homecoming"                                  , year: 2017, genre: "Action · Adventure" },
  { id: 1228246, title: "Five Nights at Freddy's 2"                               , year: 2025, genre: "Horror · Thriller" },
  { id:  798645, title: "The Running Man"                                         , year: 2025, genre: "Action · Thriller" },
  { id: 1400940, title: "Clayface"                                                , year: 2026, genre: "Horror · Thriller" },
  { id: 1117857, title: "In Your Dreams"                                          , year: 2025, genre: "Animation · Family" },
  { id:    7131, title: "Van Helsing"                                             , year: 2004, genre: "Horror · Adventure" },
  { id: 1184918, title: "The Wild Robot"                                          , year: 2024, genre: "Family · Animation" },
  { id: 1054867, title: "One Battle After Another"                                , year: 2025, genre: "Thriller · Crime" },
  { id:  346698, title: "Barbie"                                                  , year: 2023, genre: "Comedy · Adventure" },
  { id:  980477, title: "Ne Zha 2"                                                , year: 2025, genre: "Animation · Fantasy" },
  { id: 1167307, title: "David"                                                   , year: 2025, genre: "Animation · Family" },
  { id:     557, title: "Spider-Man"                                              , year: 2002, genre: "Action · Science Fiction" },
  { id:  372058, title: "Your Name."                                              , year: 2016, genre: "Animation · Romance" },
  { id:  438631, title: "Dune"                                                    , year: 2021, genre: "Science Fiction · Adventure" },
  { id:  524047, title: "Greenland"                                               , year: 2020, genre: "Thriller · Adventure" },
  { id: 1108427, title: "Moana"                                                   , year: 2026, genre: "Family · Fantasy" },
  { id: 1315303, title: "Primate"                                                 , year: 2026, genre: "Horror · Thriller" },
  { id:  418579, title: "Young Sister-In-Law"                                     , year: 2016, genre: "Romance" },
  { id:     424, title: "Schindler's List"                                        , year: 1993, genre: "Drama · History" },
  { id:    1726, title: "Iron Man"                                                , year: 2008, genre: "Action · Science Fiction" },
  { id:  567609, title: "Ready or Not"                                            , year: 2019, genre: "Horror · Comedy" },
  { id:      11, title: "Star Wars"                                               , year: 1977, genre: "Adventure · Action" },
  { id: 1213898, title: "Border 2"                                                , year: 2026, genre: "Action · Drama" },
  { id:  467905, title: "How to Make a Killing"                                   , year: 2026, genre: "Comedy · Thriller" },
  { id: 1156594, title: "Our Fault"                                               , year: 2025, genre: "Romance · Drama" },
  { id:  324857, title: "Spider-Man: Into the Spider-Verse"                       , year: 2018, genre: "Animation · Action" },
  { id:   10474, title: "The Basketball Diaries"                                  , year: 1995, genre: "Drama · Crime" },
  { id: 1192548, title: "Hannah Waddingham: Home for Christmas"                   , year: 2023, genre: "Music" },
  { id:  519182, title: "Despicable Me 4"                                         , year: 2024, genre: "Action · Animation" },
  { id:  617126, title: "The Fantastic 4: First Steps"                            , year: 2025, genre: "Science Fiction · Adventure" },
  { id:  269149, title: "Zootopia"                                                , year: 2016, genre: "Animation · Adventure" },
  { id:  192904, title: "Doraemon: Nobita in the Wan-Nyan Spacetime Odyssey"      , year: 2004, genre: "Animation · Adventure" },
  { id:  677638, title: "We Bare Bears: The Movie"                                , year: 2020, genre: "Animation · Adventure" },
  { id:  429617, title: "Spider-Man: Far From Home"                               , year: 2019, genre: "Action · Adventure" },
  { id:  244786, title: "Whiplash"                                                , year: 2014, genre: "Drama · Music" },
  { id:     769, title: "GoodFellas"                                              , year: 1990, genre: "Drama · Crime" },
  { id: 1233506, title: "The Shrinking Man"                                       , year: 2025, genre: "Adventure · Science Fiction" },
  { id: 1062722, title: "Frankenstein"                                            , year: 2025, genre: "Drama · Fantasy" },
  { id:  866398, title: "The Beekeeper"                                           , year: 2024, genre: "Action · Crime" },
  { id:  216015, title: "Fifty Shades of Grey"                                    , year: 2015, genre: "Drama · Romance" },
  { id:     121, title: "The Lord of the Rings: The Two Towers"                   , year: 2002, genre: "Adventure · Fantasy" },
  { id:     615, title: "The Passion of the Christ"                               , year: 2004, genre: "Drama" },
  { id:  693134, title: "Dune: Part Two"                                          , year: 2024, genre: "Science Fiction · Adventure" },
  { id:    4935, title: "Howl's Moving Castle"                                    , year: 2004, genre: "Fantasy · Animation" },
  { id:     105, title: "Back to the Future"                                      , year: 1985, genre: "Adventure · Comedy" },
  { id:    8587, title: "The Lion King"                                           , year: 1994, genre: "Animation · Family" },
  { id:     280, title: "Terminator 2: Judgment Day"                              , year: 1991, genre: "Action · Thriller" },
  { id:     111, title: "Scarface"                                                , year: 1983, genre: "Action · Crime" },
  { id:  324786, title: "Hacksaw Ridge"                                           , year: 2016, genre: "Drama · History" },
  { id:     101, title: "Léon: The Professional"                                  , year: 1994, genre: "Crime · Drama" },
  { id:  354912, title: "Coco"                                                    , year: 2017, genre: "Family · Animation" },
  { id:   37165, title: "The Truman Show"                                         , year: 1998, genre: "Comedy · Drama" },
  { id:      98, title: "Gladiator"                                               , year: 2000, genre: "Action · Drama" },
  { id:     670, title: "Oldboy"                                                  , year: 2003, genre: "Drama · Thriller" },
  { id:  315162, title: "Puss in Boots: The Last Wish"                            , year: 2022, genre: "Animation · Adventure" },
  { id:   10681, title: "WALL·E"                                                  , year: 2008, genre: "Animation · Family" },
  { id:   16869, title: "Inglourious Basterds"                                    , year: 2009, genre: "Drama · Thriller" },
  { id:   77338, title: "The Intouchables"                                        , year: 2011, genre: "Drama · Comedy" },
  { id:  475557, title: "Joker"                                                   , year: 2019, genre: "Crime · Thriller" },
  { id:   11324, title: "Shutter Island"                                          , year: 2010, genre: "Drama · Thriller" },
  { id:     207, title: "Dead Poets Society"                                      , year: 1989, genre: "Drama" },
  { id:  823219, title: "Flow"                                                    , year: 2024, genre: "Animation · Adventure" },
  { id:     103, title: "Taxi Driver"                                             , year: 1976, genre: "Crime · Drama" },
  { id:  290098, title: "The Handmaiden"                                          , year: 2016, genre: "Thriller · Drama" },
  { id:     128, title: "Princess Mononoke"                                       , year: 1997, genre: "Adventure · Fantasy" },
  { id:     311, title: "Once Upon a Time in America"                             , year: 1984, genre: "Drama · Crime" },
  { id:      28, title: "Apocalypse Now"                                          , year: 1979, genre: "Drama · War" },
  { id:     694, title: "The Shining"                                             , year: 1980, genre: "Horror · Thriller" },
  { id: 1181678, title: "¿Quieres ser mi hijo?"                                   , year: 2023, genre: "Comedy · Romance" },
  { id:     857, title: "Saving Private Ryan"                                     , year: 1998, genre: "War · Drama" },
  { id:   68718, title: "Django Unchained"                                        , year: 2012, genre: "Drama · Western" },
  { id:     510, title: "One Flew Over the Cuckoo's Nest"                         , year: 1975, genre: "Drama" },
  { id:    1124, title: "The Prestige"                                            , year: 2006, genre: "Drama · Mystery" },
  { id:     423, title: "The Pianist"                                             , year: 2002, genre: "Drama · War" },
  { id:  378064, title: "A Silent Voice: The Movie"                               , year: 2016, genre: "Animation · Drama" },
  { id:     637, title: "Life Is Beautiful"                                       , year: 1997, genre: "Comedy · Drama" },
  { id:  490132, title: "Green Book"                                              , year: 2018, genre: "Drama · Comedy" },
  { id:     629, title: "The Usual Suspects"                                      , year: 1995, genre: "Drama · Crime" },
  { id:     489, title: "Good Will Hunting"                                       , year: 1997, genre: "Drama" },
  { id:   19404, title: "Dilwale Dulhania Le Jayenge"                             , year: 1995, genre: "Comedy · Drama" },
  { id:    1422, title: "The Departed"                                            , year: 2006, genre: "Drama · Thriller" },
  { id:     500, title: "Reservoir Dogs"                                          , year: 1992, genre: "Crime · Thriller" },
  { id:  791373, title: "Zack Snyder's Justice League"                            , year: 2021, genre: "Action · Adventure" },
  { id:      73, title: "American History X"                                      , year: 1998, genre: "Drama" },
  { id:     598, title: "City of God"                                             , year: 2002, genre: "Drama · Crime" },
  { id:      77, title: "Memento"                                                 , year: 2000, genre: "Mystery · Thriller" },
  { id:  508442, title: "Soul"                                                    , year: 2020, genre: "Animation · Family" },
  { id:  810693, title: "Jujutsu Kaisen 0"                                        , year: 2021, genre: "Animation · Action" },
  { id:  146233, title: "Prisoners"                                               , year: 2013, genre: "Drama · Thriller" },
  { id:    1891, title: "The Empire Strikes Back"                                 , year: 1980, genre: "Adventure · Action" },
  { id:     185, title: "A Clockwork Orange"                                      , year: 1971, genre: "Science Fiction · Crime" },
  { id:   10494, title: "Perfect Blue"                                            , year: 1998, genre: "Animation · Thriller" },
  { id:  398818, title: "Call Me by Your Name"                                    , year: 2017, genre: "Romance · Drama" },
  { id:     600, title: "Full Metal Jacket"                                       , year: 1987, genre: "Drama · War" },
  { id:   11216, title: "Cinema Paradiso"                                         , year: 1988, genre: "Drama · Romance" },
  { id:  635302, title: "Demon Slayer -Kimetsu no Yaiba- The Movie: Mugen Train"  , year: 2020, genre: "Animation · Action" },
  { id:  851644, title: "20th Century Girl"                                       , year: 2022, genre: "Romance · Drama" },
  { id:   50014, title: "The Help"                                                , year: 2011, genre: "Drama" },
  { id:   18491, title: "Neon Genesis Evangelion: The End of Evangelion"          , year: 1997, genre: "Animation · Science Fiction" },
  { id:     843, title: "In the Mood for Love"                                    , year: 2000, genre: "Drama · Romance" },
  { id: 1356039, title: "Counterattack"                                           , year: 2025, genre: "Action · Adventure" },
  { id:  255709, title: "Hope"                                                    , year: 2013, genre: "Drama" },
  { id:  406997, title: "Wonder"                                                  , year: 2017, genre: "Family · Drama" },
  { id:  620249, title: "The Legend of Hei"                                       , year: 2019, genre: "Animation · Fantasy" },
  { id:   25237, title: "Come and See"                                            , year: 1985, genre: "Drama · War" },
  { id:    9702, title: "Bound by Honor"                                          , year: 1993, genre: "Crime · Drama" },
  { id:  820067, title: "The Quintessential Quintuplets Movie"                    , year: 2022, genre: "Animation · Comedy" },
  { id:  533514, title: "Violet Evergarden: The Movie"                            , year: 2020, genre: "Animation · Drama" },
  { id: 1186532, title: "The Forge"                                               , year: 2024, genre: "Drama · Family" },
  { id:  531428, title: "Portrait of a Lady on Fire"                              , year: 2019, genre: "Drama · Romance" },
  { id:  458220, title: "Palmer"                                                  , year: 2021, genre: "Drama" },
  { id:  283566, title: "Evangelion: 3.0+1.0 Thrice Upon a Time"                  , year: 2021, genre: "Animation · Action" },
  { id:  812225, title: "Black Clover: Sword of the Wizard King"                  , year: 2023, genre: "Animation · Fantasy" },
  { id:  652837, title: "Josee, the Tiger and the Fish"                           , year: 2020, genre: "Animation · Drama" },
  { id:  770156, title: "Lucy Shimmers and the Prince of Peace"                   , year: 2020, genre: "Drama · Family" },
  { id:  600354, title: "The Father"                                              , year: 2020, genre: "Drama" },
  { id:  664767, title: "Mortal Kombat Legends: Scorpion's Revenge"               , year: 2020, genre: "Animation · Action" },
  { id:  637920, title: "Miracle in Cell No. 7"                                   , year: 2019, genre: "Drama" },
  { id:  527641, title: "Five Feet Apart"                                         , year: 2019, genre: "Romance · Drama" },
  { id:   15804, title: "A Brighter Summer Day"                                   , year: 1991, genre: "Crime · Drama" },
  { id: 1139087, title: "Once Upon a Studio"                                      , year: 2023, genre: "Animation · Family" },
  { id:  995133, title: "The Boy, the Mole, the Fox and the Horse"                , year: 2022, genre: "Animation · Family" },
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
