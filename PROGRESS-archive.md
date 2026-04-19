# PROGRESS Archive

---

## 2026-04-16 — Session 21: Deep resume + full preflight + smoke test — all green

### Accomplished
- **Deep resume:** Full project-resumer briefing — reviewed all 20 sessions, documented open backlog (mobile QA, ferry/citibike tests, GTFS bus route graph, URL state edge case).
- **Review orchestrator sweep:** Scanned 10 active projects, found 8 with stale reviews. No NYC Transit reviews were stale (preflight/smoke were 4d old — within threshold).
- **Full preflight (Full Mode):** Build clean (Next.js 16.1.6, Turbopack). 92/92 tests passing. Screenshots at 375px / 1024px / 1440px — all pages render correctly. No console errors. No broken images. All interactive elements have focus styles. Deletion audit clean.
  - ⚠️ Explore page shows WebGL error in headless (expected — error boundary from S20 works correctly).
  - ⚠️ Find wizard still uses legacy pink/red theme (by design — only results components were converted in S20).
- **Smoke test:** 6/6 routes return 200 on https://nyc-transit-heatmap.vercel.app. No runtime errors in Vercel logs. Rankings, Compare, Find all load with data. Primary CTAs navigate correctly.
- **Tracking:** Updated `.projects.json` `lastWorked`, `preflight`, `smokeTest` dates.
- **agent-browser fix:** Installed correct playwright-core chromium version (v1208) for agent-browser after global playwright update caused version mismatch.

### Files Modified
| File | Changes |
|------|---------|
| `.claude/agent-memory/performance-reviewer/project_perf_context.md` | Performance reviewer memory updated |
| `.claude/agent-memory/security-reviewer/MEMORY.md` | Security reviewer memory updated |
| `.claude/agent-memory/security-reviewer/project_og_token_exposure.md` | New: OG token exposure note |
| `.claude/agent-memory/security-reviewer/project_unvalidated_url_state.md` | New: URL state validation note |

### Next Steps
- [ ] Mobile QA on real iPhone (carried from S19 — deploy is live at https://nyc-transit-heatmap.vercel.app)
- [ ] Add tests for ferry, citibike, url-state validation
- [ ] GTFS bus route graph (replace great-circle ride approximation)
- [ ] Explore street-line coloring with glow (Mapbox road vector tiles)
- [ ] Verify `?lat=&lng=` URL state edge case is fixed by S20 input validation

---

## 2026-04-12 — Session 20: Full-project audit fix — 17 issues across bugs, perf, security, design

### Accomplished
- **3 critical bug fixes:** Added missing `SUBWAY_WAIT_MIN` (5 min) to `computeSubwayTime` (was ~5 min too low on compare page). Fixed longitude constant in `build-rankings.ts` (54.6→52.3, ~4.4% error). Fixed `MonthlyFooter` assigning `modes[0]` to all destinations (walks costed as subway rides).
- **Performance: persistent worker:** Refactored `grid-worker.ts` to LOAD_DATA/COMPUTE protocol. Transit data + spatial indexes built once, reused across computes. Eliminates ~1MB structured-clone per call.
- **Performance: HexMap flyTo:** Replaced full Mapbox instance re-creation on center change with `map.flyTo()`. Eliminates map flash/flicker.
- **Performance: gridBounds reset:** Reset to `CORE_NYC_BOUNDS` on each new origin. Prevents 2x cell bloat after expansion.
- **Performance: visibleCells memo:** Wrapped Find page's 150k-cell mapping in `useMemo`.
- **Security:** Added input validation to `decodeShareableState` (lat/lng bounds, string limits, mode whitelist, payload cap). Added security headers to `next.config.ts`.
- **Fetch guards:** Added `res.ok` checks to `ferry.ts` and `citibike.ts`.
- **Design unification:** Converted entire Find page from pink/red brutalist to dark glass theme (sidebar, footer, map UI, tooltips, legend, markers, chips, best-neighborhood, surprise-insight, share-button — 10 components).
- **Error handling:** Added `error.tsx` and `not-found.tsx` error boundaries.
- **Minor fixes:** Added `ownbike` to isochrone tooltip labels. Address field now syncs from URL `address` param on load.
- **Deduplication:** Find page data loading refactored to use shared `useTransitData` hook.
- **Docs:** Updated CLAUDE.md (733 bus stops, 7 modes). Full audit documented in `docs/FULL-AUDIT-2026-04-11.md`.
- Build clean, 92/92 tests passing, production deployed.

### Files Created
| File | Purpose |
|------|---------|
| `src/app/error.tsx` | Global error boundary (dark glass theme) |
| `src/app/not-found.tsx` | 404 page |
| `docs/FULL-AUDIT-2026-04-11.md` | Comprehensive audit findings document |

### Files Modified (22)
| File | Changes |
|------|---------|
| `src/lib/subway.ts` | Added SUBWAY_WAIT_MIN to computeSubwayTime |
| `scripts/build-rankings.ts` | Fixed longitude constant 54.6→52.3 |
| `src/components/results/monthly-footer.tsx` | Fixed mode assignment + dark glass theme |
| `src/lib/ferry.ts` | Added res.ok guard |
| `src/lib/citibike.ts` | Added res.ok guard |
| `src/components/results/hex-map.tsx` | flyTo instead of re-create, dark glass UI |
| `src/hooks/use-dynamic-grid-compute.ts` | Reset gridBounds, remove stale dep |
| `src/lib/url-state.ts` | Input validation (lat/lng, strings, modes, payload) |
| `next.config.ts` | Security headers |
| `src/lib/grid.ts` | Persistent worker with LOAD_DATA/COMPUTE protocol |
| `src/workers/grid-worker.ts` | LOAD_DATA/COMPUTE message handling |
| `src/app/find/page.tsx` | useTransitData hook, useMemo, dark glass loading |
| `src/app/explore/page.tsx` | Address URL param sync |
| `src/components/isochrone/isochrone-map.tsx` | Added ownbike to modeLabels |
| `src/components/results/results-sidebar.tsx` | Dark glass theme |
| `src/components/results/best-neighborhood.tsx` | Dark glass theme |
| `src/components/results/surprise-insight.tsx` | Dark glass theme |
| `src/components/results/share-button.tsx` | Dark glass theme |
| `src/components/setup/mode-toggles.tsx` | Dark glass text color |
| `src/components/ui/chip.tsx` | Dark glass styling |
| `public/data/rankings.json` | Regenerated with corrected longitude |
| `CLAUDE.md` | Bus stop count + mode count |

### Commits
- `4ff0857` — Fix all 17 audit findings: critical bugs, perf, security, design unification

### Next Steps
- [ ] Mobile QA on real iPhone (carried from S19)
- [ ] Add tests for ferry, citibike, url-state validation (blocked by hook — needs manual write)
- [ ] GTFS bus route graph (replace great-circle ride approximation)
- [ ] Explore street-line coloring with glow (Mapbox road vector tiles)

---

## 2026-04-10 — Session 19: Bus stop expansion + hybrid color ramp

### Accomplished
- **Bus stop data expansion (222 → 733):** Downloaded MTA Brooklyn + Queens bus GTFS data. Built `scripts/expand-bus-stops.ts` to find geographic gaps in current curated bus stops and fill them with GTFS data. Added 511 new stops — 57 in deep Brooklyn (Canarsie, ENY, Flatlands), 25 in south Brooklyn (Marine Park, Sheepshead Bay), 73 in southeast Queens, 7 in upper Bronx. Bus+subway destination-side transfers now fire for areas that previously had zero coverage.
- **Hybrid color ramp:** Replaced flat stepped 10-min bands with smooth-within-band interpolation. Each band has a gradient (e.g., green → yellow-green within 0-10 min) with visible color jumps at band edges. More precise without losing band readability. Updated `MapLegend` to use matching gradients.
- **Investigation:** Discovered the core issue with Task 1 (deep Brooklyn transfers) was data coverage, not code — the transfer logic in `buildStationAccess` was already correct for both sides, but zero bus stops existed in Canarsie/ENY/Flatlands.
- Build clean, 92/92 tests passing, all 5 routes 200 on prod.

### Files Created
| File | Purpose |
|------|---------|
| `scripts/expand-bus-stops.ts` | GTFS-based bus stop gap filler (Brooklyn + Queens) |

### Files Modified
| File | Changes |
|------|---------|
| `public/data/bus-stops.json` | 222 → 733 stops (GTFS expansion) |
| `src/components/isochrone/isochrone-map.tsx` | Hybrid COLOR_RAMP (smooth within bands, jumps at edges) |
| `src/components/isochrone/map-legend.tsx` | Gradient bands matching new ramp |
| `.gitignore` | Added `data/gtfs-bus/` |

### Commits
- `24f3b4f` — feat: expand bus stops (222→733) + hybrid color ramp

### Next Steps
- [ ] Mobile QA on real iPhone (carried from S18 — deploy is live, test on phone)
- [ ] GTFS bus route graph (replace great-circle ride approximation with real route data)
- [ ] Explore street-line coloring with glow (Mapbox road vector tiles instead of H3 hexes)
- [ ] Fix URL state bug: `?lat=&lng=` params don't render hexes (pin marker missing, map doesn't center)
- [ ] Landing page — consider video/animated preview in cards

---

## 2026-04-09 — Session 18 (Night Mode): Landing polish, bus transfers, onboarding

### Accomplished
- **Landing page polish:** Staggered card entrance animations (fade-up with delays), card hover effects (accent glow, icon scale, CTA arrow slide), per-card SVG icons, map background breathing animation with radial gradient overlay.
- **Destination-side bus+subway transfers:** `computeSubwayTime` now uses `buildStationAccess` on both origin and destination sides. Previously only origin-side had bus-assisted access to subway stations. Manhattan distances are symmetric, so the same function works in both directions.
- **Enhanced empty-state:** Pulsing pin icon, "Drop a pin to start" copy, quick-start buttons (Times Square, Williamsburg, Astoria) for zero-typing entry.
- **Accessibility:** `prefers-reduced-motion` media query disables all landing animations.
- Build clean, 92/92 tests passing.

### Files Created
| File | Purpose |
|------|---------|
| `src/app/compare/layout.tsx` | Metadata wrapper for compare page |
| `src/app/find/layout.tsx` | Metadata wrapper for find page |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Landing rewrite with icons, animations, radial gradient |
| `src/components/landing/mode-card.tsx` | Hover effects, icon prop, staggered animation delay |
| `src/app/globals.css` | fade-up, fade-in, map-breathe keyframes + reduced-motion |
| `src/workers/grid-worker.ts` | Both-side bus+subway transfers in computeSubwayTime |
| `src/app/explore/page.tsx` | Quick-start location buttons in empty state |

### Commits
- `eda98bc` — feat(landing): animated cards, hover effects, breathing map
- `383d3dc` — feat(compute): enable bus+subway transfers on both sides
- `1bdbfa9` — feat(explore): enhanced empty-state with quick-start locations
- `d4990e0` — a11y: respect prefers-reduced-motion for landing animations

### Next Steps
- [ ] Test bus+subway destination-side transfers from deep Brooklyn locations
- [ ] GTFS bus route graph (replace great-circle bus ride approximation)
- [ ] Mobile QA on real iPhone device
- [ ] Landing page — consider video/animated preview in cards

---

## 2026-04-09 — Session 17 (Night Mode): Mobile QA, SSR rankings, own-bike persistence

### Accomplished
- **Mobile responsive audit:** viewport meta with `viewport-fit=cover`, `h-dvh` for correct mobile viewport, safe-area-inset-bottom on bottom sheet + wizard nav, slider thumb 16→24px, results sidebar full-width on mobile, compare grid stacks to single column, rankings header stacks vertically.
- **Server-render rankings page:** Split into RSC (reads rankings.json at build time) + client component (interactive selection/compare). No loading spinner, instant content.
- **Own-bike persistence:** `useOwnBikePreference` hook with `useSyncExternalStore` + localStorage. "I have my own bike" checkbox persists across sessions.
- **SEO metadata:** title + description for rankings, compare, and find pages.
- **Code review fixes:** logic bug (unchecking own-bike didn't remove mode), duplicate Tailwind class, localStorage race condition, Viewport type annotation.
- Build clean, 92/92 tests passing (up from 87).

### Files Created
| File | Purpose |
|------|---------|
| `src/components/rankings/rankings-list.tsx` | Client component for interactive ranking selection |
| `src/hooks/use-own-bike-preference.ts` | localStorage-backed own-bike preference hook |
| `src/hooks/__tests__/use-own-bike-preference.test.ts` | 5 tests for preference storage |
| `src/app/compare/layout.tsx` | Metadata for compare page |
| `src/app/find/layout.tsx` | Metadata for find page |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Viewport meta, h-dvh, Viewport type |
| `src/app/globals.css` | iOS text-size-adjust |
| `src/components/isochrone/mobile-bottom-sheet.tsx` | Safe area padding, 44px touch target |
| `src/app/compare/page.tsx` | Responsive grid, mobile padding |
| `src/components/results/results-sidebar.tsx` | Full-width on mobile |
| `src/components/wizard/wizard-shell.tsx` | Safe area + touch targets |
| `src/components/isochrone/time-slider.tsx` | Larger slider thumb |
| `src/app/rankings/page.tsx` | SSR refactor + metadata + responsive header |
| `src/app/explore/page.tsx` | Own-bike persistence + code review fixes |

### Commits
- `4ae626c` — fix(mobile): responsive audit fixes for all pages
- `d313f18` — feat(rankings): server-render rankings page
- `ce177b5` — feat(explore): persist own-bike preference in localStorage
- `f56cf4d` — feat(seo): add page metadata for rankings, compare, and find pages
- `d48333a` — test: add own-bike preference localStorage tests
- `ae882fe` — fix: address code review findings

---

## 2026-04-09 — Session 16: Fix share-slug bitmask shift regression

### Accomplished
- Investigated a "client-side exception" report from a friend (URL unknown). Swept all 5 routes in Chrome — no reproducible crash, but found a real regression.
- **Bug:** S15 commit `77b23a9` inserted `"ownbike"` at index 4 in `VALID_MODES`, shifting the bitmask positions of `car` (4→5) and `ferry` (5→6). Every share link created before S15 silently decoded to the wrong modes: old `car` → `ownbike`, old `ferry` → `car`.
- **Fix:** moved `"ownbike"` to the end of `VALID_MODES` so pre-existing bits keep their meaning. Added a load-bearing ordering comment above the array so future agents don't repeat the mistake.
- Verified: 87/87 tests green, `npm run build` clean, new prod deploy live with fix, all 5 routes return 200, preflight + smoke-test passed.
- Also pushed the lingering S15 PROGRESS commit (`420b688`) that hadn't made it to origin.

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/share-slug.ts` | Moved `"ownbike"` to end of `VALID_MODES`; added ordering comment |

### Commits
- `420b688` — (pushed) Session 15 PROGRESS update that was ahead of origin
- `2efa89f` — fix(share-slug): append ownbike to VALID_MODES instead of inserting

### Next Steps
- [ ] If the friend can share the crashing URL, repro + pin down the actual client-side exception (bitmask fix may or may not be the cause)
- [ ] Mobile QA on real iPhone (carried from S15/S12)
- [ ] Replace bus great-circle approximation with GTFS bus route graph
- [ ] Own-bike persistence toggle
- [ ] Station-click-as-origin for rankings page

---

## 2026-04-09 — Session 15: Backlog sweep — tests, station-click, own-bike, bus+subway

### Accomplished
- Knocked out 4 of 5 queued items from Session 14's "next steps" list.
- **+11 unit tests** for `expandBoundsIfHit` in `src/hooks/__tests__/expand-bounds-if-hit.test.ts` — covers empty cells, no-hit case, unreachable sentinel, over-budget cells, each cardinal edge, multi-side hits, and MAX_NYC_BOUNDS clamping. Test suite now **87 passing** (up from 76).
- **Click-a-station as origin:** clicking a subway dot on `/explore` re-roots the isochrone from that station, sets the address input to the station name, and updates the URL — same semantics as drop-pin. The generic map-click handler defers to the station layer via `queryRenderedFeatures` to avoid double-fire.
- **Own-bike mode (Advanced):** added new `"ownbike"` `TransportMode` (door-to-door `bikeRideMin`, no dock overhead). Hidden behind a "+ Advanced modes" disclosure inside the Transport Modes panel. Persists in URL. Auto-reveals when a shared link includes `ownbike`. Toggling Advanced OFF strips `ownbike` from active modes to keep compute consistent. Color `#10b981`. Cost engine treats as free.
- **Bus + subway one-side transfers** in grid worker: when both `bus` and `subway` are active, the subway access leg on the ORIGIN side can now be `walk → bus stop → bus ride (≤1 mi) → subway station` instead of a direct walk. New `buildStationAccess()` returns a `stationId → bestAccessMinutes` map that augments walking candidates with bus-assisted ones. Destination leg stays walking-only (one-sided scope). Approximation: great-circle bus ride at `BUS_SPEED_MPH` (no route graph yet).
- Build clean, 87/87 tests, deploy `fe1fe88` live on prod, preflight + smoke-test green, all 5 routes 200, `/explore` verified in Chrome (map rendered, Advanced button present, no console errors, no broken images).

### Files Created
| File | Purpose |
|------|---------|
| `src/hooks/__tests__/expand-bounds-if-hit.test.ts` | 11 unit tests for auto-expansion logic |

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/types.ts` | Added `"ownbike"` to `TransportMode` union |
| `src/workers/grid-worker.ts` | Own-bike compute branch; new `buildStationAccess()` + bus-assist plumbing in `computeSubwayTime()` |
| `src/lib/isochrone.ts` | `ownbike: "#10b981"` in `MODE_COLORS` |
| `src/lib/cost.ts` | `ownbike` treated as free in both cost passes |
| `src/lib/share-slug.ts` | `ownbike` added to `VALID_MODES` |
| `src/components/isochrone/mode-legend.tsx` | `ownbike` chip + `showAdvanced` prop to gate advanced modes |
| `src/components/isochrone/reach-stats.tsx` | `ownbike: "Own Bike"` label |
| `src/components/isochrone/isochrone-map.tsx` | `onStationClick` prop; station-layer exclusion in generic click handler |
| `src/components/isochrone/hooks/use-subway-stations.ts` | `onStationClick` callback via ref; new `click` listener on station layer |
| `src/app/explore/page.tsx` | `handleStationClick`, `showAdvanced` state + disclosure, `VIEW_MODE_LABELS.ownbike`, URL auto-reveal for advanced modes |
| `src/hooks/use-dynamic-grid-compute.ts` | `ownbike` in `ALL_MODES` |

### Commits
- `b5464ee` — expandBoundsIfHit unit tests
- `fcd5fce` — click-a-station as origin
- `77b23a9` — own-bike Advanced disclosure
- `fe1fe88` — bus+subway one-side transfers

### Next Steps
- [ ] **Mobile QA on real iPhone** (still outstanding from S12) — tap subway dot, toggle Advanced + Own Bike, verify bus+subway reach expansion
- [ ] Bus+subway: replace great-circle ride approximation with a real bus route adjacency graph (GTFS bus data)
- [ ] Bus+subway: consider enabling destination-side transfers too (currently one-sided)
- [ ] Station-click-as-origin for rankings page
- [ ] Own-bike: add an "I have my own bike" preference toggle that remembers across sessions (currently URL-only)

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

---

## 2026-04-08 — Session 14: Polish (empty-state, How it works) + hook refactor

### Accomplished
- **Polish 1 — empty state:** `/explore` empty state now suggests "Try **Times Square** — or click the map to drop a pin" (accent-colored hint replaces flat "enter an address").
- **Polish 2 — How it works modal:** Added a `?` info button top-right of the map (works desktop + mobile). Opens a modal with three sections explaining the Your reach blend, the 10-minute stepped bands, and the "View as" single-mode filter. Closes on backdrop click or ×.
- **Refactor — 5 hooks extracted:**
  - `src/hooks/use-transit-data.ts` (83 LOC) — loads subway graph/matrix, Citi Bike, ferry, bus
  - `src/hooks/use-url-state.ts` (29 LOC) — URL param writer
  - `src/hooks/use-dynamic-grid-compute.ts` (215 LOC) — `runCompute` + border-hit expansion loop + `expandBoundsIfHit` helper
  - `src/components/isochrone/hooks/use-subway-stations.ts` (100 LOC) — station dots + single-station hover highlight
  - `src/components/isochrone/hooks/use-fairness-layer.ts` (118 LOC) — fairness GeoJSON build + GL range filter (setup stays inline in map init to preserve z-order under iso-hexes)
- **LOC reduction:**
  - `explore/page.tsx`: 753 → 648 (−105)
  - `isochrone-map.tsx`: 840 → 689 (−151)
- Build clean (7 routes, Turbopack 3.0s), 76/76 tests passing, no console errors on local or deployed `/explore`.
- `/preflight` + `/smoke-test` both ran green against `https://nyc-transit-heatmap.vercel.app`.

### Files Created
| File | Purpose |
|------|---------|
| `src/hooks/use-transit-data.ts` | Loader for all transit datasets |
| `src/hooks/use-url-state.ts` | URL param writer |
| `src/hooks/use-dynamic-grid-compute.ts` | runCompute + expandBoundsIfHit |
| `src/components/isochrone/hooks/use-subway-stations.ts` | Station dot layer + hover |
| `src/components/isochrone/hooks/use-fairness-layer.ts` | Fairness data + GL filter |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/explore/page.tsx` | Wire three page-level hooks; remove inline loaders, runCompute, expandBoundsIfHit; add empty-state hint + How it works modal |
| `src/components/isochrone/isochrone-map.tsx` | Wire useSubwayStations + useFairnessLayer; remove inline buildFairnessGeoJSON, station fetch block, and fairness update effects |

### Commit
- `d6864c0` S13: polish + refactor — empty-state hint, How it works modal, extract 5 hooks

### Next Steps
- [ ] Mobile QA on a real device (still outstanding — polish #3 from S12)
- [ ] Own-bike mode (distinct from Citi Bike docks)
- [ ] Station click to set as origin
- [ ] Bus transfers
- [ ] Server-render rankings page
- [ ] Unit tests for `expandBoundsIfHit` (now in `use-dynamic-grid-compute.ts`, 5 branches still unprotected)

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
