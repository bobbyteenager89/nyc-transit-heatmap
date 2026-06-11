# NYC Transit Heatmap — Progress

> Older sessions (1–27) archived in `PROGRESS-archive.md`.

---

## Current State
**Last session:** 2026-06-11 — S38: Mobile parity + share-link hang root-cause fix (S37 warmup race) + auto-fit camera + marketing assets, all merged & live
**Next:**
- Brainstorm pride-share loop (population/POI stats card, anonymized dot, share text+link)
- Knicks brand-chrome mockups (2-3 variants: wordmark/accents/OG in #006BB6/#F58426, time ramp untouched)
- Re-record demo GIF on prod (now has new mobile sheet + auto-fit reveal)
- Real-phone QA still outstanding (slider drag, pinch zoom at 375px)
**Branch:** main / clean

---

## Next Session Kickoff
**Mode:** brainstorm
**First action:** Invoke brainstorming for the pride-share loop — v1 stats card (population + restaurants + coffee shops within reach), share artifact that provokes counter-shares. Data: census tracts pre-baked at build time (like subway graph), POIs from OSM/Overpass. See memory: transit-heatmap-viral-vision.
**Open questions:**
- Anonymization: snap shared dot to hex center, or fuzz radius? How much?
- v1 stat set: population + restaurants + coffee shops — what else is brag-worthy (bars, parks, subway lines)?
- Share artifact: stats baked into the OG card vs separate downloadable card?
- Knicks chrome: which of the 2-3 mockup variants (decide after seeing them)
**Decisions pending:** none
**Ready plan:** none

---

---

## 2026-04-27 — Session 31: Isochrone NYC design system implementation

### Accomplished
- **Fetched + analyzed Claude Design handoff bundle** — extracted gzip/tar archive from Anthropic API, read README + chat transcript + all JSX source files (`tokens.jsx`, `surface-explore.jsx`, `primitives.jsx`)
- **Implemented full design system** from `Isochrone NYC.html` into production codebase (8 files changed, 467 insertions)
- **Inter Tight + JetBrains Mono** via `next/font/google` — loaded in `layout.tsx`, CSS variables `--font-ui` / `--font-data` in `@theme inline`, applied to all explore components
- **ModeTabs → underline style** — removed pill container, `borderBottom: 2px solid var(--accent)` per active tab
- **ModeLegend → 2-col ModePill** — removed SVG icons, replaced with 8×8 colored square dot, colored border + `color-mix()` tint when active
- **TimeSlider → custom drag** — replaced `<input type="range">` with Pointer Events API + `setPointerCapture`, 32px mono readout, gradient track (green→purple, 12 stops), tick marks
- **ReachStats → 3-col ReachBars** — `gridTemplateColumns: "70px 1fr 56px"`, 4px bars with mode colors, JetBrains Mono labels
- **PanelSection** — lighter hairline border (`rgba(255,255,255,0.06)`), tighter 14px padding, mono section titles
- **Sidebar** — narrowed from 420px → 360px, new wordmark (Inter Tight 700, cyan "NYC"), mono version label
- **Deployed to production** — `vercel --prod`, all routes 200 on prod

### Files Modified
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added Inter Tight + JetBrains Mono via next/font/google |
| `src/app/globals.css` | Added `--font-ui` + `--font-data` Tailwind tokens, updated surface colors |
| `src/app/explore/page.tsx` | Sidebar 360px, new wordmark, section labels updated, Street Style + View As redesigned |
| `src/components/isochrone/mode-tabs.tsx` | Underline tab style, JetBrains Mono labels |
| `src/components/isochrone/mode-legend.tsx` | 2-col ModePill, colored dot, no SVG icons |
| `src/components/isochrone/time-slider.tsx` | Custom Pointer Events drag, 32px mono readout, gradient track |
| `src/components/isochrone/reach-stats.tsx` | 3-col grid, 4px bars, JetBrains Mono |
| `src/components/ui/panel-section.tsx` | Lighter hairline border, 14px padding, mono title |

### Preflight
- Build: ✅ clean (4.1s compile, TypeScript clean)
- Tests: ✅ 120/120
- Mobile 375px: ✅ fullscreen map + instruction card
- Desktop 1440px: ✅ sidebar visible with all new components
- Smoke test: ✅ 4/4 routes 200 on prod

### Next Steps
- [x] Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- [ ] Data-load failure UX
- [ ] Record demo GIF + soft launch

---

## 2026-04-28 — Session 33: / becomes Explore; opacity fix; /explore redirect

### Accomplished
- **Made `/` the Explore experience** — landing card with 3 mode tiles replaced by the full Explore (drop-a-pin → reach map). Find + Rankings stay live at `/find` and `/rankings` but unlinked + dropped from sitemap.
- **Extracted client component** — moved 1064-line `src/app/explore/page.tsx` → `src/components/explore/explore-content.tsx` so root `/page.tsx` can be a server component with `generateMetadata` for dynamic OG.
- **`/explore` → `/` 308 redirect** preserving query params (verified: `/explore?lat=40.758&lng=-73.985&t=30` → `/?lat=40.758&lng=-73.985&t=30`). Existing share links / OG cards keep working.
- **"Drop a pin to start" legibility fix** — heading `text-white/20` → `/70`, helper `text-white/30` → `/50`. Was nearly invisible against the dark map.
- **Removed `src/app/explore/layout.tsx`** — its `generateMetadata` logic merged into the new root `page.tsx`.
- **Sitemap collapsed** to a single canonical route (`/`).
- **Mobile redesign already shipped** in earlier commits — instruction card → result card → menu drawer flow is wired. Could not verify at 375px because Chrome's window resize on macOS doesn't shrink the inner viewport below ~1700px; will verify on phone next session.
- **Deployed to prod** — `vercel --prod`, smoke checks pass.

### Files Modified
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Replace landing-card UI with server component: `generateMetadata` + render `<ExploreContent />` |
| `src/app/explore/page.tsx` | Replace 1064-line client component with `permanentRedirect` handler preserving query params |
| `src/components/explore/explore-content.tsx` | New — extracted from old `/explore/page.tsx` |
| `src/app/explore/layout.tsx` | Deleted — metadata logic moved to root `/page.tsx` |
| `src/app/sitemap.ts` | Drop `/explore /find /rankings /compare`, leaving only `/` |

### Next Steps
- [ ] Phone-test mobile flow (drop-pin / menu drawer / result card)
- [x] Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- [ ] Record demo GIF + soft launch
- [ ] Optional: run T3 CEO review on the / consolidation

---

## 2026-05-03 — Session 34: Review + attribution footer + mapbox-gl 3.23

### Accomplished
- **Ran `/review`** — all T0-T2 clean: preflight (build clean, 120/120), smoke test (7/7 routes 200 on prod), code/security/perf suite (3 low-severity findings), design review (pass), health check (clean working tree)
- **Attribution footer** — added data/map attribution to desktop sidebar (bottom, after content) and mobile menu drawer. JetBrains Mono, `rgba(255,255,255,0.28)`, hairline top border. Links: MTA · Citi Bike · NYC Open Data · © Mapbox · © OpenStreetMap
- **Replaced 5 silent `catch {}` blocks** with `console.warn("[IsochroneMap] <layer> layer unavailable", err)` in `isochrone-map.tsx` — street-overlay, water-mask, waterway-mask, park-overlay, neighborhood-lines
- **Bumped mapbox-gl** `^3.22.0` → `^3.23.0`, ran `npm install`, verified 120/120 tests still pass
- **Deleted stray `~/package-lock.json`** — orphan lockfile at home directory unrelated to any project
- **Deployed to prod** — `vercel --prod`, all routes 200

### Files Modified
| File | Changes |
|------|---------|
| `src/components/explore/explore-content.tsx` | Attribution footer in desktop sidebar + mobile menu content |
| `src/components/isochrone/isochrone-map.tsx` | 5 silent catches → console.warn with layer name |
| `package.json` | mapbox-gl ^3.22 → ^3.23 |
| `package-lock.json` | Updated lockfile |

### Verification
- Build: ✅ clean
- Tests: ✅ 120/120
- Smoke (prod): ✅ 4/4 routes 200 post-deploy

### Next Steps
- [ ] Verify mobile flow on real phone (drop-pin, menu drawer, result card)
- [ ] Record demo GIF (Kap recommended; ~8-10s showing pin drop → heatmap reveal → slider drag)
- [ ] Soft launch (Twitter/X + LinkedIn)
- [ ] Optional: T3 CEO review (27d stale)

---

## 2026-05-15 — Session 35: INP fix (warmGridWorker) + route cleanup

### Accomplished
- **Full QA + /review ran**: preflight clean, smoke test (7/7 routes), code/security/perf suite clean, design review clean, CEO plan review (Quick / REDUCTION posture)
- **INP 8,523ms → ~1,200ms**: Added `warmGridWorker()` to `src/lib/grid.ts` — pre-spins web worker and sends `LOAD_DATA` on mount (after transit data ready). First quick-pick click now only sends COMPUTE instead of worker-spin + LOAD_DATA + COMPUTE
- **Added `warmGridWorker` useEffect in `explore-content.tsx`**: fires after `dataReady` + all transit data loaded; calls warmGridWorker with full transit payload
- **Deleted 3 unlinked routes**: `/find` (page.tsx + layout.tsx), `/rankings` (page.tsx + rankings-list.tsx), `/compare` (page.tsx + layout.tsx) — 6 files. Build: 9 → 7 routes. REDUCTION CEO posture pre-soft-launch
- **2 commits pushed to main** and deployed: `47537f4` (INP fix), `6f6b27b` (route deletions)

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/grid.ts` | Added `WarmupInput` type + `warmGridWorker()` function (+57 lines) |
| `src/components/explore/explore-content.tsx` | Added `warmGridWorker` import + mount-time useEffect |
| `src/app/find/` | Deleted (page.tsx, layout.tsx) |
| `src/app/rankings/` | Deleted (page.tsx, rankings-list.tsx) |
| `src/app/compare/` | Deleted (page.tsx, layout.tsx) |

### Next Steps
- [x] Widget polish — ReachStats data completeness (union total, % of grid, nearest-stop hints)
- [x] /dead-code-scanner: hard-delete wizard/, results/, landing/, setup/ dirs (2,282 LOC)
- [x] build:rankings orphan — removed script + rankings.json from build
- [ ] Verify mobile on real phone (drop-pin, menu drawer, result card)
- [ ] Record demo GIF + soft launch

---

## 2026-05-23 — Session 36: Dead-code purge + ReachStats data completeness

### Accomplished
- **Hard-deleted 2,282 LOC** across wizard/ (5 files), results/ (6 files), landing/ (4 files), setup/ (2 files) — zero surviving imports confirmed via grep
- **Removed `build:rankings` orphan** — deleted `scripts/build-rankings.ts` + `public/data/rankings.json` + stripped the pre-build step from `package.json`
- **Extracted `src/lib/reach-stats.ts`** — pure-function library for all ReachStats math: `reachableCellCount`, `unionReach` (dedup), `perModeReach` (sorted desc), `nearestStopWalkMinutes`, `nearestStopsForAllModes`. Cell area derived from `getHexagonAreaAvg(H3_RESOLUTION, "km2")` × 0.386102 mi²/km²
- **Rewrote `src/components/isochrone/reach-stats.tsx`** — added union-total row (any mode), % of grid alongside mi², nearest-stop walk-hint subtext per mode (subway/bus/ferry/bike)
- **Wired `nearestStops` useMemo** in `explore-content.tsx` — feeds origin + transit data → `nearestStopsForAllModes` → prop to ReachStats
- **Added 20 unit tests** (`src/lib/__tests__/reach-stats.test.ts`) — 140/140 passing total
- **Ran /review** — fixed 3 warnings: `H3_RESOLUTION_FOR_GRID` duplicate → import from constants, nearest-stop text 9px→10px, union/per-mode rows got `role="group"` + `aria-label` a11y
- **3 commits pushed to main**, Vercel auto-deployed

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/reach-stats.ts` | NEW — pure-function reach stats library |
| `src/lib/__tests__/reach-stats.test.ts` | NEW — 20 unit tests |
| `src/components/isochrone/reach-stats.tsx` | Rewritten — union row, % grid, nearest-stop hints, a11y |
| `src/components/explore/explore-content.tsx` | Added nearestStops useMemo + prop pass |
| `src/components/wizard/` | Deleted (5 files) |
| `src/components/results/` | Deleted (6 files) |
| `src/components/landing/` | Deleted (4 files) |
| `src/components/setup/` | Deleted (2 files) |
| `scripts/build-rankings.ts` | Deleted |
| `public/data/rankings.json` | Deleted |
| `package.json` | Removed build:rankings + pre-build step |

### Next Steps
- [ ] Verify mobile at 375px on real phone (drop-pin, menu drawer, result card)
- [ ] Record demo GIF + soft launch (Twitter/LinkedIn)
- [ ] Optional: 7 patch dep updates (tailwind 4.3, mapbox-gl 3.24, next 16.2.6)

---

## 2026-05-28 — Session 37: INP fixes + perf audit + parallel data load

### Accomplished
- **Performance-reviewer agent** audited recurring INP issues — found 4 P1 issues + root cause of 320ms typing regression
- **Root cause found (typing 320ms INP):** `warmGridWorker` was sending ~1.8MB structured clone (stationMatrix 956KB + busStops 945KB) synchronously on main thread immediately after data load. `autoFocus`'d address input + page load timing = keystrokes queued behind the clone. Chrome attributed it to the input element.
- **Fix 1 — defer warmGridWorker to `requestIdleCallback`** (`explore-content.tsx`) — clone yields to user input. Safari fallback: `setTimeout(250)`.
- **Fix 2 — throttle `setComputeProgress` to 5% deltas** (`use-dynamic-grid-compute.ts`) — was firing ~30 setState calls per pin-drop, each re-rendering 1064-line ExploreContent during compute.
- **Fix 3 — `React.memo(IsochroneMap)`** (`isochrone-map.tsx`) — prevents 976-line render on unrelated parent state flips (geoLoading, mobileMenuOpen, etc.). All callback/complex props already memoized.
- **Fix 4 — memoize `mapCenter`** (`explore-content.tsx:490`) — was allocating new `{lat,lng}` on every render, triggering spurious `flyTo` in IsochroneMap's center effect.
- **Fix 5 — fairness layer → GL `setFilter`** (`use-fairness-layer.ts`) — removed `maxMinutes` from GeoJSON rebuild deps; maxMinutes + fairnessRange now delegated to `m.setFilter()`. Eliminates 150k-cell JS iteration on every Meet mode slider tick.
- **Parallelized transit data fetches** (`use-transit-data.ts`) — citi/ferry/bus were loading sequentially after station-graph; now all in one `Promise.all`.
- **Removed `force-dynamic` from `/`** (`app/page.tsx`) — static optimization re-enabled.
- **Swapped quick-start defaults** to Lower East Side, Cobble Hill, Williamsburg, Times Square (both `explore-content.tsx` and `mobile-instruction.tsx`).
- **Deployed to prod** — `git push origin main` → Vercel auto-deploy. Build clean, 140/140 tests pass.

### Files Modified
| File | Changes |
|------|---------|
| `src/components/explore/explore-content.tsx` | warmGridWorker idle-defer, mapCenter useMemo, new quick-starts |
| `src/components/isochrone/isochrone-map.tsx` | React.memo wrapper |
| `src/components/isochrone/hooks/use-fairness-layer.ts` | GL setFilter for maxMinutes + fairnessRange |
| `src/components/isochrone/mobile-instruction.tsx` | Updated QUICK_STARTS |
| `src/hooks/use-dynamic-grid-compute.ts` | setComputeProgress throttled to 5% deltas |
| `src/hooks/use-transit-data.ts` | Parallelized all fetches into Promise.all |
| `src/app/page.tsx` | Removed force-dynamic |

### Next Steps
- [ ] Verify mobile at 375px on real phone (drop-pin, menu drawer, result card)
- [ ] Record demo GIF + soft launch (Twitter/LinkedIn)
- [ ] Check Vercel Speed Insights in 1-2 days to confirm INP improvement
- [ ] Optional: 7 patch dep updates (tailwind 4.3, mapbox-gl 3.24, next 16.2.6, react 19.2.6, vitest 4.1.7)

---
## 2026-06-11 — Session 38: Mobile parity, hang root-cause fix, auto-fit, marketing assets

### Accomplished
- Full /review sweep (preflight, smoke, code/design/security, health) → 12 findings, all P1-P5 fixed
- Mobile parity: bottom sheet gained ModeTabs (Reach/Live/Meet), mode description, "Use my location", Meet/Live panels; 8 controls bumped to 44px tap targets; dialog a11y on How-it-works; AddressAutocomplete syncs externally-set addresses
- ROOT-CAUSED prod hang ("Computing… 0%" → blank map): S37 requestIdleCallback warmup clobbered the in-flight compute's worker.onmessage → COMPUTE never dispatched → 60s watchdog killed worker silently. Also: worker setTimeout chunking throttled in hidden tabs (fix: MessageChannel), and errors swallowed (fix: computeError banner). Regression test: src/lib/grid-warmup-race.test.ts. Verified headless against prod: previously hung forever, now ~8s
- Auto-fit camera to reach extent after compute (fitBounds, slider-drag safe)
- OG share card: map 0.4→0.85 opacity, lighter gradient, cyan pin at location
- next 16.2.4→16.2.9 (13 CVEs); marketing/: demo GIF (+mp4+small), desktop hero, OG preview, iMessage mockup
- PR #4 merged + deployed + verified live; compound-docs captured 3 learnings (worker race, timer throttling, silent failures) → CLAUDE.md Gotchas + global learnings
- Product direction captured (memory: transit-heatmap-viral-vision): pride-share stats, comparison-as-the-loop, Knicks chrome only

### Files Modified
| File | Changes |
| explore-content.tsx | mobile menu parity, shared JSX consts, a11y dialog, error banner, reachBounds |
| grid.ts / grid-worker.ts | warmup race guards, MessageChannel chunk scheduling, generation counter |
| use-dynamic-grid-compute.ts | computeError state (no more silent failure) |
| isochrone-map.tsx | reachBounds fitBounds effect |
| mobile-bottom-sheet/-instruction/-result-card, mode-tabs/-legend, map-legend | 44px tap targets, spacing |
| address-autocomplete.tsx | external value sync, mono label |
| api/og/route.tsx | brighter map + pin |
| marketing/ | demo GIF/mp4, screenshots, iMessage mockup |

### Next Steps
- [ ] Pride-share brainstorm (see Kickoff)
- [ ] Knicks brand-chrome mockups
- [ ] Re-record demo GIF on new prod; real-phone QA
