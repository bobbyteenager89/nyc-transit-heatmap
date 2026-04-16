# NYC Transit Heatmap — Progress

> Older sessions (1–16) archived in `PROGRESS-archive.md`.

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

