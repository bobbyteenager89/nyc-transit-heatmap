# NYC Transit Heatmap — Progress

> Older sessions (1–6) archived in `PROGRESS-archive.md`.

---

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

## 2026-04-07 — Session 11: "You vs. Me" meetup mode (?compare= URL param)

### Accomplished
- Wired `?compare=[slug]` param in `explore/page.tsx`: decodes the slug on mount,
  pre-loads friend's location, auto-switches to "Meet" mode tab, triggers runFriendCompute
- Added `MeetupSummary` component: shows "X areas reachable by both in Y min" (or
  "No overlap — try a longer time budget"), plus a "Share meetup link" button
- `handleShareMeetup` encodes friend's location as ?compare=slug and also includes
  the user's own lat/lng so both isochrones load when recipient opens the link
- Upgraded A/B marker labels: origin shows "A" and friend shows "B" (amber) when
  in meet mode; reverts to plain dot when no friend is set
- Added `countOverlapCells` utility in `src/lib/meetup-overlap.ts` with 5 unit tests
- 76 tests passing, clean build

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/meetup-overlap.ts` | `countOverlapCells` — H3 intersection count for sidebar summary |
| `src/lib/__tests__/meetup-overlap.test.ts` | 5 unit tests |
| `src/components/isochrone/meetup-summary.tsx` | Overlap count + share button UI |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/explore/page.tsx` | Parse ?compare= param, handleShareMeetup, MeetupSummary render, meetupCopied state |
| `src/components/isochrone/isochrone-map.tsx` | A/B labeled markers in meet mode |

### Example URL
`https://nyc-transit-heatmap.vercel.app/explore?compare=<slug>&lat=40.7282&lng=-73.9942&t=30&m=subway,bus,walk,bike,ferry`

Visiting this URL pre-loads friend's isochrone (from slug) and auto-switches to Meet mode.
The recipient then drops their own pin to see the intersection.

### Next Steps
- [x] Phase 3: Explore delight (line-color hover, trivia) — shipped S12
- [x] Fix find page ResultsSidebar double-mount — shipped S12
- [ ] Phase 2: Landing polish (animated card previews, hover reveals)
- [ ] Bike-to-station combo mode (lives in stash@{0})
- [ ] Bus transfers
- [ ] Server-render rankings page

---

## 2026-04-08 — Session 12: Launch-ready rework — mental model, stepped contours, dynamic bounds, P0/P1 polish

### Accomplished
This was a long, multi-phase session driven by live feedback. Eight commits on top of the S11/Phase 3 merge took /explore from "works but subtly broken in several ways" to shareable-demo quality.

**Product / mental model**
- Reframed mode selection around how NYers actually think: `walk + subway + bus + ferry + Citi Bike` is the default "Your reach." `Car` is an opt-in overlay. `Walk` is locked (can't be turned off — every trip involves walking at both ends). Relabeled "Bike" → "Citi Bike" throughout (the existing compute is already dock-to-dock, so this was a labeling fix, not a backend change). View mode dropdown "Fastest" → "Your reach."
- Reworked `ModeLegend`: bigger 3-col chip grid, clear accent-glow active state with top-right indicator dot, locked walk button.

**Data quality bugs (major)**
- **Subway reach cliff** — discovered the compute was only considering the top-3 nearest stations at each end of a trip. In dense Manhattan trunk corridors the top 3 were often on the same trunk (e.g. 6th Ave B/D/F/M), excluding the R line entirely — which is the only direct route to Bay Ridge. Bay Ridge hexes were routing through suboptimal station pairs and cliffing at ~60 min. Expanded to top-8. 64 lookups/hex vs 9, still trivial.
- **Hex grid latitudinal cliff** — `CORE_NYC_BOUNDS.sw.lat = 40.63` literally cut the entire southern half of Brooklyn (Bay Ridge, Bensonhurst, Gravesend, Coney Island, Midwood) out of the grid. No hexes existed there, so no compute would help. Discovered by live inspection.

**Coloring**
- Replaced the smooth `interpolate` color ramp with a stepped `step` expression — hard 10-min bands (0-10, 10-20, 20-30, 30-40, 40-50, 50+). Makes the subway "veins" visible as crisp finger-shaped intrusions of a faster band into the slower band around it. Updated `MapLegend` to match.

**Dynamic bounds expansion**
- New infrastructure in `explore/page.tsx`: after each compute, `expandBoundsIfHit` scans the outer ring of cells. If any reachable cell sits within ~500m of a grid border, the bounds grow by `BOUNDS_EXPANSION_STEP` (0.04°) in that direction (clamped to `MAX_NYC_BOUNDS`), and the compute re-runs. Capped at 2 extra passes per origin to prevent runaway.
- Non-blocking "Expanding map…" pill overlay at top-center during expansion — the existing reach stays visible while the new area fills in.
- Landed alongside `H3_RESOLUTION 9 → 10 → back to 10 with tight bounds` — initial grid is fast, but the dynamic expansion means far reaches aren't cut off.

**Performance**
- Fixed a Vercel Speed Insights INP issue: `ModeTabs` `onChange` synchronously re-rendered the explore page (~150k hex cells), blocking UI for 218ms. Wrapped the state update in `startTransition` so React paints the active-state change first and defers the heavy render.

**Launch polish (P0/P1 sprint)**
- Added `openGraph` + `twitter` metadata using the existing `/api/og` edge route. Shared URLs now render a real preview card instead of a blank box. Set `metadataBase` + new title "Isochrone NYC — How far can you go?"
- Installed `@vercel/speed-insights` and mounted `<SpeedInsights />` in root layout — future INP/LCP/CLS regressions get caught automatically.
- Fixed stale "Bike" label in the hex tooltip (line 472 of isochrone-map.tsx) — now "Citi Bike" to match the legend.
- Rewrote landing page copy: subtitle + Explore card description no longer claim "smooth contour rings" (they're stepped now) and explicitly list all 5 modes.

**Killed**
- Removed the Race button (ReachRaceButton component) — confusing and discoverable, cut on user call.
- Dropped 2 stale stashes (`phase3-explore-delight`, `bike-to-station-combo WIP`) superseded by the merged work. Kept `stash@{0}` (bike-to-station-combo experiment) for future.

**Verified on production**
- Smoke-tested `/explore`, `/find`, `/compare` on deploy — all clean, no console errors
- Build clean, 76 tests passing

### Files Modified
| File | Changes |
|------|---------|
| `src/app/explore/page.tsx` | DEFAULT_MODES, LOCKED_MODES, dynamic gridBounds state, expandBoundsIfHit helper, Walk guard in toggleMode, expanding overlay, URL merge with baseline |
| `src/components/isochrone/isochrone-map.tsx` | Stepped COLOR_RAMP, maxBounds + minZoom, MTA station circles with line colors, tooltip Citi Bike label |
| `src/components/isochrone/mode-legend.tsx` | Rewrite: 3-col grid, bigger chips, Walk locked, Citi Bike relabel, accent-glow active state |
| `src/components/isochrone/mode-tabs.tsx` | startTransition wrap on onChange |
| `src/components/isochrone/map-legend.tsx` | Match new stepped 10-min bands |
| `src/workers/grid-worker.ts` | top-8 nearest stations (was top-3) |
| `src/lib/constants.ts` | H3_RESOLUTION = 10, tighter CORE_NYC_BOUNDS, new BOUNDS_EXPANSION_STEP + MAX_NYC_BOUNDS |
| `src/app/layout.tsx` | openGraph, twitter metadata, SpeedInsights mounted |
| `src/app/page.tsx` | Landing copy rewrite (no more "smooth contour rings") |
| `src/app/find/page.tsx` | useMediaQuery to eliminate ResultsSidebar double-mount |
| `src/hooks/use-media-query.ts` | New hook |
| `package.json` | +@vercel/speed-insights |

### Files Removed
- `src/components/isochrone/reach-race-button.tsx`

### Commits (8)
- `a97d30a` chore(launch): P0+P1 sprint — metadata, SpeedInsights, label + copy fixes
- `cc22343` feat(explore): res 10 + dynamic bounds expansion + bigger mode buttons
- `4441b4b` feat(explore): 'Your reach' mental model — transit baseline + bike/car overlays
- `6eb2c07` perf(explore): drop hex resolution to 9 + clamp map viewport (superseded)
- `5c68ecf` fix(explore): expand hex grid to cover southern Brooklyn + eastern Queens
- `bba509e` fix(subway): consider top-8 nearest stations instead of top-3
- `ec2e6d0` feat(explore): stepped 10-min contour bands + remove Race button
- `d5706fb` perf(explore): wrap ModeTabs onChange in startTransition
- `3be3aef` feat(explore): Phase 3 delight + MTA station hover + find page double-mount fix (morning merge)

### Memory saved
- `feedback_check_vercel_observability.md` — smoke-testing a deployed site must include Vercel Speed Insights + runtime logs, not just console errors

### Next Steps
- [ ] Own-bike mode (point-to-point, distinct from dock-based Citi Bike)
- [ ] Station click to set as origin
- [ ] Empty-state hint on /explore ("Try Times Square — or click the map")
- [ ] "How it works" info button explaining stepped bands + Your reach
- [ ] Mobile QA on real device
- [ ] Read & review Transit Trivia widget content
- [ ] Unit tests for `expandBoundsIfHit` (5 decision branches, worth protecting)
- [ ] Refactor: `isochrone-map.tsx` and `explore/page.tsx` both approaching 1000 LOC — pull useSubwayStations, useFairnessLayer, useDynamicGridCompute hooks out
- [ ] Landing polish (animated card previews, hover reveals)
- [ ] Bus transfers
- [ ] Server-render rankings page
