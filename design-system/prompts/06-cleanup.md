# Round 6 — Cleanup

**Prereq:** Tokens, primitives, Explore, Landing all landed.

Two prompts in this round. Run sequentially.

## Prompt 6A — Attribution Footer

```
Design an attribution footer used across all pages. Single component, reused. Tokens + primitives from earlier rounds.

DATA SOURCES TO CREDIT:
- MTA — subway/bus GTFS data
- Mapbox — base map tiles + geocoding
- Citi Bike — GBFS feed
- NYC Open Data — neighborhood boundaries
- NYC Ferry — terminal data

Per source: source name + tiny logo if available + linked attribution per the source's terms.

CONSTRAINTS:
- Compact footprint — does NOT compete with primary content
- Visible on all pages: Landing, Explore, Find, Rankings, Compare
- On Explore (fullscreen map), footer is a collapsed strip + "data sources" link expanding to full credits

DO NOT:
- Add social links / GitHub / Twitter — those live in landing nav
- Add a copyright line — this is a personal data-viz, not a corp

Deliverable: one component mockup + Tailwind class strings + collapsed/expanded states for the Explore variant.
```

After it lands: implement, then verify on every page.

## Prompt 6B — Rankings + Compare Refresh

```
Bring Rankings and Compare in line with the new design system. See rankings-table.png and compare-side-by-side.png. Live: /rankings and /compare.

CURRENT PROBLEMS:
- Voice mismatch — feels like a different product than Explore
- Table styling is generic — doesn't reflect the new tokens
- Compare cards lack visual energy
- Selection-to-compare flow feels like a form, not exploration

DELIVERABLES:

1. Rankings table — restyle using new tokens. Selectable rows, score visualization (currently just a number — could be a small bar/dot row), sort affordance, hover states.

2. Compare side-by-side — restyle each neighborhood as a card with new tokens. Add visual contrast between cards so the eye doesn't bounce.

3. Selection-to-compare CTA — currently a button at the bottom; make it persistent and prominent, like "Compare 2 selected →" sticking to the viewport edge.

CONSTRAINTS:
- Tables stay tables — don't turn Rankings into a card grid. Tabular density is the value.
- Score scale stays 0-100
- Compare URL is shareable — don't break that
- Selection state must survive scroll

DO NOT:
- Add filters we don't have data for (only price, transit-access, walkability supported)
- Add maps to Rankings table rows — Compare has them, that's enough
- Add charts that aren't data-grounded
- Change scoring methodology — that's a separate project

Deliverable: 2 mockups (rankings, compare) + class strings.
```

## Move on when

All surfaces feel like one product. Final pass:

```bash
npm run build
# Run preflight + smoke-test:
/preflight
/smoke-test
```

Ship it.
