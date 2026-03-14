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
- [ ] Verify Vercel deployment works with Mapbox token
- [ ] Browser smoke test all 3 routes (landing, find, explore)
- [ ] Add multi-location gym support (closest per grid point)
- [ ] Add click-to-drop-pin for friends without exact addresses
- [ ] Monthly cost footer with real transit cost calculations
