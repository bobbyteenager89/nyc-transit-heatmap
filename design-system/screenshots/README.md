# Screenshot Catalog

> Captured 2026-04-24 via Claude-in-Chrome against https://nyc-transit-heatmap.vercel.app (S28 live).

## How to use these with Claude Design

The desktop screenshots are visible in the Claude Code chat session where they were captured — they are **not saved as PNG files on disk** (Chrome MCP tool only returns screenshots inline).

**Options for handoff:**
1. Right-click each screenshot in the Claude Code chat → Save Image → drop here
2. Or re-capture manually:
   - Desktop: `Cmd+Shift+4` → space → click window, or Chrome `Cmd+Shift+4` on viewport
   - Mobile: Chrome DevTools → ⌘+Shift+M (device toolbar) → iPhone 14 Pro → full-page screenshot
3. Or paste directly from the session into your Claude Design chat — Claude Design accepts images inline.

---

## Desktop (~1440×900)

### 01-landing.png
`/` — Post-S28 state. Single Isochrone NYC card centered over map-style blurred background. Find and Rankings cards hidden. This is the exact state that needs the "re-hero" fix — one card alone looks lonely.

**Notable:**
- Arial Black italic heading "ISOCHRONE NYC" with cyan "NYC" accent
- `border-2 border-white/30`, `bg-white/5`, animated ring-pulse preview
- Feedback chat bubble + menu in top right (Vercel comments widget)

### 02-explore.png
`/explore` — Empty state before any pin dropped.

**Notable:**
- Left sidebar: "Isochrone / NYC" logo, "NYC Transit Heatmap" subtitle
- Tab triad: Reach (selected cyan) / Live / Meet
- Sections stacked: Location → Reach Time (30 min default, slider) → Transport Modes (3×2 grid) → Transit Trivia (bottom)
- Walk, Subway, Bus, Ferry, Citi Bike preselected — Car disabled (+ ADVANCED MODES link)
- Main area: "DROP A PIN TO START" + 3 suggestion chips (Times Square, Williamsburg, Astoria)
- Top-right: STREETS toggle (Off / Plain / Glow active / Colored)
- Dark Mapbox base, visible at lower opacity as a teaser

### 03-find-wizard.png
`/find` — Wizard step 1 (WORK).

**Notable:**
- This is the BRUTALIST RED/PINK theme — completely different visual identity from rest of app
- Top: 4-step progress tabs (WORK active / GYM / SOCIAL / EXTRAS) with red underlines
- Giant italic headline "Where do you work?"
- Work address field (dark) + "How often do you commute?" frequency bar (5 red squares filled out of 7)
- Red sticky footer at bottom (Next button)
- Intentional escape from the main dark theme — per the brief, preserve this

### 04-rankings.png
`/rankings` — Pre-rendered at build time.

**Notable:**
- Centered max-w layout, italic "NEIGHBORHOOD / RANKINGS" with cyan-accented RANKINGS
- Numbered list of neighborhoods: 1 MIDTOWN (16.8 min), 2 WEST VILLAGE (17.7), 3 SOHO (19.8), 4 TRIBECA (20.2), 5 MURRAY HILL (20.3), 6 CHELSEA (21.3)...
- Each row: checkbox, rank number, neighborhood (italic), borough, relative-width cyan bar, minutes
- Top-right "Compare neighborhoods →" link
- Loads feel flat — lots of vertical scrolling, no grouping

### 05-compare.png
`/compare` — Empty state.

**Notable:**
- Very sparse. "← Back to Rankings" → title "COMPARE / NEIGHBORHOODS" → subtitle → single "+ Add" pill → empty state "Select neighborhoods above to start comparing."
- No visual scaffolding for what a comparison will look like
- Strongest hierarchy-gap page in the app

---

## Mobile — NOT CAPTURED via automation

Chrome MCP window resize doesn't trigger the Tailwind `md:` breakpoint in a way that makes the page rerender as mobile — the extension captures at a fixed canvas size regardless of window width.

**What mobile introduces that Claude Design must see:**
- `MobileBottomSheet` pattern on `/explore` and `/find` (collapses to ~120px, expands to 75dvh)
- Drag handle bar, safe-area-inset-bottom padding
- Mode tabs become full-width
- Landing stacks vertically, card expands to full width

**Recommended manual captures for Claude Design:**
1. `/` on mobile — single-card layout at 390px
2. `/explore` with bottom sheet collapsed (summary view)
3. `/explore` with bottom sheet expanded (controls view)
4. `/find` wizard step 1 at mobile width
5. `/rankings` at mobile (list stacks)

**Tool of choice:** Chrome DevTools device toolbar (⌘+Shift+M in Chrome) → iPhone 14 Pro → "Capture full size screenshot" from the device toolbar menu.

---

## Additional captures worth taking (not done yet — low priority, decide per Claude Design ask)

- `/explore` with pin dropped + heatmap rendered (shows actual data-viz)
- `/explore` in LIVE mode (multi-destination list visible)
- `/explore` in MEET mode (fairness slider visible, different color theme)
- `/find` at results phase (after completing wizard)
- `/find` on the hex map with destinations marked
- `/compare` with 2 neighborhoods loaded (shows the metric cards)
- Dynamic OG image (`/api/og`)
- Any error / loading state
