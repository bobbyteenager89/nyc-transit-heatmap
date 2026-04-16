---
name: NYC Transit Heatmap — performance context
description: Known performance characteristics, hotspots, and architecture decisions for the transit heatmap project
type: project
---

~150k H3 hex cells at resolution 10, computed in a web worker via chunked processing (5k cells/chunk). Worker is the right pattern here — main-thread INP risk is in rendering, not computation.

Key render bottlenecks:
- `buildFairnessGeoJSON` has `maxMinutes` in useEffect deps (use-fairness-layer.ts ~line 105) — causes full 150k-cell GeoJSON rebuild on every slider snap in friend/meet mode. `maxMinutes` guard inside the function should be removed and delegated to a GL filter instead.
- `ReachStats` iterates 150k cells × n modes synchronously on every maxMinutes change — this IS wrapped in useMemo correctly.
- Two full 150k-cell arrays in memory when friend is added (cells + friendCells)

Worker architecture:
- Web worker is re-created on every compute call (new Worker() in grid.ts). The expansion loop in use-dynamic-grid-compute.ts calls computeForBounds up to 3 times per origin — each call creates a new worker, serializes the full transit data payload (1MB+) via structured-clone, and rebuilds all spatial indexes (stationGrid, dockGrid, terminalGrid, busStopGrid) from scratch. This is the dominant compute setup cost.
- Keeping a long-lived worker and separating "load transit data once" from "compute for these hexes" would eliminate 3× serialization of 1MB+ data during expansion passes.
- single `activeWorker` global — friend compute terminates main compute if user adds a friend while origin is computing. Intentional cancel behavior.

**Session 6 additions (reviewed 2026-03-30):**
- Rankings page: was fetching station-matrix.json (956KB) + running scoreNeighborhoods synchronously on main thread. **NOW FIXED** — rankings page is a Server Component reading pre-computed rankings.json from filesystem. No longer a perf issue.
- ResultsSidebar double-mount in find/page.tsx: **NOW FIXED** — uses useMediaQuery conditional render. Desktop gets `{isDesktop && <div>{sidebarContent}</div>}` and mobile gets `{!isDesktop && <MobileBottomSheet>...</MobileBottomSheet>}`. Only one instance mounts at a time.
- Compare page: getNearbySubwayLines + getNearestSubwayWalk both do full O(496) station scans per neighborhood. countNearbyBikeDocks iterates all ~1,700 CitiBike stations per neighborhood. Runs in useMemo. Acceptable at current scale.

**Session 19 findings (reviewed 2026-04-11, diff covers night-mode + bus stop expansion):**
- P1: Worker re-created + full transit data re-serialized on every compute pass (up to 3× per origin). Fix: long-lived worker with separate "load" message.
- P1: `buildFairnessGeoJSON` has `maxMinutes` in useEffect deps — full 150k-cell rebuild fires on every slider snap in friend mode. Fix: remove maxMinutes from deps, delegate the filter to GL.
- P2: `visibleCells` IIFE in find/page.tsx (lines 276-288) not memoized — spreads 150k cell objects on every render when showPerPin is true. Fix: useMemo([cells, selectedDestId]).
- P2: No debounce on reverse geocode in mousemove handlers (isochrone-map.tsx and hex-map.tsx). Geocode cache mitigates repeat lookups but initial sweeps fire concurrent fetches.
- P2: station-matrix.json (956KB) fetched + parsed independently by 3 pages (/explore via use-transit-data.ts, /find, /compare). No shared singleton or layout-level cache.
- P2: CitiBike GBFS fetched at runtime on every page load with no caching strategy (no stale-while-revalidate, no localStorage, no CDN proxy). Station info changes at most daily.
- `generateIsochroneLayers` in isochrone.ts — confirmed dead code (zero production callers). No perf impact; safe to delete for bundle size.
- COLOR_RAMP change from "step" to "interpolate" (12 stops) — GL-expression only, no JS perf impact.
- Bus stop expansion (222→733 stops) increases spatial index build cost in the worker but is correctly handled by the existing grid indexing pattern.

**Why:** Full review of codebase state as of 2026-04-11.
**How to apply:** P1 worker serialization is the highest-leverage fix — it eliminates 3× structured-clone of 1MB+ and 3× spatial index rebuilds per origin. P1 fairness layer dep is easy to fix (remove maxMinutes from deps array). P2 items are scalability risks that become visible under load or with friend mode active.
