# NYC Transit Heatmap — Progress

> Older sessions (1–6) archived in `PROGRESS-archive.md`.

---

## 2026-04-06 — Session 7: Analytics, Rankings Flow, Pre-Computation, Cleanup

### Accomplished
- Verified Mapbox Isochrone API 401 resolved — token scope now valid, walk/bike/car contours working
- Added `@vercel/analytics` to root layout for usage tracking
- Built rankings → compare flow: checkbox selection (up to 3) on ranking cards, cyan highlight, "Compare N neighborhoods" button that navigates to `/compare?n=slug1,slug2`
- Pre-computed rankings as static JSON at build time — new `scripts/build-rankings.ts` generates `public/data/rankings.json` (4KB vs 1MB+ client fetch). Rankings page rewritten to fetch static data.
- Fixed critical review finding: build script had divergent constants (WALK_SPEED=3.1, SUBWAY_MAX_WALK_MI=0.75 vs canonical 3.0/1.5) — Astoria was incorrectly dropped from rankings
- Changed "Avg Commute" → "Avg Subway Commute" on compare page for accuracy
- Added error handling to `bus.ts` `loadBusData` with graceful fallback to empty stops
- Ran full review suite (code, security, performance) — 1 critical found and fixed
- 62 tests passing, clean build, 1 commit, deployed to Vercel

### Files Created
| File | Purpose |
|------|---------|
| `scripts/build-rankings.ts` | Build-time neighborhood ranking computation |
| `public/data/rankings.json` | Pre-computed rankings (25 neighborhoods, 4KB) |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added `@vercel/analytics` Analytics component |
| `src/app/rankings/page.tsx` | Rewritten — static JSON fetch, checkbox selection, compare button |
| `src/app/compare/page.tsx` | "Avg Commute" → "Avg Subway Commute" label |
| `src/lib/bus.ts` | Added `res.ok` check with fallback to empty stops |
| `package.json` | Added `@vercel/analytics`, `build:rankings` script, pre-build step |

### Next Steps
- [x] Fix Mapbox token exposure in landing page server-rendered HTML — done S8
- [ ] Investigate street-following heatmap colors (paint road segments by travel time)
- [ ] Server-render rankings page (eliminate client fetch waterfall for static data)
- [ ] Fix find page ResultsSidebar double-mount (desktop + mobile both render)

---

## 2026-04-07 — Session 8: Fix P1 Mapbox token exposure

### Accomplished
- Replaced interpolated `NEXT_PUBLIC_MAPBOX_TOKEN` in landing page SSR HTML with a static `/public/landing-map.png` baked from the Mapbox Static API (1280×820@2x, 1.7MB)
- Verified on production: token string absent from HTML (`html.includes('access_token') === false`), background resolves to `/landing-map.png`
- Build clean, 62 tests passing, zero console errors on live deploy

### Files Modified
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Removed Mapbox Static API URL + token interpolation; now references `/landing-map.png` |
| `public/landing-map.png` | New — pre-rendered dark Mapbox static map for landing background |

### Next Steps
- [x] iMessage viral loop (short URLs + ShareSheet + /p/[slug] recipient page) — done S9
- [ ] Investigate street-following heatmap colors
- [ ] Server-render rankings page
- [ ] Fix find page ResultsSidebar double-mount

---

## 2026-04-07 — Session 9: iMessage Viral Loop (short URLs + ShareSheet + recipient page)

### Accomplished
- Ran CEO product review — scoped a 3-phase plan; user picked "polish + keep surfaces + full iMessage viral loop"
- Wrote implementation plan: `docs/superpowers/plans/2026-04-07-imessage-viral-loop.md` (5 tasks, ~6 files)
- Task 1: `src/lib/share-slug.ts` — stateless binary (base64url) encoder/decoder for ShareParams (lat/lng/t/m/address). Subagent upgraded from JSON encoding (102-char slugs) to binary fixed-point (34-char slugs) to pass the <60-char test. 6 unit tests
- Task 2: `src/app/p/[slug]/page.tsx` + `recipient-cta.tsx` — recipient landing page with `generateMetadata()` for dynamic OG unfurl (title = `[address] — [t] min reach`), CTA navigates to `/explore` with sender params preloaded (via `?compare=[slug]`)
- Task 3: `src/components/share/share-sheet.tsx` — Web Share API (`navigator.share`) → clipboard → mailto fallback chain. AbortError (user cancel) is silent. Bonus unit test file added by implementer
- Task 4: Replaced existing raw "Copy Link" button in `src/app/explore/page.tsx` (lines 433-442) with ShareSheet using `/p/[slug]` short URL. First attempt targeted wrong file (find's results-sidebar) — reverted and redid against explore
- Task 5: Merged to main, deployed, verified end-to-end via Claude in Chrome — tab title renders dynamically, h1 = "Shared Reach", CTA = "Drop your pin →", OG + Twitter meta tags present
- Executed via subagent-driven development (4 implementer subagents, 1 spec reviewer, 1 manual revert/redo). 77 tests passing (up from 71 → 6 new share-slug tests + share-sheet tests)

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/share-slug.ts` | Stateless binary base64url encoder/decoder for share params |
| `src/lib/share-slug.test.ts` | 6 unit tests (round-trip, clamping, filtering, malformed input, truncation) |
| `src/app/p/[slug]/page.tsx` | Recipient landing (server component + `generateMetadata`) |
| `src/app/p/[slug]/recipient-cta.tsx` | Client CTA component with "Drop your pin →" link |
| `src/components/share/share-sheet.tsx` | Reusable share button with Web Share API + fallbacks |
| `src/components/share/share-sheet.test.ts` | Share sheet unit tests |
| `docs/superpowers/plans/2026-04-07-imessage-viral-loop.md` | Implementation plan |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/explore/page.tsx` | Removed orphaned `copyLabel` state + raw clipboard button; wired ShareSheet with short `/p/[slug]` URL |

### Deferred (from CEO review)
- **Phase 2: Landing polish** — animated 3-card previews, hover map reveal
- **Phase 3: Explore delight sprinkles** — reach race play button, subway line color hover, trivia overlays, "worst commute" inverted gradient toggle
- **"You vs. Me" meetup mode** — intersection of two isochrones (would use `?compare=[slug]` param already wired in Task 2)
- **Custom domain** (`isonyc.app` / similar) — 1-way door, separate decision

### Next Steps
- [ ] Phase 2: Landing polish (animated card previews, hover reveals)
- [ ] Phase 3: Explore delight (reach-race play button, line-color hover, trivia)
- [ ] "You vs. Me" meetup mode (intersection of two isochrones, consumes `?compare=[slug]` param)
- [ ] Investigate street-following heatmap colors
- [ ] Server-render rankings page
- [ ] Fix find page ResultsSidebar double-mount
