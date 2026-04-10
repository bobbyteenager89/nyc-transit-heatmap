# Night Mode Briefing — 2026-04-09 (Session 18)

## TL;DR
Shipped 4 commits on `feat/night-mode-s18`: landing page polish with animations, destination-side bus+subway transfers (both directions now), explore empty-state with quick-start buttons, and reduced-motion accessibility. Build clean, 92/92 tests green.

## Completed
- **Landing page polish** → commit `eda98bc`
  - Staggered card entrance animations (fade-up with 150ms delays between cards)
  - Card hover: accent glow line at top, icon scale-up, CTA arrow slides right
  - Per-card SVG icons (compass for Explore, pin for Find, bar chart for Rankings)
  - Map background breathing animation (8s cycle, subtle 0.2→0.35 opacity pulse)
  - Radial gradient overlay for visual depth

- **Destination-side bus+subway transfers** → commit `383d3dc`
  - Previously bus-assisted subway access only worked on the origin side
  - Now `computeSubwayTime` uses `buildStationAccess` on both sides
  - Symmetric manhattan distances mean same function works for access and egress
  - Expands reach for destinations near bus routes but far from subway stations

- **Enhanced empty-state with quick-start locations** → commit `1bdbfa9`
  - Pulsing pin icon animation drawing attention to the map
  - "Drop a pin to start" with clearer copy
  - Quick-start buttons: Times Square, Williamsburg, Astoria
  - One tap to instantly set origin and trigger compute — zero typing needed

- **Reduced-motion accessibility** → commit `d4990e0`
  - `prefers-reduced-motion: reduce` disables all landing page animations
  - Static fallback values ensure content is still visible

## In Progress
- None — all planned work completed

## Decisions Needed (1-way doors)
### Station-click-as-origin for rankings page
**Context:** The rankings page links each neighborhood to `/explore?lat=...`. An alternative would be showing an inline isochrone preview when you click a ranking card.
**Options:**
- A) Keep current behavior — click links to /explore *(recommended — simple, already works)*
- B) Add inline preview map on click — more complex, may slow down the page
**Blocking:** Nothing — this is a future enhancement

## Review Results
- Build: ✅ clean (Turbopack 3.0s, 7 routes)
- Tests: ✅ 92/92 passing
- Code review: dispatched, results pending at time of briefing write

## Branches Pushed
- `feat/night-mode-s18` — PR-ready, 4 commits ahead of main

## Next Session Suggested Start
1. Merge `feat/night-mode-s18` to main and deploy
2. Check the live landing page — do the animations feel right? Too much/little?
3. Test the bus+subway destination-side transfers — explore from a location where a bus-to-subway egress leg should matter (e.g., deep Brooklyn)
4. Remaining roadmap: GTFS bus route graph (replaces great-circle approximation), landing page video/preview in cards
