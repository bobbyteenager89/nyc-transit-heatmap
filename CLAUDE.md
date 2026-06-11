# NYC Transit Heatmap

## Tech Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- `next/font/google` — Inter Tight (`--font-ui`) + JetBrains Mono (`--font-data`) loaded via next/font, CSS vars in `@theme inline`
- Mapbox GL JS for map rendering
- Web Worker for grid computation
- MTA GTFS data (pre-parsed at build time)
- Citi Bike GBFS (fetched at runtime)
- `@vercel/analytics` + `@vercel/speed-insights` for usage + Core Web Vitals tracking
- `web-vitals` (dev-only) — local INP/LCP/CLS console logger via `src/components/dev/vitals-logger.tsx`

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm test` — run vitest tests
- `npm run build:subway` — rebuild subway graph from GTFS data

## Structure
- `src/app/page.tsx` — `/` IS the Isochrone Explorer (server component: `generateMetadata` + renders `<ExploreContent />`)
- `src/components/explore/explore-content.tsx` — main client component (1064 lines): drop-a-pin → 6-mode reach heatmap, address autocomplete, time slider, modes, sidebar
- `src/app/explore/page.tsx` — `permanentRedirect` to `/` preserving query params (kept for OG share-link compatibility)
- `src/app/api/og/route.tsx` — Dynamic OG image generation (edge, @vercel/og)
- `src/app/apple-icon.tsx` — Dynamic 180×180 apple-touch-icon (ImageResponse, brand-matched)
- `src/app/robots.ts` + `src/app/sitemap.ts` — Next.js file-convention SEO (allow-all + single canonical route `/`)
- `src/components/shared/address-autocomplete.tsx` — Mapbox geocoding autocomplete
- `src/components/shared/drop-pin-map.tsx` — click-to-drop-pin map for location selection
- `src/components/share/share-sheet.tsx` — share link generation + clipboard copy
- `src/lib/gym-chains.ts` — gym chain database (10 chains, 60+ NYC locations)
- `src/lib/cost.ts` — transit cost comparison (pay-per-ride, OMNY, unlimited, Citi Bike)
- `src/lib/hex.ts` — H3 hex grid generation + GeoJSON conversion
- `src/lib/ferry.ts` — ferry terminal data loader + Floyd-Warshall adjacency
- `src/lib/isochrone.ts` — time band grouping, mode colors, isochrone layer generation
- `src/components/isochrone/` — isochrone-map (dark Mapbox heatmap), time-slider, mode-legend, reach-stats
- `src/lib/bus.ts` — bus stop data loader
- `src/lib/` — core logic (travel time, cost, subway, citibike, geocode, ferry, bus)
- `src/lib/grid.ts` — `computeHexGrid()` (kicks off worker) + `warmGridWorker()` (pre-loads LOAD_DATA on mount for INP)
- `src/workers/grid-worker.ts` — web worker with spatial indexing, station-pair cache, chunked processing
- `scripts/build-subway-graph.ts` — GTFS → station graph build script
- `public/data/` — pre-built subway + bus + ferry data (committed)

## Explore Modes (ModeTabs)
- **Reach** (default): drop-a-pin → multimodal isochrone heatmap, shareable URLs
- **Live**: add destinations w/ frequency → composite score heatmap (best neighborhood to live)
- **Meet**: two origins → fairness-weighted overlap → shareable meetup link (recipient page at `/p/[slug]`)
- **Multi-location**: destinations with `locations[]` use closest location per grid point
- **Bus**: walk to stop → wait (7 min avg) → ride (8 mph avg) → walk from stop. 733 stops across Manhattan, Brooklyn, Queens
- **Ferry**: walk to terminal → ride (adjacency graph, 7 routes, 21 terminals) → walk out
- **Resolution 10**: ~150k hex cells with spatial grid indexing for O(1) station lookups
- **Modes**: 7 transport modes — subway, bus, walk, car, bike (Citi Bike), ownbike, ferry

## Design
- Dark glass theme: surface (#11131a), cards (#161922), accent cyan (#22d3ee)
- **Explore page (Isochrone NYC design system):** Inter Tight 700 for wordmark, JetBrains Mono for all labels/data, hairline borders `rgba(255,255,255,0.06)`, sidebar 360px
  - ModeTabs: underline style, no pill container
  - ModeLegend: 2-col grid, 8×8 colored square dots, `color-mix()` tint when active, no SVG icons
  - TimeSlider: custom Pointer Events drag (not `<input type="range">`), 32px mono readout, 12-stop gradient track
  - ReachStats: 3-col grid `70px 1fr 56px`, 4px colored bars
- Mode colors: subway (#118ab2), bus (#f97316), walk (#ffbe0b), bike (#06d6a0), car (#9b5de5), ferry (#00b4d8)
- Time ramp: green (#39ff14) → yellow → orange → red → purple (#4a0a4a) over 12 stops

## Environment
- Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`
- GTFS data in `data/gtfs/` (gitignored, run `scripts/download-gtfs.sh` to fetch)

## Gotchas

### Web Worker Race: requestIdleCallback Warmup Overwrites Compute Handler
**S37 regression, fixed:** `warmGridWorker()` deferred via `requestIdleCallback` to avoid INP on mount. On share-link loads, `computeHexGrid()` fired first; the idle callback then overwrote `worker.onmessage`, swallowing the `data_loaded` ack. COMPUTE was never dispatched, promise hung 60s until watchdog killed the worker. **Fix:** Check `if (pendingReject)` in warmup (meaning a compute owns the handler), return early. Also check if warmup's LOAD_DATA is already in flight via `loadInFlightSignature`. See `.claude/compound-docs/2026-06-11-worker-onmessage-race-condition.md`.

### Worker Timer Throttling: setTimeout(0) Stalls in Background & Headless
Grid-worker chunks via `setTimeout(processChunk, 0)`. Browsers throttle timers in hidden pages to 1/sec (battery saving), causing computes to stall visible in backgrounded tabs. Headless Chrome (`--headless=new`) is treated as hidden. **Fix:** Use `MessageChannel` port messages instead—they're exempt from timer throttling and work at full speed even in headless. See `.claude/compound-docs/2026-06-11-worker-timer-throttling.md`.

### Silent Promise Rejection: No Error State = Blank Map, No Feedback
When compute hangs/times out, promise rejected but hook only `console.error()`'d. No `computeError` state, so UI showed blank map + working sidebar with zero indication of failure. User sees no error, refreshes, loops. **Fix:** Add `computeError: string | null` state, set it in catch block (exclude "cancelled" noise), clear on new compute, render a banner. See `.claude/compound-docs/2026-06-11-silent-promise-rejection.md`.

### Census CenPop2020_Mean_BG.txt: Block-Group Population, No API Key
URL: `https://www2.census.gov/geo/docs/reference/cenpop2020/blkgrp/CenPop2020_Mean_BG.txt`
Tab-delimited: STATEFP, COUNTYFP, TRACTCE, BLKGRPCE, POPULATION, LATITUDE, LONGITUDE. Filter to NY state (STATEFP="36"), bin `(LATITUDE, LONGITUDE)` to an h3 cell with `latLngToCell`, sum POPULATION per cell. No Census API key needed. Used in `scripts/build-pride-data.ts` to generate `public/data/pride-population.json` at res-9. 8.8M total pop, 3,918 res-9 cells in NYC metro.

### innerText vs textContent: text-transform CSS Hides Search Keywords
`innerText` respects CSS, so `text-transform: uppercase` on "Your Reach" means `innerText` returns "YOUR REACH". Search/grep for the visible text, not the DOM text. Affects Puppeteer + fuzzy-find tools.

Global learnings: ~/.claude/projects/-Users-andrew/memory/learnings/ (grep Module:/Tags: before implementing in a known area)
