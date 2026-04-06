---
name: NYC Transit Heatmap — performance context
description: Known performance characteristics, hotspots, and architecture decisions for the transit heatmap project
type: project
---

~150k H3 hex cells at resolution 10, computed in a web worker via chunked processing (5k cells/chunk). Worker is the right pattern here — main-thread INP risk is in rendering, not computation.

Key render bottlenecks:
- `cellsToHexGeoJSON` iterates all 150k cells on every slider move (maxMinutes change)
- `buildFairnessGeoJSON` iterates 150k cells with a Map lookup — runs on BOTH cells + friendCells changes
- `ReachStats` iterates 150k cells × n modes synchronously on every maxMinutes change
- Two full 150k-cell arrays in memory when friend is added (cells + friendCells)
- `generateHexCenters` is called identically in both runCompute and runFriendCompute — wasted work (though it has a module-level cache so the second call IS free)
- `allContours` array spread in render (`[...apiContours, ...friendContours]`) creates a new array reference every render, triggering the API contour useEffect unnecessarily

Worker architecture: single `activeWorker` global — friend compute terminates main compute if user adds a friend while origin is computing. This is intentional cancel behavior but could surprise users.

**Session 6 additions (reviewed 2026-03-30):**
- Rankings page: fetches station-matrix.json (956KB) + station-graph.json (54KB) on every page load with no caching. `scoreNeighborhoods` runs 25 neighborhoods × 5 landmarks × `findNearest` (full O(n) scan of 496 stations) = 125 O(n) station scans synchronously on main thread. Each `findNearest` does a full map+filter+sort over 496 entries. Total: 62,500 station comparisons synchronously after JSON parse. Not debilitating but could be slow on low-end devices. Results never change — could be pre-computed at build time or cached in a module constant after first run.
- iso-outline layer: two `setPaintProperty` calls per animation frame during the 800ms reveal. This is cosmetically acceptable but slightly more GL state to flush. `setFilter` is now called twice on every slider tick (iso-fill + iso-outline). Both are GL-side operations — no JS iteration. Fine as-is.
- Mobile bottom sheet (explore): uses a JSX variable `sidebarControls` shared between desktop aside and mobile sheet. NOT a second React subtree — both consume the same JSX object reference. No double-render issue, no unnecessary re-renders introduced.
- Mobile bottom sheet (find/page.tsx): ResultsSidebar IS instantiated twice as separate React component instances — once in the hidden desktop div, once inside MobileBottomSheet. Both mount and run their render logic even though only one is visible at a time. On desktop, the mobile sheet is CSS-hidden but still mounted.
- OG route: fetches Mapbox static image (1200×630@2x) inside the edge function on every share link crawl. Cache-Control IS set (public, max-age=86400, s-maxage=86400) on the success path — confirmed correct. Edge-runtime only; zero client bundle impact.
- @vercel/og is edge-runtime only (import confined to src/app/api/og/route.tsx with `export const runtime = "edge"`). Does NOT affect client bundle.
- ResultsSidebar double-mount in find/page.tsx is **P1**: `sidebarContent` is a JSX variable rendered as two separate React component instances (desktop div + MobileBottomSheet). Both mount and re-render on every compute progress tick (~30 re-render waves × 2 trees during 150k-cell computation). Fix: use CSS visibility toggle or a React portal, same as explore/page.tsx which correctly shares a single `sidebarControls` JSX object.
- Rankings scoreNeighborhoods: 25 × 5 × O(496) = 62,500 station comparisons synchronously on main thread after 956KB JSON parse. Results are fully deterministic — should be pre-computed as a static JSON or at minimum deferred with setTimeout to yield before scoring.
- Compare page: getNearbySubwayLines + getNearestSubwayWalk both do full O(496) station scans per neighborhood with no spatial index. countNearbyBikeDocks iterates all ~1,700 CitiBike stations per neighborhood. Runs in useMemo on every neighborhood add/remove.
- station-matrix.json (956KB) parsed fresh on every navigation between /rankings and /compare — no module-level singleton or layout-level cache.

**Why:** Confirmed in full performance review of Session 6 diff (5599201..HEAD).
**How to apply:** P1 is the find page double-mount — fix before next release. Rankings pre-computation is the easiest P2 win (static JSON at build time). Compare page O(n) scans are acceptable at 496 stations but should use the spatial grid pattern if the station count grows.
