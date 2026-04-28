# NYC Transit Heatmap — Progress

> Older sessions (1–27) archived in `PROGRESS-archive.md`.

---

## Current State
**Last session:** 2026-04-28 — S32: Bug fixes — hex auto-render, geolocation, bus data rebuild, ViewAs walk-blend
**Next:**
- Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- Data-load failure UX
- Demo GIF + soft launch
**Branch:** main / clean

---

## Next Session Kickoff
**Mode:** shallow
**First action:** Attribution footer is simplest (no deps), demo GIF + soft launch is highest impact — pick one
**Open questions:** none
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
- [ ] Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- [ ] Data-load failure UX
- [ ] Record demo GIF + soft launch
- [ ] Consider extending design system to Rankings/Compare surfaces

---

## 2026-04-28 — Session 32: Bug fixes — hex auto-render, geolocation, bus data, ViewAs walk-blend

### Accomplished
- **Fixed hex fill not rendering on URL param page load** — added `needsReveal` defensive check in cells effect: if `cells.length > 0` and `fill-opacity` is stuck near 0 (React Strict Mode double-mount or URL-load timing), re-triggers the 800ms reveal animation
- **Added "Use my location" button** — crosshair icon below address field, calls `navigator.geolocation`, validates against NYC envelope (40.49–40.92 lat, -74.26 to -73.68 lng), drops pin, reverse geocodes, triggers compute; shows loading/error states inline
- **Rebuilt bus-stops.json from full GTFS** — old file had 733 sparsely-sampled stops (nearest Park Slope stop was 0.33mi, just outside 0.3mi threshold). New file: 5,978 stops from Brooklyn (4,599) + Queens (1,419) GTFS feeds with full route membership from stop_times join. B41 went from 9 → 107 stops, B67 from 6 → 84.
- **Fixed Bus/Ferry ViewAs showing no hexes** — was filtering to `times.bus/ferry` only (null for most cells). Changed to `min(walk, mode)` so full walkable area fills in; mode-colored cells show where transit beats walking.
- **Extended walk-blend to Subway ViewAs** — same logic: subway is also walk+train, not a pure door-to-door mode.
- **Added `scripts/rebuild-bus-stops.ts`** — reproducible GTFS → bus-stops.json pipeline

### Files Modified
| File | Changes |
|------|---------|
| `src/components/isochrone/isochrone-map.tsx` | `needsReveal` defensive fix; walk-blend ViewAs for subway/bus/ferry |
| `src/app/explore/page.tsx` | Use My Location button + handlers; updated ViewAs legend text |
| `public/data/bus-stops.json` | Rebuilt: 733 → 5,978 stops with full route data |
| `scripts/rebuild-bus-stops.ts` | New GTFS pipeline script |

### Preflight
- Build: ✅ clean (4.9s compile, TypeScript clean)
- Smoke test: ✅ deployed, all routes 200

### Next Steps
- [ ] Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- [ ] Data-load failure UX
- [ ] Demo GIF + soft launch

---

## 2026-04-27 — Session 30: Claude Design intake rewrite + reference screenshots

### Accomplished
- **Researched Claude Design** (Anthropic's prompt-to-prototype tool, launched 2026-04-17) — best practices: dense single-artifact prompts, explicit DO NOT lists, scope codebase ingestion to subdirectories (full repo times out), verify capture before iterating, separate quota from chat/Code limits.
- **Sequenced prompt rewrite** — original `brief.md` was a designer doc not a Claude Design prompt (6 deliverables in one shot, open questions read as instructions, no screenshots). Built `design-system/prompts/` with 8 paste-able files following the proven `[Artifact] for [audience]. [Content]. [Visual style]. [Constraints]` pattern, each with explicit DO NOT lists and "verification first" gates before generation.
- **Updated `brief.md`** with header note clarifying it's strategic context, not a paste-able prompt.
- **Captured 7 reference screenshots** for Claude Design ingestion:
  - Desktop (5): landing, explore (with heatmap @ Union Square), find-wizard-brutalist, rankings, compare-side-by-side
  - Mobile (2): explore-mobile-sheet (expanded), mobile-bottom-sheet (collapsed peek)
- **Solved 3 capture hurdles:**
  - agent-browser headless Mapbox WebGL failure → fixed with `--args "--use-gl=swiftshader,--enable-webgl,--ignore-gpu-blocklist,--enable-unsafe-swiftshader"`
  - claude-in-chrome `resize_window` only resizes the chrome window, not the page viewport — can't trigger Tailwind `md:` breakpoints (overturns S29 LEARNINGS.md note that automated mobile capture wasn't possible)
  - Workaround: Playwright with `devices['iPhone 15 Pro']` device emulation, installed fresh in `/tmp/pw-capture` (Playwright module path conflicts required isolated install)

### Files Modified
| File | Changes |
|------|---------|
| `design-system/brief.md` | Header note added: this is strategic context, not a paste-able prompt |
| `design-system/prompts/README.md` | New — sequence overview, iteration affordances, common pitfalls |
| `design-system/prompts/00-setup.md` | New — screenshot capture + project setup + verification gate |
| `design-system/prompts/01-direction.md` | New — Round 1: 3 visual identity options |
| `design-system/prompts/02-tokens.md` | New — Round 2: paste-able CSS tokens |
| `design-system/prompts/03-components.md` | New — Round 3: 7 primitive components |
| `design-system/prompts/04-explore.md` | New — Round 4: hero surface (5 sub-deliverables A–E) |
| `design-system/prompts/05-landing.md` | New — Round 5: re-hero with Find/Rankings hidden |
| `design-system/prompts/06-cleanup.md` | New — Round 6: footer + Rankings/Compare refresh |
| `design-system/screenshots/landing-desktop.png` | New — landing reference |
| `design-system/screenshots/explore-desktop-wide.png` | New — Explore with heatmap @ Union Square |
| `design-system/screenshots/explore-mobile-sheet.png` | New — mobile sheet expanded |
| `design-system/screenshots/mobile-bottom-sheet.png` | New — mobile sheet collapsed |
| `design-system/screenshots/find-wizard-brutalist.png` | New — Find wizard Step 1 (preserve target) |
| `design-system/screenshots/rankings-table.png` | New — Rankings table reference |
| `design-system/screenshots/compare-side-by-side.png` | New — Compare 2-up reference |

### Notes
- Skipped `/preflight` + `/smoke-test` — doc/screenshot session only, no `src/` changes.

### Next Steps
- [ ] Run `prompts/00-setup.md` verification → `01-direction.md` in Claude Design
- [ ] Pick a direction (MTA-canonical / Editorial / Time-gradient) — feeds Round 2 input
- [ ] Iterate through `02-tokens.md` → `06-cleanup.md`
- [ ] S28: Attribution footer (can ship in parallel — no design dependency)
- [ ] S28: Data-load failure UX
- [ ] S28: Record demo GIF + soft launch

---

## 2026-04-24 — Session 29: Design-system audit + Claude Design brief

### Accomplished
- **Kicked off full app redesign** with Claude Design. Session scope: set up the design system so Claude Design has ground-truth inputs to propose from.
- **Extracted design tokens** to `design-system/tokens.md` — canonical `@theme inline` vars, 7-mode transport palette, 12-stop travel-time ramp, 25+ MTA line colors, opacity ladder, radius/shadow/motion usage patterns. Flagged semantic gaps (no success/warning/muted/focus tokens; no shadow ramp) and which values are hardcoded vs tokenized.
- **Inventoried 40 component files** (Explore agent) → `design-system/components.md`. Grouped by surface (Landing / Explore / Find-Wizard / Find-Results / Rankings / Compare / Shared). Flagged 3-tier consolidation list: Button/Slider/Callout primitives (T1), Modal/Dropdown/Loading (T2), Wizard brutalist theme isolation + ModeLegend-vs-ModeToggles merge (T3).
- **Drafted `design-system/brief.md`** — project mission, audience, tone, what's working (preserve: dark map, Arial Black italics, cyan accent, 44px touch, Wizard brutalist), what's weak (inconsistent CTAs, no elevation system, Explore sidebar density, Rankings/Compare feel disconnected), priority deliverables (token proposal → Explore redesign → primitives → Landing re-hero → attribution → Rankings/Compare refresh).
- **Captured 5 desktop route screenshots** via claude-in-chrome at 1440×900 — landing, /explore, /find wizard, /rankings, /compare. Catalog at `design-system/screenshots/README.md` describes each + notes manual Chrome-DevTools workflow for mobile (Chrome MCP resize doesn't trigger Tailwind `md:` breakpoint).
- **Preflight + smoke-test ✓** — 120/120 tests, clean build, 9/9 routes 200 on prod, zero console errors, /api/og returning image/png.

### Files Modified
| File | Changes |
|------|---------|
| `design-system/tokens.md` (new) | Full design-token extraction with consolidation flags |
| `design-system/components.md` (new) | 40-file inventory with tiered consolidation recommendations |
| `design-system/brief.md` (new) | Claude Design intake — mission, audience, goals, constraints, voice |
| `design-system/screenshots/README.md` (new) | Screenshot catalog + mobile capture instructions |

### Next Steps
- [x] Hand off `design-system/*.md` + 5 desktop screenshots to Claude Design chat
- [x] When Claude Design returns proposal: review token + Explore redesign, decide scope (deferred — switched to building proper sequenced prompts in S30)
- [ ] S28 backlog still open: attribution footer, data-load UX, demo GIF, soft launch
- [x] Optional: manually capture mobile screenshots via Chrome DevTools device toolbar if Claude Design needs them (S30 found the automated path)

---

## 2026-04-23 — Session 28: Bug fixes + hide find/rankings from landing

### Accomplished
- **Defaulted street mode to glow** — changed lazy `useState` initializer in `isochrone-map.tsx` from `"colored"` → `"glow"` across all 3 return paths (localStorage read, existing value, fallback).
- **Fixed 401 noise from Mapbox Isochrone API** — removed all `fetchAllIsochrones` calls (walk/bike/car isochrones on every pin drop). Token doesn't have isochrone API access; calls were silently failing with 401 on every compute. Affected `explore/page.tsx`, `use-dynamic-grid-compute.ts`.
- **Removed dot indicator from mode legend** — stripped cyan `absolute` dot from active mode button (border color still indicates active state clearly).
- **Fixed transit trivia position + stable sizing** — moved `<TransitTrivia />` from between time-slider and Transport Modes to after Transport Modes. Added `min-h-[36px]` to text `<p>` so container height doesn't shift as short/long trivia strings cycle.
- **Fixed hexagon z-index (Mapbox layer order)** — street layers were added without `beforeId` (rendering above all labels). Restructured: streets added before hexes (both using `firstSymbol`), so hexes render above streets but below map labels. Water-mask/park-overlay still added after hexes to correctly mask them.
- **Hidden /find and /rankings from landing** — removed two `ModeCard` entries + `PreviewHex`/`PreviewRankings` imports; only Explore card remains. Simplified grid layout to single card.
- **Preflight ✓** (clean build, TypeScript clean). **Smoke test ✓** (5/5 routes 200).

### Files Modified
| File | Changes |
|------|---------|
| `src/components/isochrone/isochrone-map.tsx` | Default glow; Mapbox layer order fix (streets before hexes, both `firstSymbol`) |
| `src/app/page.tsx` | Remove find/rankings ModeCards + preview imports; single Explore card |
| `src/app/explore/page.tsx` | Remove `fetchAllIsochrones` calls; move `<TransitTrivia />` |
| `src/components/isochrone/transit-trivia.tsx` | `min-h-[36px]` on text `<p>` |
| `src/components/isochrone/mode-legend.tsx` | Remove active-state cyan dot |
| `src/hooks/use-dynamic-grid-compute.ts` | Remove `fetchAllIsochrones` import + calls |

### Commits
- `d9cfdbb` — Default street mode to glow instead of colored
- `16ac909` — Fix explore bugs + hide find/rankings from landing

### Next Steps
- [ ] Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- [ ] Data-load failure UX (surface GBFS/ferry/bus errors instead of silent fail)
- [ ] Record demo GIF + draft Twitter/LinkedIn copy + soft launch
