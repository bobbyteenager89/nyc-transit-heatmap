# PROGRESS Archive

## 2026-04-06 — Session 7: Analytics, Rankings Flow, Pre-Computation, Cleanup

### Accomplished
- Verified Mapbox Isochrone API 401 resolved — token scope now valid, walk/bike/car contours working
- Added `@vercel/analytics` to root layout for usage tracking
- Built rankings → compare flow: checkbox selection (up to 3) on ranking cards, cyan highlight, "Compare N neighborhoods" button that navigates to `/compare?n=slug1,slug2`
- Pre-computed rankings as static JSON at build time — new `scripts/build-rankings.ts` generates `public/data/rankings.json` (4KB vs 1MB+ client fetch). Rankings page rewritten to fetch static data.
- Fixed critical review finding: build script had divergent constants (WALK_SPEED=3.1, SUBWAY_MAX_WALK_MI=0.75 vs canonical 3.0/1.5) — Astoria was incorrectly dropped from rankings
- Changed "Avg Commute" → "Avg Subway Commute" on compare page for accuracy
- Added error handling to `bus.ts` `loadBusData` with graceful fallback to empty stops
- Ran full review suite (code, security, performance) — 1 critical found and fixed
- 62 tests passing, clean build, 1 commit, deployed to Vercel

### Files Created
| File | Purpose |
|------|---------|
| `scripts/build-rankings.ts` | Build-time neighborhood ranking computation |
| `public/data/rankings.json` | Pre-computed rankings (25 neighborhoods, 4KB) |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added `@vercel/analytics` Analytics component |
| `src/app/rankings/page.tsx` | Rewritten — static JSON fetch, checkbox selection, compare button |
| `src/app/compare/page.tsx` | "Avg Commute" → "Avg Subway Commute" label |
| `src/lib/bus.ts` | Added `res.ok` check with fallback to empty stops |
| `package.json` | Added `@vercel/analytics`, `build:rankings` script, pre-build step |

### Next Steps
- [x] Fix Mapbox token exposure in landing page server-rendered HTML — done S8
- [ ] Investigate street-following heatmap colors (paint road segments by travel time)
- [ ] Server-render rankings page (eliminate client fetch waterfall for static data)
- [ ] Fix find page ResultsSidebar double-mount (desktop + mobile both render)

---

## 2026-04-07 — Session 8: Fix P1 Mapbox token exposure

### Accomplished
- Replaced interpolated `NEXT_PUBLIC_MAPBOX_TOKEN` in landing page SSR HTML with a static `/public/landing-map.png` baked from the Mapbox Static API (1280×820@2x, 1.7MB)
- Verified on production: token string absent from HTML (`html.includes('access_token') === false`), background resolves to `/landing-map.png`
- Build clean, 62 tests passing, zero console errors on live deploy

### Files Modified
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Removed Mapbox Static API URL + token interpolation; now references `/landing-map.png` |
| `public/landing-map.png` | New — pre-rendered dark Mapbox static map for landing background |

### Next Steps
- [x] iMessage viral loop (short URLs + ShareSheet + /p/[slug] recipient page) — done S9
- [ ] Investigate street-following heatmap colors
- [ ] Server-render rankings page
- [ ] Fix find page ResultsSidebar double-mount

---

## 2026-04-07 — Session 9: iMessage Viral Loop (short URLs + ShareSheet + recipient page)

### Accomplished
- Ran CEO product review — scoped a 3-phase plan; user picked "polish + keep surfaces + full iMessage viral loop"
- Wrote implementation plan: `docs/superpowers/plans/2026-04-07-imessage-viral-loop.md` (5 tasks, ~6 files)
- Task 1: `src/lib/share-slug.ts` — stateless binary (base64url) encoder/decoder for ShareParams (lat/lng/t/m/address). Subagent upgraded from JSON encoding (102-char slugs) to binary fixed-point (34-char slugs) to pass the <60-char test. 6 unit tests
- Task 2: `src/app/p/[slug]/page.tsx` + `recipient-cta.tsx` — recipient landing page with `generateMetadata()` for dynamic OG unfurl (title = `[address] — [t] min reach`), CTA navigates to `/explore` with sender params preloaded (via `?compare=[slug]`)
- Task 3: `src/components/share/share-sheet.tsx` — Web Share API (`navigator.share`) → clipboard → mailto fallback chain. AbortError (user cancel) is silent. Bonus unit test file added by implementer
- Task 4: Replaced existing raw "Copy Link" button in `src/app/explore/page.tsx` (lines 433-442) with ShareSheet using `/p/[slug]` short URL. First attempt targeted wrong file (find's results-sidebar) — reverted and redid against explore
- Task 5: Merged to main, deployed, verified end-to-end via Claude in Chrome — tab title renders dynamically, h1 = "Shared Reach", CTA = "Drop your pin →", OG + Twitter meta tags present
- Executed via subagent-driven development (4 implementer subagents, 1 spec reviewer, 1 manual revert/redo). 77 tests passing (up from 71 → 6 new share-slug tests + share-sheet tests)

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/share-slug.ts` | Stateless binary base64url encoder/decoder for share params |
| `src/lib/share-slug.test.ts` | 6 unit tests (round-trip, clamping, filtering, malformed input, truncation) |
| `src/app/p/[slug]/page.tsx` | Recipient landing (server component + `generateMetadata`) |
| `src/app/p/[slug]/recipient-cta.tsx` | Client CTA component with "Drop your pin →" link |
| `src/components/share/share-sheet.tsx` | Reusable share button with Web Share API + fallbacks |
| `src/components/share/share-sheet.test.ts` | Share sheet unit tests |
| `docs/superpowers/plans/2026-04-07-imessage-viral-loop.md` | Implementation plan |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/explore/page.tsx` | Removed orphaned `copyLabel` state + raw clipboard button; wired ShareSheet with short `/p/[slug]` URL |

### Deferred (from CEO review)
- **Phase 2: Landing polish** — animated 3-card previews, hover map reveal
- **Phase 3: Explore delight sprinkles** — reach race play button, subway line color hover, trivia overlays, "worst commute" inverted gradient toggle
- **"You vs. Me" meetup mode** — intersection of two isochrones (would use `?compare=[slug]` param already wired in Task 2)
- **Custom domain** (`isonyc.app` / similar) — 1-way door, separate decision

### Next Steps
- [x] Fix address-autocomplete INP — done S10
- [x] Add mode render filter (Fastest + per-mode views) — done S10
- [x] Fix bike and subway time compute bugs — done S10
- [ ] Phase 2: Landing polish (animated card previews, hover reveals)
- [ ] Phase 3: Explore delight (reach-race play button, line-color hover, trivia)
- [ ] "You vs. Me" meetup mode (intersection of two isochrones, consumes `?compare=[slug]` param)
- [ ] Bike-to-station combo mode (feature gap — would dramatically bloom subway reach)
- [ ] Bus transfers (needs a bus network graph)
- [ ] Investigate street-following heatmap colors (Station Bloom option still interesting as a viz)
- [ ] Server-render rankings page
- [ ] Fix find page ResultsSidebar double-mount

---

## 2026-04-07 — Session 10: INP fix + View-as selector + time compute bugs

### Accomplished
- **INP fix (address autocomplete):** clicking a suggestion was blocking the main thread for ~300ms because the parent's `onSelect` triggered Mapbox layer updates synchronously. First tried `startTransition` (insufficient — Mapbox work isn't React-scheduled), then shipped double `requestAnimationFrame` to fully yield the main thread between the click and the heavy work. Dropdown now closes instantly, compute runs on the next frame.
- **CEO review for visualization:** Andrew asked why the subway map looks like a blob instead of station-centered islands. Initially shipped a fake "Station Islands" toggle that colored hexes by walk-distance-to-nearest-station — honest reviewer self-catch: this was inventing a visualization rather than surfacing real data. Reverted.
- **Real root cause diagnosed:** `cellsToHexGeoJSON` colored every cell by the *fastest mode across active modes*. With bike active, bike won nearly every cell within a few miles of origin, smearing subway's lumpy reach into a smooth halo. The island structure was always in the data, just hidden by the fastest-of-all blend.
- **Real fix — "View as" mode selector:** new `ViewMode = 'fastest' | TransportMode` in `isochrone-map.tsx`. When set to a specific mode, `cellsToHexGeoJSON` colors cells by that mode's time only and hides cells unreachable by that mode. Instant switching (render-only filter, no recompute). Renders a chip row in the explore sidebar: `[Fastest] [Subway] [Bus] [Walk] [Bike] [Ferry]`.
- **Time compute bugs found and fixed:**
  - **Bike had no walk legs.** `bikeMin(from, to)` was door-to-door, pretending the rider teleported to the nearest dock. Rewrote as `computeBikeTime`: `walkToDock + undock + bikeRide(dock→dock) + dock + walkFromDock`. Matches the subway/bus/ferry combo-mode shape. Bike no longer wins every close-in cell.
  - **Subway had no boarding wait.** GTFS Floyd-Warshall matrix is pure ride time — added `SUBWAY_WAIT_MIN = 5` constant and included it in both `grid-worker.ts` AND `scripts/build-rankings.ts` (kept in sync to avoid the constant-divergence trap from S7).
- 71 tests passing throughout, 5 commits, deployed to main incrementally

### Files Modified
| File | Changes |
|------|---------|
| `src/components/shared/address-autocomplete.tsx` | Double rAF yield before firing `onSelect` to unblock INP |
| `src/components/isochrone/isochrone-map.tsx` | New `ViewMode` type + prop; `cellsToHexGeoJSON` branches on single-mode view |
| `src/app/explore/page.tsx` | `viewMode` state + "View as" chip selector UI; wired to IsochroneMap |
| `src/workers/grid-worker.ts` | New `computeBikeTime` with walk legs; `SUBWAY_WAIT_MIN` added to `computeSubwayTime` |
| `src/lib/constants.ts` | New `SUBWAY_WAIT_MIN = 5` constant |
| `scripts/build-rankings.ts` | Mirror `SUBWAY_WAIT_MIN` in ranking compute to prevent divergence |

### Reverted
- Temporary "Station Islands" fake-visualization toggle (commit 2a575b6) and its cell annotation helper. The honest answer was the bug fix above, not a new visualization.

### Next Steps
- [ ] Phase 2: Landing polish (animated card previews, hover reveals)
- [ ] Phase 3: Explore delight (reach-race play button, line-color hover, trivia)
- [x] "You vs. Me" meetup mode (intersection of two isochrones) — done S11
- [ ] Bike-to-station combo mode (feature gap — would bloom subway reach dramatically)
- [ ] Bus transfers (needs a bus network graph)
- [ ] Investigate street-following heatmap colors
- [ ] Server-render rankings page
- [ ] Fix find page ResultsSidebar double-mount

---


## Session 1 — 2026-03-12
- Brainstormed design: two-screen flow (setup survey → results map), brutalist pink/red design
- Wrote design spec and implementation plan (18 tasks across 6 chunks)
- Built core lib: types, constants, travel-time, cost, subway (Floyd-Warshall on GTFS)
- Built GTFS parser: 496 stations, 1111 edges, ~956KB station matrix
- Built CitiBike fetcher, geocoding wrapper, grid computation web worker
- Built setup survey screen: address input, mode toggles, destination list with live estimates
- Built results screen: Mapbox heatmap, sidebar, view switch, monthly footer
- All 19 tests passing
- Deployed to Vercel: https://nyc-transit-heatmap.vercel.app
- GitHub: https://github.com/bobbyteenager89/nyc-transit-heatmap

---

## Session 2 — 2026-03-14: Hex Heatmap Redesign
- Full hex heatmap redesign (15 tasks, 16 commits) via subagent-driven development
- Replaced scattered-dot circle heatmap with H3 hex tile grid (resolution 8, ~460m cells)
- Built 3-page app: landing, Find My Neighborhood, Explore
- Mapbox Geocoding autocomplete, wizard flow (Work/Gym/Social/Extras)
- Hex map with fill layer, water mask, animated reveal
- URL state encoding (base64 JSON), results sidebar with best neighborhood callout
- Added h3-js and nuqs dependencies; deleted 7 legacy files
- 42 tests passing (up from 19)

---

## 2026-03-14 — Session 3: Feature Swarm — Gyms, Drop-Pin, Cost Footer
- 10 NYC gym chains with 60+ real locations (Equinox, Planet Fitness, Blink, etc.)
- Click-to-drop-pin map with reverse geocoding into social + extras steps
- Monthly cost footer: pay-per-ride vs OMNY cap vs unlimited MetroCard vs Citi Bike
- Fixed `/explore` crash (unhandled fetch error in useEffect)
- Built via 4 parallel agents (3 in isolated worktrees)
- 55 tests passing

---

## 2026-03-16 — Session 4: Typography, Social Step, Ferry, Hex Resolution 10
- Removed global heading uppercase — wizard headings mixed-case, CTAs retain explicit uppercase
- Rewrote social step — name-first flow with FrequencyBars
- Ferry mode added — 21 terminals, 7 routes, Floyd-Warshall adjacency, walk+ride+walk routing
- Hex grid upgraded resolution 8 → 10 (~3k → ~150k cells)
- Added spatial grid indexing (O(1) station lookups), station-pair caching, chunked processing with live progress bar
- 4 phases built in parallel via agent swarm

---

## 2026-03-27 — Session 5: Isochrone Explorer — Dark Map, Heatmap Contours, Interactivity
- Replaced Explore page with Isochrone Explorer — dark Mapbox `dark-v11`, smooth heatmap contours
- Built isochrone contour generator (h3-js `cellsToMultiPolygon`, then switched to native heatmap layers)
- Per-mode color coding, water mask layer cuts glow over water
- Time slider (1-60 min, 7 snap points), mode legend, reach stats bar chart
- Shareable URL state (origin lat/lng, time, modes) + Copy Link button
- Animated heatmap reveal (800ms ease-out bloom)
- 63 tests passing, 3-agent swarm for interactivity features

---

## 2026-04-04 — Session 6: Multi-Page Platform — Rankings, Compare, Bus, Tooltip, Mobile
- `/rankings` — 25 NYC neighborhoods scored by subway access, cyan score bars
- `/compare` — side-by-side 2-3 neighborhoods with winner highlighting
- MTA bus as 6th transport mode (200 curated stops, walk+wait+ride, orange color)
- Removed bikeSubway combo mode (simplified to 5 single modes)
- Redesigned hover tooltip as dark glass card with edge clamping
- Mobile responsive bottom sheet (<768px), collapsible panels
- `/api/og` — dynamic 1200×630 OG cards via @vercel/og with Mapbox static map, 24h CDN cache
- Dynamic OpenGraph metadata on `/explore` for social sharing
- Tuned heatmap visuals (opacity 0.55→0.65, hex outlines, vivid ramp, street grid overlay)
- Full review suite + CEO product review + preflight
- 9 commits, 34 files, +1917/-291 lines, 62 tests passing
