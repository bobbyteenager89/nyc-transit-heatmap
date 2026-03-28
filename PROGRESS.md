# NYC Transit Heatmap — Progress

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
- **Pending:** Mapbox token needs to be set in Vercel env vars

---

## Session 2 — 2026-03-14: Hex Heatmap Redesign

### Accomplished
- Executed full hex heatmap redesign plan (15 tasks, 16 commits) via subagent-driven development
- Replaced scattered-dot circle heatmap with H3 hex tile grid (resolution 8, ~460m cells)
- Built 3-page app: landing (`/`), Find My Neighborhood (`/find`), Explore the Map (`/explore`)
- Created address autocomplete with Mapbox Geocoding v5 API (debounced, NYC bbox filter)
- Built wizard flow: Work → Gym → Social → Extras steps with address autocomplete
- Created hex map component with fill layer, water mask, animated reveal (500ms ease-out)
- Updated web worker for hex grid with per-destination breakdown and 30s timeout
- Added URL state encoding/decoding (base64 JSON, v=1 versioning) for shareable results
- Built results sidebar with best neighborhood callout, surprise insight, share button
- Added h3-js and nuqs dependencies
- Deleted 7 legacy files (map-view, address-input, results page, view-switch, sidebar, destination-card, destination-list)
- 42 tests passing (up from 19), clean build, clean TypeScript
- Merged to main via fast-forward, pushed to Vercel

### Files Created
| File | Purpose |
|------|---------|
| `src/app/explore/page.tsx` | Explore mode — origin address → accessibility heatmap |
| `src/app/find/page.tsx` | Find mode — wizard → score heatmap with results sidebar |
| `src/components/landing/mode-card.tsx` | Landing page choice card |
| `src/components/results/hex-map.tsx` | Mapbox hex map with H3 fill layer |
| `src/components/results/results-sidebar.tsx` | Results panel with destinations, modes, sharing |
| `src/components/results/best-neighborhood.tsx` | Best cell callout badge |
| `src/components/results/surprise-insight.tsx` | Counterintuitive finding display |
| `src/components/results/share-button.tsx` | Native share / clipboard copy |
| `src/components/shared/address-autocomplete.tsx` | Mapbox geocoding autocomplete |
| `src/components/wizard/wizard-shell.tsx` | 4-step wizard container |
| `src/components/wizard/step-work.tsx` | Work destination step |
| `src/components/wizard/step-gym.tsx` | Gym destination step |
| `src/components/wizard/step-social.tsx` | Social destinations step |
| `src/components/wizard/step-extras.tsx` | Extra destinations step |
| `src/lib/hex.ts` | H3 hex grid generation + GeoJSON conversion |
| `src/lib/url-state.ts` | Shareable URL encode/decode |
| `src/lib/__tests__/hex.test.ts` | 3 hex grid tests |
| `src/lib/__tests__/url-state.test.ts` | 4 URL state tests |

### Files Deleted
- `src/app/results/page.tsx`, `src/components/results/map-view.tsx`, `src/components/results/sidebar.tsx`
- `src/components/results/view-switch.tsx`, `src/components/setup/address-input.tsx`
- `src/components/setup/destination-card.tsx`, `src/components/setup/destination-list.tsx`

### Next Steps
- [x] Verify Vercel deployment works with Mapbox token
- [x] Browser smoke test all 3 routes (landing, find, explore)
- [x] Add multi-location gym support (closest per grid point)
- [x] Add click-to-drop-pin for friends without exact addresses
- [x] Monthly cost footer with real transit cost calculations

---

## 2026-03-14 — Session 3: Feature Swarm — Gyms, Drop-Pin, Cost Footer

### Accomplished
- Verified Vercel deployment live at https://nyc-transit-heatmap.vercel.app (Mapbox token set)
- Browser smoke tested all 3 routes — found and fixed `/explore` crash (unhandled fetch error in useEffect)
- Added multi-location gym chain support: 10 NYC chains (Equinox, Planet Fitness, Blink, Crunch, NYSC, YMCA, Chelsea Piers, Life Time, Orangetheory, [solidcore]) with 60+ real locations
- Added click-to-drop-pin for friends: Mapbox map with click-to-place pin, reverse geocoding to neighborhood name, integrated into social + extras wizard steps
- Added monthly cost footer: pay-per-ride ($2.90) vs OMNY cap ($34/wk) vs unlimited MetroCard ($132/mo) vs Citi Bike ($17.99/mo), with cheapest option highlighted
- All features built via agent swarm (4 parallel agents, 3 in isolated worktrees)
- 55 tests passing across 7 test files (up from 42), 17 files changed

### Files Modified/Created
| File | Changes |
|------|---------|
| `src/lib/gym-chains.ts` | NEW — 10 gym chain database with lat/lng locations, search helpers |
| `src/components/wizard/step-gym.tsx` | Chain/address mode toggle, chain search + auto-populate |
| `src/components/shared/drop-pin-map.tsx` | NEW — Mapbox click-to-pin with reverse geocoding |
| `src/lib/geocode.ts` | Added `reverseGeocodeNeighborhood()` |
| `src/components/wizard/step-social.tsx` | Address/pin mode toggle tabs |
| `src/components/wizard/step-extras.tsx` | Pin drop support for extras |
| `src/lib/cost.ts` | Added `computeCostComparison()` with NYC transit rates |
| `src/lib/constants.ts` | Added OMNY cap + Citi Bike day pass constants |
| `src/components/results/monthly-footer.tsx` | Cost comparison cards with "Best" badge |
| `src/components/results/results-sidebar.tsx` | Integrated monthly footer with destinations/modes |
| `src/app/explore/page.tsx` | Fixed crash — wrapped data loading in try/catch |
| `src/app/find/page.tsx` | Removed old totalCost computation |
| `src/lib/__tests__/gym-chains.test.ts` | NEW — 13 gym chain tests |
| `src/lib/__tests__/geocode.test.ts` | NEW — 5 reverse geocode tests |
| `src/lib/__tests__/cost.test.ts` | Added 13 cost comparison tests |

### Next Steps
- [ ] Push to deploy and verify all features on live site
- [ ] Add walking directions integration for short-distance destinations
- [ ] Neighborhood rankings page (top 10 neighborhoods for a given lifestyle)
- [ ] Save/load destination profiles (localStorage or URL state)

---

## 2026-03-16 — Session 4: Typography, Social Step, Ferry, Hex Resolution 10

### Accomplished
- Removed global `text-transform: uppercase` from h1/h2/h3 — wizard headings now mixed-case, CTAs/labels/legend retain explicit uppercase
- Rewrote social step (step-social.tsx) — name-first flow, FrequencyBars per friend (default 1x/week), follows step-extras pattern
- Added ferry as transport mode — 21 terminals across 7 NYC Ferry routes, Floyd-Warshall shortest paths, walk-to-terminal + ride + walk routing
- Added mode toggle clarification note: "The map shows the fastest of your selected modes for each hex"
- Upgraded hex grid from resolution 8 (~3,000 cells) to resolution 10 (~150,000 cells)
- Added spatial grid indexing (O(1) station lookups), station-pair caching, chunked processing with live progress bar
- All 4 phases built in parallel via agent swarm (4 isolated worktrees), merged cleanly
- Build passes clean (0 TypeScript errors)

### Files Modified
| File | Changes |
|------|---------|
| `src/app/globals.css` | Removed `text-transform: uppercase` from heading rule |
| `src/components/wizard/step-social.tsx` | Rewritten — name first, FrequencyBars, pending entry pattern |
| `src/components/wizard/step-work.tsx` | Removed explicit uppercase from heading |
| `src/components/wizard/step-gym.tsx` | Removed explicit uppercase from heading |
| `src/components/wizard/step-extras.tsx` | Removed explicit uppercase from heading |
| `src/components/setup/mode-toggles.tsx` | Added ferry chip + clarification note |
| `src/lib/types.ts` | Added `"ferry"` to TransportMode union |
| `src/lib/constants.ts` | H3_RESOLUTION 8→10, added FERRY_SPEED_MPH |
| `src/lib/ferry.ts` | NEW — ferry data types, loader, adjacency builder |
| `public/data/ferry-terminals.json` | NEW — 21 terminals, 7 routes, inter-terminal times |
| `src/workers/grid-worker.ts` | Spatial grid index, station-pair cache, chunked processing, ferry routing |
| `src/lib/grid.ts` | Progress callback, ferry data passthrough, 60s timeout |
| `src/lib/hex.ts` | Cached generateHexCenters(), ferry in color mapping |
| `src/app/find/page.tsx` | Ferry data loading, progress state/display |
| `src/app/explore/page.tsx` | Ferry data loading, progress state/display |
| `src/components/results/hex-map.tsx` | Ferry in tooltip display |
| `src/lib/__tests__/hex.test.ts` | Added ferry:null to test data |

### Next Steps
- [x] Push to deploy and verify all features on live site
- [ ] Browser test: ferry times appear in tooltip, progress bar works, hex detail is block-level
- [ ] Performance benchmark: verify <3s compute at resolution 10
- [ ] Neighborhood rankings page (top 10 neighborhoods for a given lifestyle)
- [x] Save/load destination profiles (localStorage or URL state)

---

## 2026-03-27 — Session 5: Isochrone Explorer — Dark Map, Heatmap Contours, Interactivity

### Accomplished
- Replaced Explore page with Isochrone Explorer — dark Mapbox map (`dark-v11`) with smooth heatmap contours
- Built isochrone contour generator (`isochrone.ts`) with h3-js `cellsToMultiPolygon` for polygon dissolve, then switched to Mapbox native heatmap layers for smooth organic glow (no hex edges)
- Added per-mode color coding: subway (blue), walk (amber), car (purple), bike (green), ferry (cyan), bike+sub (teal-green)
- Added water mask layer on top of heatmaps — cleanly cuts off glow over water areas
- Built time slider component (1-60 min, 7 snap points) — contours grow/shrink as you drag
- Built mode legend component — color-coded toggle buttons, all modes on by default, click to hide
- Added reach stats bar chart — sidebar shows reachable area per mode, updates live with slider
- Added shareable URL state — origin lat/lng, time, modes encoded in URL query string + Copy Link button
- Added animated heatmap reveal — 800ms ease-out bloom on new compute, slider changes stay instant
- Updated landing page card: "Isochrone Explorer" with new description
- All 63 tests passing, clean build, 8 commits, deployed to Vercel
- All work done via subagent-driven development (3-agent swarm for interactivity features)

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/isochrone.ts` | Time band grouping, mode colors, isochrone layer generation |
| `src/lib/__tests__/isochrone.test.ts` | 8 tests for grouping, layer generation, band contiguity |
| `src/components/isochrone/isochrone-map.tsx` | Dark Mapbox map with heatmap layers, water mask, tooltips |
| `src/components/isochrone/time-slider.tsx` | Draggable range slider with snap points |
| `src/components/isochrone/mode-legend.tsx` | Color-coded mode toggle grid |
| `src/components/isochrone/reach-stats.tsx` | Bar chart showing reachable area per mode |
| `docs/superpowers/plans/2026-03-27-isochrone-explore-upgrade.md` | Implementation plan |

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/types.ts` | Added IsochroneBand, IsochroneLayer types |
| `src/app/explore/page.tsx` | Full rewrite — isochrone map, slider, legend, URL state, reach stats |
| `src/app/page.tsx` | Updated Explore card to "Isochrone Explorer" with new copy |

### Next Steps
- [ ] Tune heatmap intensity/radius if glow is too strong or too faint on live site
- [ ] Neighborhood rankings page (top 10 neighborhoods for a given lifestyle)
- [ ] Mobile responsive layout for sidebar + map
- [ ] Shareable isochrone screenshot cards for social sharing
