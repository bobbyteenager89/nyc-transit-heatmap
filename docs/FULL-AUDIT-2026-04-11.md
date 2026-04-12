# Full Project Audit — 2026-04-11

> Audit-only. No fixes applied. Each section documents findings for prioritized follow-up.

---

## 1. Review Suite — Code, Security, Performance

### Code Review

**Verdict: Needs Fixes (3 Critical)**

#### Critical

| # | Issue | File:Line | Impact |
|---|-------|-----------|--------|
| C1 | `computeSubwayTime` omits 5-min subway wait time | `src/lib/subway.ts:72` | Compare page shows travel times ~5 min too low vs explore/rankings |
| C2 | `build-rankings.ts` uses wrong longitude constant (54.6 vs 52.3) | `scripts/build-rankings.ts:62` | Rankings computed with ~4.4% longitude distance error; rank ordering affected |
| C3 | `MonthlyFooter` assigns `modes[0]` to all destinations | `src/components/results/monthly-footer.tsx:18` | Monthly cost estimates wrong — walks costed as subway rides |

#### Important

| # | Issue | File | Impact |
|---|-------|------|--------|
| I1 | `ferry.ts` missing `res.ok` check | `src/lib/ferry.ts:27` | Cryptic crash on ferry API error (bus.ts handles this correctly) |
| I2 | `build-rankings.ts` duplicates constants from `src/lib/` | `scripts/build-rankings.ts:24-58` | Root cause of C2 — constants diverge silently |
| I3 | `HexMap` recreates Mapbox instance on center change | `src/components/results/hex-map.tsx:193` | Flash/flicker on results load; extra Mapbox style load |
| I4 | `gridBounds` never resets on new origin | `src/hooks/use-dynamic-grid-compute.ts:122` | After expansion, all future computes use enlarged bounds (~2x cells) |
| I5 | No error boundaries on any route | All `src/app/*/page.tsx` | Unhandled exceptions = blank white screen, zero recovery |
| I6 | `bikeTime` in `travel-time.ts` is dead code | `src/lib/travel-time.ts:24-26` | Only used by tests; production uses worker's `computeBikeTime` |
| I7 | Duplicated transit data loading in Find page | `src/app/find/page.tsx:68-95` | Same pattern as `useTransitData` hook but duplicated |

#### Minor

| # | Issue | File |
|---|-------|------|
| M1 | `ownbike` missing from isochrone-map tooltip labels | `src/components/isochrone/isochrone-map.tsx:429` |
| M2 | Station-pair cache key assumes <100k stations | `src/workers/grid-worker.ts:159` |
| M3 | Magic numbers in `isInManhattan` | `src/lib/travel-time.ts:30-31` |
| M4 | CLAUDE.md says "~200 bus stops" but data has 733 | CLAUDE.md |
| M5 | Address input not populated from URL state on load | `src/app/explore/page.tsx` — `originAddress` not synced from URL `?address=` param |

---

### Security Review

**Verdict: No Critical Vulnerabilities, 2 Important Issues**

#### P2 — Important

| # | Issue | File | Risk |
|---|-------|------|------|
| S1 | Unvalidated URL state deserialization | `src/lib/url-state.ts:44-58` | `decodeShareableState()` accepts arbitrary lat/lng (Infinity/NaN), unbounded string lengths, unvalidated mode arrays. Client-side DoS vector. Compare with `share-slug.ts` which sanitizes correctly. |
| S2 | No rate limiting on `/api/og` route | `src/app/api/og/route.tsx` | Publicly accessible, makes authenticated Mapbox Static API call per unique lat/lng. Attacker can enumerate coordinates to exhaust Mapbox quota. |

#### P3 — Medium

| # | Issue | Risk |
|---|-------|------|
| S3 | `next@16.1.6` has 4 npm audit advisories | CSRF bypass (GHSA-mq59), HTTP smuggling (GHSA-ggv3), DoS via Server Components (GHSA-q4gf), unbounded disk cache (GHSA-3x4c). No Server Actions used today, so practical risk is low. |
| S4 | `CitiBikeData.fetch()` no `res.ok` check | `src/lib/citibike.ts:13` — non-200 response crashes data load across all pages |
| S5 | Deprecated `document.execCommand("copy")` fallback | `src/app/explore/page.tsx:316-325` |

#### P4 — Low/Info

| # | Issue | Risk |
|---|-------|------|
| S6 | No security headers in `next.config.ts` | No CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| S7 | Modes from decoded URL state not runtime-validated | `src/lib/url-state.ts` — TypeScript cast only, no whitelist filter |

#### Clean Areas

No issues in: SQL injection (no DB), XSS (`dangerouslySetInnerHTML` not used), command injection (no `exec`/`spawn`), hardcoded secrets (all env-var sourced), open redirects, CORS, postMessage security, session management.

---

### Performance Review

**Verdict: 2 Critical Performance Issues**

#### P1 — Critical (User-Visible)

| # | Issue | File | Impact |
|---|-------|------|--------|
| PF1 | Worker re-created and full transit data re-serialized on every compute | `src/lib/grid.ts` + `use-dynamic-grid-compute.ts` | ~1MB structured-clone + full spatial index rebuild up to 3x per origin change. Several hundred ms avoidable overhead. Fix: persistent worker with LOAD_DATA/COMPUTE protocol split. |
| PF2 | `maxMinutes` in fairness layer useEffect causes 150k-cell GeoJSON rebuild on slider snap | `src/components/isochrone/hooks/use-fairness-layer.ts:~105` | Every slider snap in friend mode triggers full 150k-cell iteration instead of zero-JS GL-side `setFilter`. ~50-100ms jank per snap. |

#### P2 — Important

| # | Issue | File | Impact |
|---|-------|------|--------|
| PF3 | `visibleCells` IIFE not memoized — spreads 150k objects on every render | `src/app/find/page.tsx:276-288` | Creates 150k new objects per render cycle during hover/scroll |
| PF4 | No debounce on `reverseGeocode` in `mousemove` handlers | `isochrone-map.tsx` + `hex-map.tsx` | 10-20+ concurrent geocode fetches/sec during fast cursor movement |
| PF5 | `station-matrix.json` (956KB) parsed independently by 3 pages | `use-transit-data.ts`, `find/page.tsx`, `compare/page.tsx` | ~50-150ms JSON parse on each page load; no shared singleton |
| PF6 | CitiBike GBFS fetched at runtime on every page load, no caching | `src/lib/citibike.ts` | External network round-trip (~100-300ms) per page load; station data changes at most daily |

#### Observed in Browser

- **INP Issue**: Chrome DevTools flagged `canvas .mapboxgl-canvas` event handlers blocking UI updates for **11,700.6ms** during isochrone computation on Times Square. This is the combined effect of PF1 (worker setup) and the main-thread work between compute calls.

---

## 2. CEO Plan Review — Product Strategy

**Mode: Quick | Posture: EXPANSION**

### Product Gut Check

- **What it is**: NYC transit accessibility visualizer — drop a pin, see how far you can get by 7 transport modes. 5 routes, 150k hex cells, shareable links.
- **Who benefits**: NYC apartment hunters, tourists, urbanists, real estate agents. No existing tool shows multi-modal isochrone data this way.
- **Revenue**: Portfolio/passion project. Not a direct revenue lever but demonstrates Mapbox expertise, real-time data pipelines, polished UX. Indirect LinkedIn/portfolio leverage.
- **Status**: 19 sessions invested. Functional and deployed. Past MVP — the question is what takes it from "cool project" to "gets shared 10k times."

### The 10-Star Version

1. **"Your NYC in 30 Minutes" shareable card** — beautiful OG image showing personal isochrone ring with name + tagline. One-tap share to social. Think Spotify Wrapped for transit.
2. **Animated reveal** — isochrone rings expand outward like ripples when you drop a pin. Time slider becomes a playhead.
3. **"Race Mode"** — pick two origins, watch isochrones expand simultaneously, see overlap. Perfect for Twitter debates about transit access.

### 5 Delight Opportunities (<30 min each)

1. Auto-detect user location on first visit
2. Neighborhood name badge overlays on map
3. "NYC Transit Score" — single 0-100 number
4. Dark mode toggle (sidebar to match map)
5. "Compare with car" one-click toggle

### Implementation Roadmap

| Phase | Work | Sessions | Night-Mode? |
|-------|------|----------|-------------|
| 1. Critical Bug Fixes | C1 (wait time), C2 (longitude), C3 (cost mode) | 1 | Yes |
| 2. Reliability Hardening | Error boundaries, fetch guards, URL validation, security headers | 1 | Yes |
| 3. Performance Wins | Persistent worker, memoize visibleCells, debounce geocode, reset gridBounds | 1 | Yes |
| 4. Transit Score + Card | Score algorithm, OG card, share flow | 2 | Partial |
| 5. Animated Reveal | Streaming worker results, CSS/GL animation | 1 | Yes |
| **Total** | | **6 sessions** | |

### Not In Scope (Deferred)

- GTFS bus route graph — significant pipeline work, revisit after Phase 5
- Street-line coloring — aesthetic exploration, not value-driving
- Race Mode — compelling but Phase 4 card has higher viral coefficient
- Auto-location — privacy UX needs design
- Next.js upgrade — not urgent until Server Actions needed

---

## 3. Design Review — Visual QA

**Site: https://nyc-transit-heatmap.vercel.app**

### Landing Page (Desktop)

- **Strengths**: Dark atmospheric map background with radial gradient overlay. Clean 3-card layout. Staggered fade-up animations on load. Card hover effects (accent glow, icon scale, CTA arrow slide) feel polished.
- **Typography**: Arial Black italic uppercase for headings reads well. "Isochrone NYC" title with cyan accent is distinctive.
- **Concern**: Cards have no `border-radius` — sharp rectangular edges feel stark against the organic map background. Consider `rounded-lg` or `rounded-xl`.

### Explore Page (Desktop)

- **Strengths**: Dark glass sidebar with rounded card sections. Excellent empty state — pulsing pin icon, "Drop a pin to start" with quick-start buttons (Times Square, Williamsburg, Astoria). Time slider with green-to-red gradient is intuitive.
- **Transport mode grid**: 3x2 with icons and color-coded active states. Clear at a glance.
- **Heatmap rendering**: Hybrid color ramp (smooth within bands, jumps at edges) produces beautiful output. Green/yellow/orange/red progression reads naturally.
- **"How it works" button** (?) in top-right corner — good discoverability.
- **Bug**: Address field shows "Start typing an address..." even after loading from URL params (e.g., `?address=Times+Square`). URL state doesn't populate the input — a functional bug, not just a design concern. The user sees the isochrone but the address field is empty.

### Rankings Page (Desktop)

- **Strengths**: Clean dark cards with cyan rank numbers, progress bars, borough labels. "Compare neighborhoods" link in header. Checkboxes for multi-select comparison.
- **Concern**: All top 6 are Manhattan. No visual indicator of borough distribution or way to filter by borough.

### Find Page (Desktop)

- **CRITICAL DESIGN INCONSISTENCY**: Uses red/pink brutalist theme while every other page uses dark glass + cyan. The 4-step wizard (WORK/GYM/SOCIAL/EXTRAS) tabs are red. Frequency bars are red. Bottom navigation bar is solid red. This is the only page that feels like a different app.
- CLAUDE.md acknowledges this as "legacy" — should be unified with the dark glass theme.

### Mobile Responsiveness Issues

> **Note:** Mobile testing via Chrome `resize_window` was **inconclusive** — CSS media queries did not trigger at the resized window size (screenshots remained at 864x911). All mobile findings below are from **code inspection only**. Real device or Chrome DevTools device emulation testing is needed to confirm.

| Issue | Severity | Detail |
|-------|----------|--------|
| Landing cards may not stack at 390px | High | `grid-cols-1 md:grid-cols-3` should stack below 768px — needs real device QA |
| Explore sidebar doesn't collapse on mobile | High | Code has MobileBottomSheet but sidebar + map split may persist at narrow widths |
| MobileBottomSheet exists but may not be wired to all views | Medium | Component has proper safe-area-inset handling and 44px touch targets |
| No "back to home" navigation on Explore/Find | Low | Only Rankings has a back link |

### Console Errors

None observed during testing.

---

## 4. Web Interface Guidelines — UX Compliance

### Viewport & Layout

- **viewport meta**: Correct — `device-width`, `initialScale: 1`, `viewportFit: cover`
- **body**: `h-dvh overflow-hidden` — proper mobile viewport height handling
- **safe-area-inset**: Used in MobileBottomSheet and wizard navigation
- **lang attribute**: `<html lang="en">` present

### Accessibility

| Check | Status | Notes |
|-------|--------|-------|
| Keyboard navigation on map | Pass | Drop-pin-map has keyboard support |
| aria-labels on sliders | Pass | Time slider, fairness slider labeled |
| `prefers-reduced-motion` | Pass | Landing animations, animate-ping, TransitTrivia all respect it |
| Min touch targets (44px) | Pass | Bottom sheet drag handle, slider thumbs (24px → could be larger) |
| Skip-to-content link | **Fail** | No skip navigation link on any page |
| Focus indicators | **Needs review** | Default browser focus rings only; no custom focus-visible styles |
| Color contrast | **Warning** | `text-white/40` and `text-white/50` on dark backgrounds may fail WCAG AA (4.5:1 ratio) |
| Screen reader map experience | **Fail** | Mapbox GL canvas is not accessible to screen readers; no text alternative for isochrone visualization |

### Map Interaction Patterns

| Pattern | Status | Notes |
|---------|--------|-------|
| Click to drop pin | Pass | Clear and intuitive |
| Quick-start locations | Pass | Zero-typing entry for first-time users |
| Address autocomplete | Pass | Mapbox geocoding with placeholder text |
| Time slider | Pass | Snaps to values, shows current time prominently |
| Mode toggles | Pass | Visual state clear, walk locked ON by default |
| Hover tooltips on hex cells | Pass | Shows mode breakdown per cell |
| Share URL | Pass | Encodes state in URL params for deep linking |
| Scroll/zoom on map | **Warning** | No "scroll to zoom" guard — page scroll may conflict with map zoom on mobile |

### SEO & Social

| Check | Status | Notes |
|-------|--------|-------|
| title + description | Pass | All pages have unique metadata |
| OG image | Pass | Dynamic generation via `/api/og` with Mapbox static map |
| Twitter card | Pass | `summary_large_image` configured |
| Canonical URL | **Missing** | No canonical URL set |
| Structured data | **Missing** | No JSON-LD schema for the app |

### Navigation

| Issue | Severity |
|-------|----------|
| No global navigation bar | Medium — users rely on browser back button |
| No breadcrumbs | Low — flat site structure makes this acceptable |
| No 404 page | Medium — `not-found.tsx` doesn't exist |
| No loading states between pages | Low — pages load fast enough |

---

## 5. Test Coverage Analysis

### Current State

- **Test framework**: Vitest 4.1.0
- **Test files**: 13
- **Total tests**: 92, all passing
- **Test code**: 1,062 lines
- **Runtime**: 5.57s

### Coverage Map

| Module | Test File | Tests | Coverage Quality |
|--------|-----------|-------|-----------------|
| `src/lib/cost.ts` | `cost.test.ts` | ~20 | Good — covers all pricing tiers |
| `src/lib/geocode.ts` | `geocode.test.ts` | ~8 | Good — mocks Mapbox API |
| `src/lib/gym-chains.ts` | `gym-chains.test.ts` | ~10 | Good — chain lookups |
| `src/lib/hex.ts` | `hex.test.ts` | ~5 | Basic — hex generation |
| `src/lib/isochrone.ts` | `isochrone.test.ts` | ~14 | Good — time bands, layer generation, edge cases |
| `src/lib/meetup-overlap.ts` | `meetup-overlap.test.ts` | ~8 | Good — overlap calculation |
| `src/lib/subway.ts` | `subway.test.ts` | ~7 | Good — station lookup, walk+ride time |
| `src/lib/travel-time.ts` | `travel-time.test.ts` | ~6 | Moderate — tests dead code (`bikeTime`) |
| `src/lib/url-state.ts` | `url-state.test.ts` | ~6 | Basic — encode/decode roundtrip |
| `src/lib/share-slug.ts` | `share-slug.test.ts` | ~5 | Good — binary encoding |
| `src/hooks/use-own-bike-preference.ts` | `use-own-bike-preference.test.ts` | ~5 | Good — localStorage lifecycle |
| `src/hooks/expand-bounds-if-hit` | `expand-bounds-if-hit.test.ts` | ~8 | Good — edge detection |
| `src/components/share/share-sheet.tsx` | `share-sheet.test.ts` | ~3 | Minimal — URL resolution only |

### Critical Gaps

| Untested Module | Priority | Why It Matters |
|-----------------|----------|---------------|
| `src/workers/grid-worker.ts` | **P0** | Core computation engine. 300+ lines of travel time logic, spatial indexing, station-pair caching. All transit calculations happen here. A bug here affects every hex cell on every page. |
| `src/lib/bus.ts` | **P1** | Bus time calculation with wait time + ride speed assumptions. No validation that the model produces reasonable times. |
| `src/lib/ferry.ts` | **P1** | Floyd-Warshall adjacency graph for ferry routing. Complex graph algorithm with no test coverage. |
| `src/lib/citibike.ts` | **P1** | Runtime GBFS data loader. No test for error handling (missing `res.ok` check is a known bug). |
| `src/lib/grid.ts` | **P1** | Worker lifecycle management. Untested worker creation/termination. |
| `src/hooks/use-dynamic-grid-compute.ts` | **P2** | Dynamic bounds expansion, border-hit detection. Has a known bug (gridBounds not resetting). |
| `src/hooks/use-transit-data.ts` | **P2** | Parallel data loading orchestration. Error handling paths untested. |
| `src/app/api/og/route.tsx` | **P2** | OG image generation. No test for parameter sanitization. |
| All page components | **P3** | No integration/render tests. Acceptable for now given the app is highly interactive/visual. |
| `scripts/build-rankings.ts` | **P1** | Pre-computes rankings.json. Has a known bug (wrong longitude constant). A test would have caught this. |

### Recommended Testing Strategy

#### Tier 1: Transit Data Pipeline (Highest Priority)

The core value proposition depends on travel time accuracy. Focus tests here first.

```
grid-worker.test.ts
  - computeSubwayTime: walk + wait + ride + walk (verify wait time included)
  - computeBusTime: walk + wait + ride + walk
  - computeBikeTime: walk-to-dock + ride + walk-from-dock
  - computeFerryTime: walk-to-terminal + ride (via adjacency) + walk
  - buildStationAccess: both origin and destination side
  - Spatial index: O(1) lookups vs brute-force produce same results
  - Station-pair cache: cache hit returns same value as cache miss
  - Edge cases: origin at exact station location, origin outside NYC bounds

bus.test.ts
  - loadBusStops: success path, error path (res.ok = false)
  - Bus time model: verify reasonable times for known distances

ferry.test.ts
  - loadFerryData: success path, error path
  - Floyd-Warshall adjacency: known route produces correct hop count
  - Edge: terminal not in adjacency graph

build-rankings.test.ts
  - Uses same constants as src/lib/ (import check)
  - Produces valid rankings.json structure
  - Known neighborhood produces expected rank range
```

#### Tier 2: Data Integrity & Encoding

```
url-state.test.ts (expand existing)
  - Malicious input: NaN lat/lng, Infinity, 10MB name string
  - Invalid modes array
  - Missing required fields

citibike.test.ts
  - Fetch success: valid GBFS response parsed correctly
  - Fetch failure: res.ok = false handled gracefully
  - Malformed response: missing fields don't crash

share-slug.test.ts (expand existing)
  - Roundtrip with all 7 modes including ownbike
  - Backward compatibility: old slugs decode correctly
```

#### Tier 3: Integration & Visual (Lower Priority)

```
- Smoke test: each page renders without throwing (jsdom/happy-dom)
- OG route: returns valid ImageResponse for valid params
- OG route: rejects params with NaN/Infinity
- Component render tests for results-sidebar, hex-map (snapshot or visual regression)
```

#### Not Recommended

- End-to-end Playwright tests for map interactions — high maintenance cost for a passion project
- Visual regression testing — the map output varies by Mapbox style version
- Full component unit tests for every UI component — the app is highly interactive; browser testing is more valuable

---

## Summary

```
+=============================================================+
|           FULL AUDIT SUMMARY — 2026-04-11                   |
+=============================================================+
| Code Review      | 3 critical, 7 important, 4 minor         |
| Security Review  | 0 critical, 2 important, 3 medium, 2 low |
| Performance      | 2 critical, 4 important                   |
| Design Review    | 1 critical (Find page theme mismatch),    |
|                  | 2 high (mobile responsive), 4 medium      |
| UX Compliance    | 2 fails (skip-nav, screen reader),        |
|                  | 3 warnings, 2 missing (canonical, 404)    |
| Test Coverage    | 92/92 passing, but 10 critical modules    |
|                  | untested (worker, bus, ferry, citibike)   |
+-------------------------------------------------------------+
| CEO Strategy     | EXPANSION: 6 sessions to "wow" state      |
|                  | Viral feature: shareable transit score     |
| Top 3 Priorities | 1. Fix 3 critical bugs (1 session)        |
|                  | 2. Add worker + pipeline tests (1 session)|
|                  | 3. Persistent worker for perf (1 session) |
+=============================================================+
```
