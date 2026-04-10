# NYC Transit Heatmap — Progress

> Older sessions (1–16) archived in `PROGRESS-archive.md`.

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

