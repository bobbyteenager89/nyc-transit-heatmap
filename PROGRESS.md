# NYC Transit Heatmap — Progress

> Older sessions (1–21) archived in `PROGRESS-archive.md`.

---

## Current State
**Last session:** 2026-04-24 — S29: Design-system audit + Claude Design brief (handoff ready)
**Next:**
- Await Claude Design proposal (tokens + Explore surface redesign), then implement
- While waiting: S28 backlog still open — attribution footer, data-load UX, demo GIF + soft launch
**Branch:** main / dirty (design-system/ untracked, will commit during /done)

---

## Next Session Kickoff
**Mode:** shallow
**First action:** Decide branch — either (a) integrate Claude Design output if ready, or (b) resume S28 backlog (attribution footer, data-load failure UX, demo GIF, soft launch)
**Open questions:**
- Did Claude Design return a token proposal + Explore redesign?
- Any of the S28 items shift priority given design direction?
**Decisions pending:** Claude Design direction (dark-glass refine vs new system)
**Ready plan:** `design-system/brief.md` is the spec seed when Claude Design output lands

---

## 2026-04-23 — Session 27: Branch merges + mobile polish + make-interfaces-feel-better

### Accomplished
- **`ssr-rankings` cherry-picked** — `/rankings` now ISR (`revalidate = 3600`), sync `readFileSync`, `RankingsList` colocated at `src/app/rankings/rankings-list.tsx`. Removed old `src/components/rankings/rankings-list.tsx`. Resolved conflict in `page.tsx`.
- **`phase2-landing-polish` cherry-picked** — landing cards show animated SVG previews (`PreviewIsochrone` rings pulse, `PreviewHex` hex shimmer, `PreviewRankings` bar-grow). `card-enter` staggered animations; old inline SVG icons removed. Resolved conflicts in `page.tsx`, `mode-card.tsx`, `globals.css`.
- **Deleted stale branch** `s24-inp-colored-streets` (already merged to main).
- **Mobile polish** — `touch-action: pan-x` on range input, thumb 24→28px, snap buttons get `min-w/min-h-[44px]`, mode tabs `min-h-[44px]`, chips `min-h-[44px] py-3`.
- **`/make-interfaces-feel-better` pass** — `text-wrap: pretty` on body; `tabular-nums` on time display; `transition-all` → specific props in 7 files (`transition-colors`, `transition-[width]`, `transition-[max-height]`, `transition-[transform,background-color,border-color,box-shadow]`); `active:scale-[0.96]` on 5 buttons; `active:scale-[0.98]` on landing ModeCards.
- **4 commits → PR #3** (`feat/s27-merge-mobile`). 120/120 tests, clean build, smoke test 200s.

### Files Modified
| File | Changes |
|------|---------|
| `src/app/rankings/page.tsx` | ISR revalidate 1h, readFileSync, colocated import |
| `src/app/rankings/rankings-list.tsx` (new) | Client component — checkbox selection + compare nav |
| `src/components/rankings/rankings-list.tsx` (deleted) | Replaced by colocated version above |
| `src/app/page.tsx` | card-enter animation, preview components, no SVG icon functions |
| `src/components/landing/mode-card.tsx` | preview prop, card-enter, hover:-translate-y-1, active:scale-[0.98] |
| `src/components/landing/preview-isochrone.tsx` (new) | Animated ring-pulse SVG |
| `src/components/landing/preview-hex.tsx` (new) | Animated hex-shimmer SVG |
| `src/components/landing/preview-rankings.tsx` (new) | Animated bar-grow SVG |
| `src/app/globals.css` | card-enter + ring-pulse + hex-shimmer + bar-grow keyframes; text-wrap:pretty on body |
| `src/components/isochrone/time-slider.tsx` | touch-action:pan-x, thumb 28px, 44px snap buttons, tabular-nums |
| `src/components/isochrone/mode-tabs.tsx` | min-h-[44px], transition-colors, active:scale-[0.96] |
| `src/components/ui/chip.tsx` | min-h-[44px], py-3, active:scale-[0.96] |
| `src/components/isochrone/mobile-bottom-sheet.tsx` | transition-[max-height] |
| `src/components/isochrone/play-button.tsx` | transition-colors, active:scale-[0.96] |
| `src/components/isochrone/reach-stats.tsx` | transition-[width] |

### Commits
- `bd03dfe` — feat(rankings): server-render /rankings page for LCP/SEO improvement
- `121a912` — feat(landing): Phase 2 — animated card previews and hover reveals
- `8bd6449` — chore: remove old components/rankings/rankings-list
- `d4a64f8` — fix(mobile): 44px touch targets on slider, mode tabs, and chips
- `5c1e1b2` — polish: make-interfaces-feel-better pass

### Next Steps
- [x] S27: Merge `ssr-rankings` + `phase2-landing-polish` branches
- [x] S27: Mobile polish — 44px hit areas on mode toggles, time-slider thumb size
- [ ] Merge PR #3 → main, verify deploy
- [ ] S28: Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- [ ] S28: Data-load failure UX (surface GBFS/ferry/bus loader errors instead of silent fail)
- [ ] S28: Record demo GIF + draft Twitter/LinkedIn copy + soft launch

---

## 2026-04-22 — Session 26: Soft-launch readiness — SEO scaffold, cold-start fix, 50-60min contrast

### Accomplished
- **Launch plan landed** via `/plan` — soft-launch strategy at `~/.claude/plans/let-s-build-a-plan-functional-newell.md`. 3 Explore agents ran in parallel to audit readiness, assess 3 queued branches, and deep-dive carried bugs.
- **SEO scaffold (launch blockers):** `src/app/robots.ts` (allow-all + sitemap pointer), `src/app/sitemap.ts` (5 routes w/ priority + weekly changefreq), `src/app/apple-icon.tsx` (dynamic 180×180 via ImageResponse — brand-matched ISO/NYC split w/ cyan #22d3ee). Skipped redundant `metadataBase` override on `/p/[slug]` (root layout propagates via Next.js inheritance; pattern proven by `/explore/layout.tsx`).
- **Cold-start colored-streets fix** (carried S23) — root cause was caching an empty sample when `street-overlay` layer hadn't rendered yet. Neither Explore agent option (A: bypass cache first read, B: split effect) addressed it. Real fix: only cache non-empty results at isochrone-map.tsx L863. 3-line change.
- **50-60min band contrast** (carried S23) — shifted `#5a0010→#2a0000` (near-black crimson, invisible on dark basemap) to `#6a1b6a→#4a0a4a` (deep purple). Preserves darkness monotonicity. Updated `map-legend.tsx` to match.
- **web-vitals dev logger** — `npm install web-vitals`, created `src/components/dev/vitals-logger.tsx` gated on `NODE_ENV === "development"`, dynamic-import to keep prod bundle clean. Logs INP/LCP/CLS with rating emoji. Enables local iPhone INP measurement via Safari Web Inspector (Speed Insights paywalled on free tier).
- **3 commits → PR #2** (`feat/s26-launch-blockers`): SEO scaffold, carried fixes, dev logger. Preview passed Vercel checks, squash-merged to main, branch deleted.
- **Preflight + smoke-test passed.** All 5 pages + 3 new routes (`/robots.txt`, `/sitemap.xml`, `/apple-icon`) return 200 on prod. No console errors. `/explore?lat=...&t=30&m=...` cold-start renders colored streets on zoom (fix verified).

### Files Modified
| File | Changes |
|------|---------|
| `src/app/robots.ts` (new) | Allow-all + sitemap reference |
| `src/app/sitemap.ts` (new) | 5 public routes with priority/changeFrequency |
| `src/app/apple-icon.tsx` (new) | Dynamic 180×180 brand icon via `next/og` ImageResponse |
| `src/app/layout.tsx` | Mount `<VitalsLogger />` after `<SpeedInsights />` |
| `src/components/dev/vitals-logger.tsx` (new) | Dev-only INP/LCP/CLS console logger |
| `src/components/isochrone/isochrone-map.tsx` | L863 only-cache-non-empty; L163 COLOR_RAMP purple shift |
| `src/components/isochrone/map-legend.tsx` | Legend band 6: `#6a1b6a→#4a0a4a` to match ramp |
| `package.json` + `package-lock.json` | `web-vitals@^5.2.0` added |

### Commits
- `541c141` — feat(seo): add robots.txt, sitemap, apple-touch-icon
- `6261e77` — fix(isochrone): cold-start colored-street sampling + 50-60min contrast
- `662598c` — feat(dev): web-vitals INP/LCP/CLS logger (dev-only)
- `3fb4470` — S26: Launch blockers + carried bug fixes (#2) [squash merge]

### Next Steps
- [ ] S27: Merge `ssr-rankings` + `phase2-landing-polish` + Andrew's additional branch (name TBD)
- [ ] S27: Mobile polish — 44px hit areas on mode toggles, time-slider thumb size, Find wizard touch testing
- [ ] S28: Attribution footer (MTA/Mapbox/Citi Bike/NYC Open Data)
- [ ] S28: Data-load failure UX (surface GBFS/ferry/bus loader errors instead of silent fail)
- [ ] S28: Record demo GIF + draft Twitter/LinkedIn copy + soft launch
- [ ] Deferred post-launch: `bike-to-station-combo` branch, onboarding localStorage persistence, `/about` page

---

## 2026-04-21 — Session 25: Post-review fix pass — a11y, ESLint/TS, deps, interface polish

### Accomplished
- **PR #1 verified merged** (S24 INP fix live on prod). Attempted iPhone INP check — Speed Insights paywalled ($10/mo); discussed manual test options.
- **Full review sweep via `/review`** — smoke test (5/5 routes 200), code/security/perf (4 issues), design review (1 a11y note), health check (8 stale branches, dep updates). ceoReview skipped (13d old, threshold 14d).
- **Fixed 3 ESLint/TS errors:** `use-media-query.ts` — corrected SSR hydration pattern (lazy init causes mismatch; correct: useState(defaultValue) + setMatches in effect); `citibike.ts` — typed GBFS response with `GbfsStation` interface; `url-state.ts` — replaced `as any` with `(CATEGORIES as readonly string[]).includes()`.
- **Fixed test fixture type drift:** Added `bus: null, ownbike: null` to `hex.test.ts` and `isochrone.test.ts` fixtures; `tsc --noEmit` now clean.
- **A11y + interface polish:** aria-labels on 10 button groups across `isochrone-map`, `mode-legend`, `destination-input`, `fairness-slider`, `hex-map`. Applied make-interfaces-feel-better: `active:scale-[0.96]` + `focus-visible:ring-2 focus-visible:ring-cyan-400` on all touched buttons, 40px hit areas, `antialiased` on body, `text-wrap: balance` on headings, `transition-all` → `transition-colors`.
- **Deleted 6 merged branches** (feat/imessage-viral-loop, night-mode-s17/s18, meetup-compare-mode, phase3-explore-delight, worktree-hex-heatmap-redesign). 3 queued branches deferred.
- **Patched 8 deps** (minor/patch only): vitest 4.1.5, react 19.2.5, mapbox-gl 3.22.0, next 16.2.4, tailwind 4.2.4. Held: typescript, eslint (major bumps).
- **Fixed sweep CLI** (`~/.claude/tools/review-sweep/src/sweep.ts`) — now discovers projects in all categories (personal, stale, complete), not just `data.active`.
- Used git worktrees + subagent-driven-development for implementation. 120/120 tests. Pushed to origin/main.

### Files Modified
| File | Changes |
|------|---------|
| `src/hooks/use-media-query.ts` | SSR-safe hydration: useState(defaultValue) + effect snapshot |
| `src/lib/citibike.ts` | GbfsStation interface, remove any |
| `src/lib/url-state.ts` | Category type narrowing without any |
| `src/lib/__tests__/hex.test.ts` | Add bus/ownbike to times fixture |
| `src/lib/__tests__/isochrone.test.ts` | Add bus/ownbike to makeCell |
| `src/components/isochrone/isochrone-map.tsx` | aria-labels on street mode buttons, scale/focus polish |
| `src/components/isochrone/mode-legend.tsx` | aria-labels, scale/focus, transition-colors |
| `src/components/isochrone/destination-input.tsx` | aria-labels on ×/category/frequency, hit areas, scale/focus |
| `src/components/isochrone/fairness-slider.tsx` | aria-labels on preset buttons, scale/focus |
| `src/components/results/hex-map.tsx` | aria-labels on category buttons, scale/focus |
| `src/app/layout.tsx` | antialiased class on body |
| `src/app/globals.css` | text-wrap: balance on headings |
| `package.json` + `package-lock.json` | 8 dep patches |
| `.gitignore` | .worktrees/ added |
| `~/.claude/tools/review-sweep/src/sweep.ts` | Flatten all categories for project discovery |

### Commits
- `ee93645` — fix: ESLint errors
- `8984d6a` — fix: use-media-query SSR hydration
- `27f12a7` — fix: test fixture type drift
- `e3718e3` — fix(a11y): aria-labels + make-interfaces-feel-better polish
- `a7be242` — fix: transition-all → transition-colors
- `4880be6` — chore: patch deps
- `9335c29` — S25: review fixes merge

### Next Steps
- [ ] Force first colored-street sample on URL-param load (carried S23) — source stays empty until first idle
- [ ] Revisit 50-60 min band (#5a0010 → #2a0000) vs dark basemap — reach edge fuzzy (carried S23)
- [ ] iPhone INP verification — open /explore on phone, pan/zoom (S24 fix live but unconfirmed)
- [ ] Decide on 3 queued branches: bike-to-station-combo, phase2-landing-polish, ssr-rankings

---

## 2026-04-18 — Session 24: INP perf fix — debounce idle + rAF-chunk colored-street sampling

### Accomplished
- Root cause INP 824ms: colored-street sampling ran synchronously on every idle event. Fix: debounce 150ms + rAF-chunk 400 features/frame + FEATURE_CAP 8000→3000 + bbox cache. PR #1 opened, merged 2026-04-21.
- Build clean. 120/120 tests.

### Files Modified
| File | Changes |
|------|---------|
| `src/components/isochrone/isochrone-map.tsx` | Debounced idle + rAF-chunk, FEATURE_CAP 8000→3000, bbox cache |

### Next Steps
- [x] Merge PR #1 → prod
- [ ] iPhone INP verification — carried
- [ ] Force first colored-street sample on URL-param load — carried
- [ ] 50-60 min band visibility — carried

---

## 2026-04-17 — Session 23: Colored streets as default + color ramp tuning

### Accomplished
- Locked `colored` as default. Hex opacity 0.35→0.50. Widened intra-band hue per band. Attempted/reverted teal-green start + near-zero highlight. Diagnosed "green outside range" as base Mapbox landuse. Legend synced.

### Files Modified
| File | Changes |
|------|---------|
| `src/components/isochrone/isochrone-map.tsx` | Default streetMode plain→colored, hex opacity, COLOR_RAMP |
| `src/components/isochrone/map-legend.tsx` | Band gradients synced |

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
- [ ] Hand off `design-system/*.md` + 5 desktop screenshots to Claude Design chat
- [ ] When Claude Design returns proposal: review token + Explore redesign, decide scope
- [ ] S28 backlog still open: attribution footer, data-load UX, demo GIF, soft launch
- [ ] Optional: manually capture mobile screenshots via Chrome DevTools device toolbar if Claude Design needs them
