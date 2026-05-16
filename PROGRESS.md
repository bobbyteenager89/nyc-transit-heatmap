# NYC Transit Heatmap — Progress

> Older sessions (1–27) archived in `PROGRESS-archive.md`.

---

## Current State
**Last session:** 2026-05-15 — S35: INP fix (warmGridWorker) + deleted /find /rankings /compare
**Next:**
- Widget polish — Andrew: "not good at all yet" (needs clarification: which widgets, what good means)
- Verify mobile on real phone (drop-pin, menu drawer, result card)
- Record demo GIF + soft launch
- /dead-code-scanner: hard-delete wizard/, results/, landing/ dead dirs
**Branch:** main / clean

---

## Next Session Kickoff
**Mode:** brainstorm
**First action:** Invoke `superpowers:brainstorming` to spec widget polish work
**Open questions:**
- Which widgets are "not good yet"? (mode tabs, legend, time slider, reach stats, result cards?)
- What does "good" look like — UX critique, visual redesign, or data completeness?
**Decisions pending:** /dead-code-scanner to clean wizard/, results/, landing/ dirs; build:rankings now orphaned
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
- [ ] Widget polish — clarify which widgets and what "good" means (Andrew: "not good at all yet")
- [ ] Verify mobile on real phone (drop-pin, menu drawer, result card)
- [ ] Record demo GIF + soft launch
- [ ] /dead-code-scanner to hard-delete wizard/, results/, landing/ dead dirs
- [ ] build:rankings now orphaned — either re-link rankings page or remove script
