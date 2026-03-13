# NYC Transit Heatmap

## Tech Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- Mapbox GL JS for map rendering
- Web Worker for grid computation
- MTA GTFS data (pre-parsed at build time)
- Citi Bike GBFS (fetched at runtime)

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm test` — run vitest tests
- `npm run build:subway` — rebuild subway graph from GTFS data

## Structure
- `src/app/page.tsx` — single-screen app (address → heatmap → build score)
- `src/app/results/page.tsx` — redirects to `/` (legacy)
- `src/components/results/sidebar.tsx` — sidebar with origin, modes, "Build My Score" panel
- `src/components/results/map-view.tsx` — Mapbox heatmap with click-to-drop-pin
- `src/lib/` — core logic (travel time, cost, subway, citibike, geocode)
- `src/workers/grid-worker.ts` — web worker for grid computation (supports multi-location destinations)
- `scripts/build-subway-graph.ts` — GTFS → station graph build script
- `public/data/` — pre-built subway data (committed)

## Heatmap Modes
- **No destinations**: accessibility heatmap (travel time from origin to each grid point)
- **With destinations**: score heatmap showing total monthly transit hours (green=low, red=high)
- **Multi-location**: destinations with `locations[]` use closest location per grid point

## Design
- Brutalist pink (#fcdde8) / red (#e21822) two-color system
- Arial Black italic uppercase for display text
- 3px solid borders, no border-radius
- Spec: `docs/superpowers/specs/2026-03-12-nyc-transit-heatmap-design.md`

## Environment
- Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`
- GTFS data in `data/gtfs/` (gitignored, run `scripts/download-gtfs.sh` to fetch)
