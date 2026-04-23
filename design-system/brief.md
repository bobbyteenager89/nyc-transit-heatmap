# NYC Transit Heatmap — Claude Design Brief

> Intake doc for Claude Design. First draft — edit before sharing.

---

## What this is

An interactive map tool that answers: **"Where in NYC can I actually reach within X minutes?"** and **"Which neighborhoods give me the best commute to the places I actually go?"**

It's a love-letter-to-NYC data-viz, not a navigation app. You explore, discover, and share — not route.

**Live:** https://nyc-transit-heatmap.vercel.app
**Repo:** github.com/bobbyteenager89/nyc-transit-heatmap
**Stack:** Next.js 16, Tailwind v4 (CSS-first), Mapbox GL JS, MTA GTFS, Citi Bike GBFS, ferry + bus data, H3 hex grid (~150k cells/res 10), web worker for grid computation.

---

## The three modes (primary IA)

1. **Explore** (`/explore`) — **primary mode, the hero surface.**
   Drop a pin → get a live isochrone heatmap across 7 transport modes (subway, bus, walk, car, bike, ferry, ownbike) with a 1–60 min slider, play button for time-lapse, multi-location overlays (Live/Meet modes).

2. **Find** (`/find`) — currently hidden from landing after S28.
   Wizard collects your destinations (work/gym/social/extras) → shows optimal neighborhood as a score heatmap.

3. **Rankings** (`/rankings`) — currently hidden from landing after S28.
   25 pre-scored neighborhoods in a selectable table. Pick 2–3 → side-by-side `/compare`.

**Note for Claude Design:** Explore is the marquee. Find + Rankings are being de-emphasized for the soft launch. Design decisions should favor Explore first, but everything needs to feel like one product.

---

## Audience

- **Primary:** New Yorkers considering moving neighborhoods, or friends comparing meetup spots.
- **Secondary:** Urbanists, data-viz enthusiasts, transit nerds on Twitter/LinkedIn.
- **Tertiary:** People thinking about moving to NYC.

**Emotional tone:** confident, a little brutalist, slightly nerdy, NYC-native. Not "cute." Not "corporate SaaS." Think *New York Times Graphics desk* meets *Mapbox demo* meets *MTA MetroCard*.

---

## What's working (preserve)

1. **Dark map as the canvas** — the heatmap colors pop against `#0a0a12` body. Light mode would kill the data viz.
2. **Arial Black italic uppercase headings** — distinctive, brutalist, NYC street-sign energy. Every review has called this good.
3. **Cyan accent (`#22d3ee`)** — reads as "interactive / try this" without being tacky.
4. **Mobile bottom sheet pattern** — works great, don't redesign.
5. **Touch targets (44px)** — keep.
6. **Animated landing previews** (ring-pulse, hex-shimmer, bar-grow) — people like the "it moves!" moment.
7. **The brutalist red/pink Wizard** — isolated theme for Find wizard. Intentional contrast. Keep as is, but *contain* it better so it doesn't bleed into main theme.

## What's weak (open to change)

1. **Inconsistent buttons / CTAs** — three different button styles across the app.
2. **No unified elevation system** — cards are flat+border; hover is ad-hoc glow. Want a coherent depth story.
3. **Information density on Explore sidebar** — lots of sections stacked (`PanelSection × 9+`), all same weight. Want visual hierarchy so eye knows where to land first.
4. **Time gradient legend** (MapLegend) looks like a homework assignment — 12 hard-coded hex bands. Could become a hero affordance.
5. **The "callout" pattern** (BestNeighborhood, SurpriseInsight, MeetupSummary) has three different styles — unify.
6. **Rankings + Compare pages feel disconnected** — different voice from Explore.
7. **No attribution footer yet** — MTA / Mapbox / Citi Bike / NYC Open Data credits are owed (S28 open item).
8. **Landing hierarchy after hiding Find + Rankings** — currently just one card dominates; needs a new story.

---

## Goals for this redesign

### Must-have
1. **Unified design system** — tokens for color, type, spacing, radii, shadows, motion, semantic states (success/warning/muted/focus).
2. **Component library** — Button, Slider, Callout, Modal, Dropdown primitives.
3. **Explore polish** — sidebar hierarchy, map legend as hero, clear "start here" moment.
4. **Landing re-hero** — now that Find + Rankings are hidden, landing needs a stronger Explore-first story.
5. **Attribution footer** — unify data source credits across all pages.

### Nice-to-have
1. **Empty states** — first-load, no-destinations, error states.
2. **Loading / skeleton** — map load, ranking list fetch, isochrone compute.
3. **Shareable moments** — the OG image + share sheet could be prettier.
4. **Accessible focus system** — right now only one component has a proper ring.

### Out of scope
- Light mode (data viz relies on dark).
- Mobile app (web-only).
- Authentication / saved trips (YAGNI for launch).
- Full Wizard redesign (brutalist theme preserved).

---

## Constraints

1. **Dark only.** Map layers assume dark base.
2. **Mapbox visuals are load-bearing.** Colors must pop over OSM dark tiles.
3. **MTA line colors are canonical.** Can't change the #EE352E red on the 1/2/3.
4. **Transport mode palette** is semantic — walk = amber, subway = blue, etc. These have meaning.
5. **No big JS bundles.** Tailwind v4 CSS-first; try not to introduce a CSS-in-JS library.
6. **`prefers-reduced-motion` must work** — currently respected on landing + trivia.
7. **Touch target: 44px minimum.**
8. **Wizard theme must stay red/pink brutalist** — it's a feature.

---

## Design inputs already attached

- **`design-system/tokens.md`** — full token inventory (canonical + de-facto). Flags what's currently hardcoded and what semantic tokens are missing.
- **`design-system/components.md`** — 40-file component inventory, grouped by surface. Ends with a tiered consolidation recommendation.
- **`design-system/screenshots/`** — (TBD — Andrew + Claude to add)

---

## Deliverables request

From Claude Design, in order of priority:

1. **Token proposal** — recommend final token set (what to keep, rename, add, split into semantic roles). Should be pasteable into `globals.css` under `@theme inline`.
2. **Explore surface redesign** — sidebar hierarchy, map legend treatment, mode tabs, time slider. This is the hero.
3. **Component primitives** — Button, Slider, Callout, Chip, Section, Modal, Dropdown. Each with variants + states.
4. **Landing re-hero** — one-card-dominant layout now that Find/Rankings are hidden.
5. **Attribution footer pattern** — one component reused across pages.
6. **Rankings + Compare refresh** — bring them in line with the new system (lower priority than Explore).

---

## Voice / copy tone (for any microcopy proposals)

- Confident, direct, sometimes wry.
- No emoji in UI copy.
- Numbers matter — always show the receipts.
- Avoid "journey," "unlock," "empower," "magic."
- OK with "pin," "drop," "reach," "shape," "ride."

---

## Open questions for Claude Design (prompts, not asks)

- Is there a stronger visual identity we can lean into — e.g., anchor to MTA signage + MetroCard colorways more aggressively?
- The time gradient (green→red through 12 bands) is currently cosmetic — could it become a featured UI element (e.g., a persistent reference scale in the chrome)?
- The Explore sidebar has 9 stacked sections. What's the 3-section collapse that preserves all the functionality?
- On Landing, how do we make the map itself feel like the hero without the site feeling like a map-builder tool?
