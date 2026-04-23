# NYC Transit Heatmap

## Tech Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Mapbox GL JS for map rendering
- Web Worker for grid computation
- MTA GTFS data (pre-parsed at build time)
- Citi Bike GBFS (fetched at runtime)
- `@vercel/analytics` + `@vercel/speed-insights` for usage + Core Web Vitals tracking
- `web-vitals` (dev-only) — local INP/LCP/CLS console logger via `src/components/dev/vitals-logger.tsx`

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build (runs build:rankings first)
- `npm run build:rankings` — regenerate public/data/rankings.json from station data
- `npm test` — run vitest tests
- `npm run build:subway` — rebuild subway graph from GTFS data

## Structure
- `src/app/page.tsx` — landing page with 3 cards (Explore, Find, Rankings)
- `src/app/explore/page.tsx` — Isochrone Explorer (address → accessibility heatmap, 6 modes)
- `src/app/find/page.tsx` — Find My Neighborhood (wizard → results with hex heatmap)
- `src/app/rankings/page.tsx` — Neighborhood rankings (25 hoods scored by subway access)
- `src/app/compare/page.tsx` — Side-by-side comparison (2-3 neighborhoods, shareable URL)
- `src/app/api/og/route.tsx` — Dynamic OG image generation (edge, @vercel/og)
- `src/app/apple-icon.tsx` — Dynamic 180×180 apple-touch-icon (ImageResponse, brand-matched)
- `src/app/robots.ts` + `src/app/sitemap.ts` — Next.js file-convention SEO (allow-all + 5-route sitemap)
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
- `src/lib/bus.ts` — bus stop data loader
- `src/lib/` — core logic (travel time, cost, subway, citibike, geocode, ferry, bus)
- `src/workers/grid-worker.ts` — web worker with spatial indexing, station-pair cache, chunked processing
- `scripts/build-subway-graph.ts` — GTFS → station graph build script
- `scripts/build-rankings.ts` — pre-compute neighborhood rankings at build time
- `public/data/` — pre-built subway data + rankings.json (committed)

## Heatmap Modes
- **Isochrone NYC** (`/explore`): dark map with Mapbox native heatmap layers per transport mode, time slider 1-60 min, shareable URLs
- **Find My Neighborhood** (`/find`): score heatmap showing total monthly transit hours (green=low, red=high)
- **Multi-location**: destinations with `locations[]` use closest location per grid point
- **Bus**: walk to stop → wait (7 min avg) → ride (8 mph avg) → walk from stop. 733 stops across Manhattan, Brooklyn, Queens
- **Ferry**: walk to terminal → ride (adjacency graph, 7 routes, 21 terminals) → walk out
- **Resolution 10**: ~150k hex cells with spatial grid indexing for O(1) station lookups
- **Modes**: 7 transport modes — subway, bus, walk, car, bike (Citi Bike), ownbike, ferry

## Design
- Dark glass theme: surface (#12131a), cards (#1a1b24), accent cyan (#22d3ee)
- Landing page: dark with map background. Find page: pink/red brutalist (legacy)
- Explore page: dark glass sidebar with rounded card sections, dark Mapbox map
- Arial Black italic uppercase for headings, Helvetica Neue for body
- Mode colors: subway (#118ab2), bus (#f97316), walk (#ffbe0b), bike (#06d6a0), car (#9b5de5), ferry (#00b4d8)
- Hex fill gradient: green (0 min) → yellow (15 min) → orange (30 min) → red (60 min)

## Environment
- Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`
- GTFS data in `data/gtfs/` (gitignored, run `scripts/download-gtfs.sh` to fetch)
