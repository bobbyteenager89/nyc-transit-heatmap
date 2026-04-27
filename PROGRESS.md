# NYC Transit Heatmap — Progress

> Older sessions (1–27) archived in `PROGRESS-archive.md`.

---

## Current State
**Last session:** 2026-04-27 — S30: Claude Design intake rewrite (8 sequenced prompts) + 7 reference screenshots captured
**Next:**
- Run `prompts/00-setup.md` verification → `01-direction.md` in Claude Design
- Pick a direction, iterate through 02→06
- S28 backlog still open: attribution footer, data-load UX, demo GIF, soft launch
**Branch:** main / clean after this commit

---

## Next Session Kickoff
**Mode:** shallow
**First action:** Run `design-system/prompts/00-setup.md` verification reply in Claude Design, then paste `01-direction.md`. Pick a direction from the 3 returned, then proceed to `02-tokens.md`.
**Open questions:**
- Did Claude Design return 3 distinct directions per Round 1? Which direction (or remix) was picked?
- Any S28 items shifting priority given design direction?
**Decisions pending:** Visual direction (MTA-canonical / Editorial / Time-gradient — see `prompts/01-direction.md`)
**Ready plan:** `design-system/prompts/` — sequenced intake (README + 00-setup + 01–06)

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
