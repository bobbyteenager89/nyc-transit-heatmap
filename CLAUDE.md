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
- `src/app/page.tsx` — landing page with Find/Explore choice
- `src/app/find/page.tsx` — Find My Neighborhood (wizard → results with hex heatmap)
- `src/app/explore/page.tsx` — Explore the Map (address → accessibility heatmap)
- `src/components/results/hex-map.tsx` — Mapbox hex map with H3 fill layer, water mask, animated reveal
- `src/components/results/results-sidebar.tsx` — results panel with destinations, modes, sharing
- `src/components/wizard/wizard-shell.tsx` — 4-step wizard (Work → Gym → Social → Extras)
- `src/components/shared/address-autocomplete.tsx` — Mapbox geocoding autocomplete
- `src/components/shared/drop-pin-map.tsx` — click-to-drop-pin map for location selection
- `src/lib/gym-chains.ts` — gym chain database (10 chains, 60+ NYC locations)
- `src/lib/cost.ts` — transit cost comparison (pay-per-ride, OMNY, unlimited, Citi Bike)
- `src/components/results/monthly-footer.tsx` — cost comparison cards in results view
- `src/lib/hex.ts` — H3 hex grid generation + GeoJSON conversion
- `src/lib/ferry.ts` — ferry terminal data loader + Floyd-Warshall adjacency
- `src/lib/isochrone.ts` — time band grouping, mode colors, isochrone layer generation
- `src/components/isochrone/` — isochrone-map (dark Mapbox heatmap), time-slider, mode-legend, reach-stats
- `src/lib/` — core logic (travel time, cost, subway, citibike, geocode, ferry)
- `src/workers/grid-worker.ts` — web worker with spatial indexing, station-pair cache, chunked processing
- `scripts/build-subway-graph.ts` — GTFS → station graph build script
- `public/data/` — pre-built subway data (committed)

## Heatmap Modes
- **Isochrone Explorer** (`/explore`): dark map with Mapbox native heatmap layers per transport mode, time slider 1-60 min, shareable URLs
- **Find My Neighborhood** (`/find`): score heatmap showing total monthly transit hours (green=low, red=high)
- **Multi-location**: destinations with `locations[]` use closest location per grid point
- **Ferry**: walk to terminal → ride (adjacency graph, 7 routes, 21 terminals) → walk out
- **Resolution 10**: ~150k hex cells with spatial grid indexing for O(1) station lookups

## Design
- Brutalist pink (#fcdde8) / red (#e21822) two-color system
- Arial Black italic uppercase for display text
- 3px solid borders, no border-radius
- Spec: `docs/superpowers/specs/2026-03-12-nyc-transit-heatmap-design.md`

## Environment
- Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`
- GTFS data in `data/gtfs/` (gitignored, run `scripts/download-gtfs.sh` to fetch)
