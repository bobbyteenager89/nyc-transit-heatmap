# NYC Transit Heatmap — Progress

> Older sessions (1–21) archived in `PROGRESS-archive.md`.

---

## Current State (2026-04-22, Session 26)

- Branch: `main` — clean, PR #2 merged + deployed. Live: https://nyc-transit-heatmap.vercel.app. Tests: 120/120.
- S26 shipped: SEO scaffold (robots.txt, sitemap, dynamic apple-icon), cold-start colored-streets fix (don't cache empty sample results), 50-60min purple contrast (#6a1b6a→#4a0a4a), web-vitals dev logger for local INP measurement.
- All 8 routes 200 on prod. Carried items from S23 closed.
- Soft-launch plan landed at `~/.claude/plans/let-s-build-a-plan-functional-newell.md`: S26 done, S27 (branches+mobile) and S28 (attribution+launch) pending.

---

## Next Session Kickoff
**Mode:** shallow
**First action:** Await Andrew's additional branch name, then execute S27: merge `ssr-rankings` + `phase2-landing-polish` + the new branch, run mobile polish pass (44px hit areas, touch-action on slider, test Find wizard at 375px).
**Open questions:**
- none
**Decisions pending:** Andrew mentioned one more branch to share before S27 starts.
**Ready plan:** `~/.claude/plans/let-s-build-a-plan-functional-newell.md` — S26 ✓, S27 + S28 pending

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
