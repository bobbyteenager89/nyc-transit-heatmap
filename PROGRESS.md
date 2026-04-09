# NYC Transit Heatmap — Progress

> Older sessions (1–6) archived in `PROGRESS-archive.md`.

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

---

## 2026-04-08 — Session 13: Subway hover quiet-down + smoke test verification

### Accomplished
- Subway station hover now highlights ONLY the single station under the cursor. Previous behavior lit up every station on the hovered line AND dimmed everything else to 0.25 opacity — in dense Midtown this turned the map into a strobe whenever the cursor crossed the station cluster. Filter is now `["==", ["get", "name"], hoveredName]`, base opacity stays at 0.5.
- Ran `/smoke-test` against the live deploy (`6dbeb30`). All 7 routes pass (`/`, `/explore`, `/find`, `/rankings`, `/compare`, `/api/og`, `/p/[slug]` correctly 404s on invalid slug). Zero console errors. Mapbox canvas mounts, all 6 mode buttons render with Walk locked, Citi Bike label correct, wizard renders on /find, 25 ranking cards on /rankings, graceful empty state on /compare. Runtime logs clean.
- `.projects.json` `lastReviews.smokeTest` bumped to 2026-04-08.

### Files Modified
| File | Changes |
|------|---------|
| `src/components/isochrone/isochrone-map.tsx` | Single-station hover filter (was whole-line filter + global dim) |

### Commit
- `6dbeb30` fix(explore): subway hover highlights single station, not whole line
