# NYC Transit Heatmap — Progress

> Older sessions (1–27) archived in `PROGRESS-archive.md`.

---

## Current State
**Last session:** 2026-06-11 — S39: Pride-share loop + Knicks chrome + stats OG card + slider jank perf fix
**Next:**
- Re-record marketing/ assets (stale — predates pride card + Knicks chrome + auto-fit reveal)
- Real-phone QA still outstanding (375px slider drag, pinch zoom)
- Optional: T3 CEO review (64d stale)
**Branch:** main / clean

---

## Next Session Kickoff
**Mode:** shallow
**First action:** Ask Andrew what's next — re-recording marketing/ or real-phone QA or new feature
**Open questions:**
- Re-record demo GIF now that prod has pride card + Knicks chrome + auto-fit reveal?
- Real-phone QA (375px slider drag, pinch zoom) — any device available?
**Decisions pending:** none
**Ready plan:** none

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

---

## 2026-06-11 — Session 39: Pride-share loop + Knicks chrome + slider jank perf fix

### Accomplished
- **Pride-share loop** (end-to-end): `scripts/build-pride-data.ts` fetches Census CenPop2020_Mean_BG (no API key) + Overpass OSM POIs/parks → `public/data/pride-population.json` + `pride-pois.json` + `pride-parks.json` (res-9 keyed, committed)
- **`src/lib/subway-lines.ts`** — `LINE_COLORS`, `normalizeLine()` (6X→6, GS/FS/H→S), `sortLines()`, `lineTextColor()`
- **`src/lib/pride-stats.ts`** — `computePrideStats` + `precomputeCellParents` (perf); 6 unit tests in `pride-stats.test.ts`; 148/148 tests pass
- **`src/lib/pride-data.ts`** + `src/hooks/use-pride-tables.ts` — lazy load + `requestIdleCallback` defer
- **`src/components/isochrone/pride-stats.tsx`** — sidebar panel: population, restaurants, cafes, bars, parks, subway line bullets
- **`src/app/api/og/route.tsx`** rewritten — stat params (pop/rest/cafe/bar/park/lines), `hashFuzz()` for deterministic pin offset, Knicks split-bar mark, 3-col stats grid + line bullets row
- **`src/app/p/[slug]/page.tsx`** — forwards stat params from searchParams to OG URL
- **Knicks variant-C chrome** — split-bar mark (5×22 gradient #006BB6/#F58426, borderRadius 2) in site wordmark; "NYC" span → `#F58426`; same mark on OG card
- **Snap-then-fuzz anonymization** — share origin snapped to res-8 centroid; visual-only hashFuzz pin on OG card
- **Perf fix (slider jank)**: `precomputeCellParents` memoized on `cells` only (hoist WASM calls out of tick path: 71ms → 6.8ms); `useDeferredValue(maxMinutes)` decouples slider readout + GL filter (immediate) from stat panel recompute (lower priority)
- **10 commits pushed to main**, deployed to prod (`a067ce8`); build clean, 148/148 tests

### Files Modified
| File | Changes |
|------|---------|
| `scripts/build-pride-data.ts` | NEW — Census + Overpass build script |
| `public/data/pride-*.json` | NEW — generated res-9 tables (population, pois, parks) |
| `src/lib/subway-lines.ts` | NEW — LINE_COLORS, normalizeLine, sortLines, lineTextColor |
| `src/lib/pride-stats.ts` | NEW — computePrideStats + precomputeCellParents |
| `src/lib/pride-stats.test.ts` | NEW — 6 unit tests |
| `src/lib/pride-data.ts` | NEW — data loaders + buildStationLineIndex |
| `src/hooks/use-pride-tables.ts` | NEW — requestIdleCallback deferred load |
| `src/components/isochrone/pride-stats.tsx` | NEW — sidebar stats panel |
| `src/components/explore/explore-content.tsx` | Knicks chrome, prideStats memos, deferredMaxMinutes, shareLink with stat params |
| `src/app/api/og/route.tsx` | Rewritten — stats panel, hashFuzz pin, Knicks chrome |
| `src/app/p/[slug]/page.tsx` | Forward stat params to OG URL |

### Next Steps
- [ ] Re-record marketing/ assets (now stale — predates pride card + Knicks chrome)
- [ ] Real-phone QA (375px slider drag, pinch zoom)
- [ ] Optional: T3 CEO review (64d stale)
