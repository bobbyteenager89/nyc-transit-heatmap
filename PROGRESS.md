# NYC Transit Heatmap — Progress

> Older sessions (1–21) archived in `PROGRESS-archive.md`.

---

## Current State (2026-04-21, Session 25)

- Branch: `main` — clean, pushed. Live: https://nyc-transit-heatmap.vercel.app. Tests: 120/120.
- S25 shipped: ESLint/TS fixes, test fixture type drift, a11y + interface polish (aria-labels, scale-on-press, focus rings), dep patches, sweep CLI fix. All merged + deployed.
- Carried: force first colored-street sample on URL-param load; 50-60 min band visibility vs dark basemap.
- iPhone INP check: Speed Insights paywalled. S24 fix is live but unconfirmed on real device.

---

## Next Session Kickoff
**Mode:** shallow
**First action:** Pick up carried items — cold-start colored-street sample on URL-param load and 50-60 min band check. Or iPhone INP test if phone available.
**Open questions:**
- none
**Decisions pending:** Whether to merge/close the 3 queued branches (bike-to-station-combo, phase2-landing-polish, ssr-rankings)
**Ready plan:** none

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
