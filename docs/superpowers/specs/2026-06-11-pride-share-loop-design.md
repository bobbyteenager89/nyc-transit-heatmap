# Pride-Share Loop — Design

**Date:** 2026-06-11 · **Session:** S39 · **Status:** Approved, building

## Goal

Turn every reach computation into a brag-worthy, shareable artifact that provokes
counter-shares. When you drop a pin, the sidebar and the share/OG card show "pride
stats" — how much of NYC's life is within your reach — and the shared link is an
implicit challenge: *how far can you get?*

See memory `transit-heatmap-viral-vision`: comparison IS the loop; keep share
artifacts self-contained (visual + stats + link).

## Pride stats (v1)

Computed over the **union reach** (any active mode within the time budget):

| Stat | Source | Display |
|------|--------|---------|
| Population | 2020 Census block-group pop, polyfilled to res-10 hexes | `2.4M people` |
| Restaurants | OSM `amenity=restaurant` | `812 restaurants` |
| Coffee shops | OSM `amenity=cafe` | `140 coffee shops` |
| Bars / clubs | OSM `amenity=bar\|pub\|nightclub` | `63 bars` |
| Parks / green space | OSM `leisure=park` (distinct parks intersected) | `18 parks` |
| Subway lines | Reachable stations → distinct lines, **named & listed** | `14 lines: A C E F …` |

Subway lines are the only **listed** stat (named bullets); the rest are counts.

## Architecture

**Approach 1 — build-time per-hex aggregation + runtime sum in the worker.**
Chosen over runtime spatial-join (heavy payload, INP cost) and edge-API recompute
(round-trip + re-derives what the client already has).

### Build-time (new `scripts/build-pride-data.ts`, wired into `build:subway` or its own `build:pride`)

1. **Population** — fetch 2020 Decennial P1 block-group population (Census API) for
   the 5 NYC counties + TIGER block-group polygons. For each block group:
   `polygonToCells(res 10)` and distribute `pop / nCells` evenly across covered hexes.
   Accumulate → `public/data/pride-population.json` (`{ [h3]: pop }`, integers).
2. **Point POIs** — Overpass query (NYC bbox) for restaurant / cafe / bar+pub+nightclub.
   Bin each to `latLngToCell(res 10)`. → `public/data/pride-pois.json`
   (`{ [h3]: [restaurant, cafe, bar] }`, sparse).
3. **Parks** — Overpass `leisure=park` polygons. Polyfill each to res-10 hexes; record
   `{ [h3]: parkId[] }` → `public/data/pride-parks.json`. Distinct-park count at runtime
   = union of parkIds across reachable hexes. (Tradeoff: big parks touch many hexes but
   ids are small ints; bounded by green-hex count ~<10k. Acceptable for v1.)

All committed to `public/data/` like the existing station/bus/ferry data (~1MB each norm).

### Runtime (worker)

- `grid-worker` `LOAD_DATA` also loads the three pride tables.
- After computing cells, the worker derives the **union-reachable hex set** and sums
  pop + POI counts + distinct parkIds over it.
- **Subway lines:** worker collects reachable station IDs (arrival ≤ maxMinutes via
  subway), maps station→`lines` via station-graph, returns distinct sorted list.
- Worker result gains `prideStats: { population, restaurants, cafes, bars, parks, lines: string[] }`.

### Sidebar

New `PrideStats` component under `ReachStats` — same JetBrains-Mono / hairline aesthetic,
stat values tinted with the existing data/ramp colors (people=ramp-green `#39ff14`,
restaurants=`#ffbe0b`, coffee=`#06d6a0`, bars=`#f97316`, parks=`#00b4d8`, lines=`#118ab2`).
Subway lines rendered as official MTA line bullets.

## Anonymization — snap-then-fuzz (fuzz is visual-only)

- **Snap:** the *shared* origin is snapped to its **res-8 H3 cell centroid** (~460m,
  neighborhood-block level). The share URL carries the snapped lat/lng — exact home is
  never in the link. Snapped origin is deterministic ⇒ recipient recompute is reproducible.
- **Fuzz:** applied **only to the rendered dot position** on the OG card (a small
  deterministic offset hashed from the coords — no `Math.random` at edge). The compute
  origin is NOT fuzzed, so stats/reach stay reproducible.
- The sharer's own live view still computes from the **exact** pin; the card shows the
  sharer's stat numbers (passed as URL params) so card == what the sharer saw.

## Share card (OG) — stats baked in

The edge `/api/og` route is stateless (can't run the worker), so the **share URL carries
the computed stat values as params**; the card just renders them.

New params on the share URL + OG route:
`pop`, `rest`, `cafe`, `bar`, `park` (ints), `lines` (comma list e.g. `A,C,E,F`),
plus the existing `lat,lng,t,m,address` (lat/lng now snapped).

Card layout (see approved mockup): wordmark top-left, glass stat panel bottom with a
3-col grid of the six stats + a line-bullet row. Cyan theme retained.

## Knicks brand-chrome — Variant C (split-bar mark)

Subtle blue/orange (`#006BB6` / `#F58426`) split bar beside the wordmark, orange `NYC`.
Applied to site chrome + OG card wordmark. **Time ramp untouched.** Lowest risk against
the heatmap colors. (Variants A/B and a flag-toggle were considered and declined.)

## Out of scope (v1)

- Downloadable / Instagram-story card (OG card only for now).
- Explicit "my reach vs yours" compare artifact (Meet-mode plumbing exists if wanted).
- Park acreage as a secondary stat (distinct count only for v1).

## Build sequence

1. `build-pride-data.ts` + commit generated `public/data/pride-*.json`.
2. Worker: load tables, compute `prideStats` (incl. subway lines), return them. (TDD)
3. `reach-stats.ts` lib helpers for any shared math. (TDD)
4. `PrideStats` sidebar component + wire into explore-content.
5. Snap-then-fuzz: share-URL builder snaps to res-8; OG route fuzzes dot.
6. OG route: render stats + line bullets.
7. Knicks Variant C chrome (site + OG wordmark).
8. Verify in preview; smoke-test; re-record marketing assets.
