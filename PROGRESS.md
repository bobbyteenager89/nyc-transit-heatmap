# NYC Transit Heatmap — Progress

> Older sessions (1–21) archived in `PROGRESS-archive.md`.

---

## Current State (2026-04-18, Session 24)

- Branch: `s24-inp-colored-streets`, PR #1 open vs `main`. Live (prod, S23 code): https://nyc-transit-heatmap.vercel.app. Preview (S24 code, auth-walled): https://nyc-transit-heatmap-e75z1jqlv-bobbyteenager89s-projects.vercel.app.
- Tests: 120/120 passing. Build clean.
- Shipped S24: debounced `idle` → 150ms, rAF-chunked the colored-street sampling (400 features/frame), FEATURE_CAP 8000→3000, bbox+zoom cache so re-idling an unchanged view is a no-op.
- Pending: iPhone INP verification on preview URL. If <200ms → merge PR → prod. If not → approach #2 (worker offload for H3 lookup + segment filter).
- Repo now blocks direct push to main — PR workflow required.

---

## 2026-04-18 — Session 24: INP perf fix — debounce idle + rAF-chunk colored-street sampling

### Accomplished
- **Root cause of INP 824ms identified.** Colored-street sampling ran synchronously on every Mapbox `idle` event: `queryRenderedFeatures` → walk up to 8000 features × every vertex pair × `latLngToCell` + `Map.get` → `setData`. All main-thread, no debounce. A quick pan-then-gesture landed inside the sample window.
- **Fix: approach #1 + #3 from the 3-option review.** Debounced `idle` → 150ms setTimeout so back-to-back pans collapse to one sample. rAF-chunked the outer feature walk (400 features/frame) so the main thread yields to input/gesture events mid-sample. FEATURE_CAP dropped 8000 → 3000. Added bbox+zoom cache so re-idling an unchanged view short-circuits. Cells/mode changes bust the cache via effect re-run.
- **Cleanup** handles both timers — clearTimeout + cancelAnimationFrame on unmount / mode-switch.
- **Preview deployed** via `vercel --yes`. 401-walled for non-authed curl (expected). iPhone test pending.
- **Direct push to main blocked** by repo guardrail — opened PR #1 (`s24-inp-colored-streets` → `main`). Branch also carries unpushed S23 wrap-notes commit (`0041ba4`, PROGRESS.md only) from last session.
- Build clean. 120/120 tests passing.

### Files Modified
| File | Changes |
|------|---------|
| `src/components/isochrone/isochrone-map.tsx` | Debounced idle + rAF-chunk sampling, FEATURE_CAP 8000→3000, bbox cache, timer cleanup |

### Commits
- `b9d10c0` — S24: INP perf — debounce idle + rAF-chunk colored-street sampling
- `0041ba4` — (rolled in from S23 local main) Session 23 wrap notes

### PR
- #1 — https://github.com/bobbyteenager89/nyc-transit-heatmap/pull/1

### Next Steps
- [ ] iPhone INP verification on preview URL — target <200ms on mapbox canvas during pan/zoom
- [ ] If INP improved: merge PR → prod auto-deploys
- [ ] If INP still >200ms: approach #2 — move H3 lookup + segment filter to Web Worker (grid-worker already exists)
- [ ] On initial page load with URL params, `street-colored` source stays empty until first idle — force first sample on map load complete (carried from S23)
- [ ] Revisit whether 50-60 min band (#5a0010 → #2a0000) is too close to dark basemap — reach edge looks fuzzy (carried from S23)

---

## 2026-04-17 — Session 23: Colored streets as default + color ramp tuning

### Accomplished
- **Decision: `colored` ships as default.** After S22 iteration, locked it in as the primary street visualization. Kept the full 4-way toggle (Off / Plain / Glow / Colored) so power users can switch.
- **Hex opacity in colored mode: 0.35 → 0.50 (+ outline 0.15 → 0.20).** At 0.35 the subway stops blended with surrounding hexes — 1-5 min gradient was invisible. 0.50 makes the gradient readable while letting streets stay primary.
- **Widened intra-band hue span in COLOR_RAMP.** Preserved the hard jumps at 10/20/30/40/50 that S19 introduced, but pushed each band's start/end further apart so 1-5 min differences feel perceptible. Band 1 stays pure neon green (`#39ff14`) → chartreuse (`#c8ff00`) — 0-min is unmistakably green.
- **Attempted and reverted: teal-green start (`#00ffa0`).** Initial widening tried `#00ffa0` for the 0-min color to maximize band 1's hue range. Andrew flagged it as a "blue orb" — too cool, read as cyan not green.
- **Attempted and reverted: `iso-near-zero` highlight layer.** Added a thick blurred outline on hexes where time ≤ 3 to make "on-a-stop" pop. Combined with teal start, it created a glowing shell around the pin that looked like a distinct feature. Removed entirely.
- **Diagnosed "green outside range" concern.** Andrew reported green blobs in far Queens / Staten Island looking like reach. Queried rendered features at those points via `queryRenderedFeatures` — the iso layers return empty; the green is base Mapbox dark-style landuse (parks, etc). `iso-fill` correctly filters `time <= 60` (73,758 features total, 53k skipped as out-of-range).
- **Legend synced** to new ramp colors.
- **PROGRESS Next** flagged INP 824ms on mapbox canvas for S24 — colored-street sampling on idle is the likely culprit.

### Files Modified
| File | Changes |
|------|---------|
| `src/components/isochrone/isochrone-map.tsx` | Default streetMode `plain` → `colored`; hex opacity 0.35 → 0.50, outline 0.15 → 0.20; COLOR_RAMP widened per band; `iso-near-zero` layer added then removed |
| `src/components/isochrone/map-legend.tsx` | Band gradients synced to new ramp |
| `PROGRESS.md` | Current State updated, INP note |

### Commits
- `ef5b4f8` — Colored streets now default + wider 0-9 min hue gradient

### Next Steps
- [ ] Mobile QA on real iPhone (carried from S22 — live URL deployed)
- [ ] S24: Investigate INP 824ms on mapbox canvas. Hypothesis: colored-street sampling on idle (queryRenderedFeatures + per-vertex walk, 8k feature cap). Options: debounce idle, throttle sampling, rAF scheduling, reduce cap, or move sampling to worker.
- [ ] On initial page load with URL params, `street-colored` source stays empty until first idle event — consider forcing first sample on map load complete, not just on idle
- [ ] Revisit whether 50-60 min band (#5a0010 → #2a0000) is too close to dark basemap — reach edge can look fuzzy

---

## 2026-04-17 — Session 22: Bus route filter, URL validation, street-mode visualizer

### Accomplished
- **URL validation on /explore:** `?lat=abc&lng=xyz`, out-of-range values, and out-of-NYC-envelope coords silently ignored instead of crashing the grid compute with NaN or placing a pin in the ocean. `?t=` also validated and clamped to [1, 60]. (`parseUrlLatLng` / `parseUrlMinutes` helpers in `src/app/explore/page.tsx`.)
- **Bus route-membership filter:** `computeBusTime` was modeling any stop-pair as a direct bus ride at 8 mph × Manhattan-distance — a Queens stop "connected" straight to a Midtown stop with no shared route. Now enumerates top-4 nearest stops on each side and only accepts pairs that share ≥1 route (`stopsShareRoute` in `src/lib/bus.ts`).
- **GTFS bus route data population:** The S19 gap-fill left 511/733 stops with `routes: []`, which would have made the filter a no-op for 70% of stops. New `scripts/populate-bus-routes.ts` joins GTFS `stop_times → trips → routes` across main + Queens feeds (2.5M stop_time rows processed) and populates every stop. Result: 511 newly populated, 222 already had, 0 still empty.
- **Street-mode visualizer on /explore:** Top-right toggle (localStorage-persisted) with 4 modes: Off, Plain (current 25% white), Glow (55% white + blur), Colored (road vector tiles sampled via `queryRenderedFeatures`, each midpoint looked up in the hex grid via h3 index, painted with COLOR_RAMP + blur halo). Re-sampled on map idle. Verified working live in Chrome.
- **Colored-mode iteration (3 follow-up commits):**
  1. Faded hex fill under Colored (0.65 → 0.12) so streets are primary — too subtle, reach boundary became invisible.
  2. Bumped hex fade back up (0.12 → 0.35) + outline 0.15 so reach is legible under colored streets.
  3. Fixed "Jersey streets showing at reach time" bug — Mapbox road tiles return each road as one long Line/MultiLineString; the old midpoint-only sampling smeared colored rendering into Jersey/deep Brooklyn. Now walk every vertex pair, drop segments where either endpoint is unreachable. Feature cap raised 4k → 8k.
- **Grid bounds: default to all 5 boroughs.** `CORE_NYC_BOUNDS` was Manhattan + inner Brooklyn + inner Queens only. A pin dropped in central Brooklyn clipped Flatlands/Midwood/Bensonhurst/Mill Basin from the initial compute. Set CORE = MAX so the full borough footprint is in the initial grid.
- **Tests:** +28 new assertions across `bus.test.ts`, `ferry.test.ts`, `citibike.test.ts` (new files) and extended `url-state.test.ts` validation coverage. `expand-bounds-if-hit.test.ts` updated to use synthetic inner bounds since CORE now equals MAX.

### Files Modified
| File | Changes |
|------|---------|
| `src/app/explore/page.tsx` | parseUrlLatLng / parseUrlMinutes validators; import MAX_NYC_BOUNDS |
| `src/lib/bus.ts` | stopsShareRoute pure helper |
| `src/workers/grid-worker.ts` | computeBusTime: top-4 candidates + route-share filter |
| `public/data/bus-stops.json` | All 733 stops have routes populated |
| `src/components/isochrone/isochrone-map.tsx` | StreetMode type, 4-way toggle UI, colored-street layers, idle sampling |
| `src/lib/__tests__/url-state.test.ts` | +7 validation cases |

### Files Created
- `scripts/populate-bus-routes.ts` — GTFS join to populate stop routes
- `src/lib/__tests__/bus.test.ts` — stopsShareRoute cases
- `src/lib/__tests__/ferry.test.ts` — buildFerryAdjacency cases
- `src/lib/__tests__/citibike.test.ts` — CitiBikeData cases

### Commits (7, on main)
1. `db7fd1b` Validate ?lat=&lng=&t= on /explore URL restore
2. `df3b55c` Backfill tests for ferry adjacency and citibike dock lookup
3. `ec28b96` Bus route-membership filter: stops must share a route to ride
4. `5d8d2c2` Street-mode visualizer on /explore: off / plain / glow / colored
5. `edc0322` Fade hex fill under Colored street mode
6. `60f3d16` Initial grid covers all 5 boroughs so reach never clips a borough
7. `0fb32fc` Street visualizer: segment-level coloring + bump hex fade

### Next Steps
- [ ] Mobile QA on real iPhone (carried from S21 — use live URL)
- [ ] Decide: keep Colored or kill it and default to Glow
- [ ] Consider: measure initial compute time with the larger CORE grid — if sluggish, add a progressive reveal
- [ ] `buildStationAccess` bus-assist path still uses naive bus model for walk→bus→subway; apply route-check there too if the subway accuracy matters more
- [ ] Verify bus reach visually before/after filter on a Queens-to-Manhattan trip
