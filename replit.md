# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **harriubg** (`artifacts/harriubg`) — vanilla HTML/CSS/JS unblocked games and movies hub
  served at `/`. Single-page app with Home / Games / Movies / Settings tabs and an
  always-on constellation background.
  - **Games (~685)**: manifest from `harriwalk0/assets/zones.json`. Game HTML loaded from
    `raw.githubusercontent.com/gn-math/html` (single-file games, all 685 entries) and
    wrapped in a `text/html` Blob URL for cloaking. A small `MULTI_FILE_IDS` set prefers
    the richer multi-file builds in `harriwalk0/assets/<id>/index.html` for ~38 games
    (Unity / Flash titles). Covers from `raw.githubusercontent.com/gn-math/covers`.
  - **Movies (36)**: curated TMDB IDs. Posters fetched from TMDB v3 API at boot
    (key in `main.tsx`) and cached in `localStorage` under `harriubg.posters.v1`.
    Streaming via cineby-style provider switcher (vidsrc.cc, vidsrc.xyz, embed.su,
    vidlink.pro, 2embed.cc), each wrapped in a Blob URL.
  - **Movie catalog**: 1500 titles baked into `MOVIE_LIST` with their TMDB
    `poster_path` included, so posters render instantly with no runtime API calls
    (avoids TMDB rate limits). The `loadPosters` helper just expands paths to
    full image URLs at boot.
  - **Settings**: theme (cosmic / aurora / sunset / midnight), tab cloak (title + icon),
    open-in-about:blank, autoplay toggle, default streaming server. Constellation
    customization removed — always on at sensible defaults.
  - All cards use `<img onerror>` to fall back to a deterministic gradient placeholder
    so missing covers/posters never look broken.
  - **Vercel deployment**: `vercel.json` at repo root limits Vercel to building only
    `@workspace/harriubg` (`pnpm --filter @workspace/harriubg run build`) with output at
    `artifacts/harriubg/dist/public`. The harriubg `vite.config.ts` falls back to default
    PORT/BASE_PATH when those env vars are absent (build-time only — Replit dev still
    uses them).
