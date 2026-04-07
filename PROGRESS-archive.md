# PROGRESS Archive

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
