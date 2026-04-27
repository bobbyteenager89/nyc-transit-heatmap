# Round 4 — Explore Surface (the hero)

**Prereq:** Primitives sketched (Round 3).

This is the highest-stakes deliverable. Iterate carefully. If A doesn't feel right in code, B-E inherit the problem.

## Paste this

```
Redesign the Explore surface. This is the hero of the product. See explore-desktop-wide.png and explore-mobile-sheet.png. Live: https://nyc-transit-heatmap.vercel.app/explore

Use the tokens from Round 2 and the primitives from Round 3.

CURRENT PROBLEMS:
1. Sidebar has 9+ stacked sections all visually equal — eye doesn't know where to land first
2. Map legend (12-band time gradient) looks like a homework assignment — could be a hero affordance instead
3. Mode tabs and time slider feel disconnected from the rest of the chrome
4. No clear "start here" moment for first-time users (empty state pre-pin)

DELIVERABLES — generate one screen per response, in this order:

A. Sidebar at 3-tier hierarchy. Collapse 9 sections into 3 weights — hero / standard / muted. Show which content goes in which tier. Hero gets prominent treatment; muted sections collapse by default.

B. Map legend redesign. Make it a featured persistent reference scale, not a footnote. Could be a vertical strip on the map edge, or anchored to the time slider. Propose 2 placements.

C. Mode tabs + time slider unified treatment. They're both controls for the same map — treat as one cluster, not two stacked sections.

D. First-load empty state. What shows before user drops a pin? The map alone is too sparse.

E. Mobile bottom sheet. Apply the same 3-tier hierarchy at 390 width.

CONSTRAINTS:
- Map fills full viewport — sidebar overlays
- Mapbox visuals are load-bearing — anything overlaying must not crowd the map
- Time slider 1-60 min stays — don't change the data range
- Multi-location overlay (Live/Meet modes) must still fit
- Touch 44px on mobile

DO NOT:
- Redesign the map itself — it's just OSM dark + heatmap layers
- Remove the play button — time-lapse is a key feature
- Add a top nav bar — landing has nav, Explore is fullscreen

VERIFICATION FIRST — before designing A:
Ask me which sections from the current sidebar belong in which tier (hero / standard / muted). I'll give you the assignment, then you design.
```

## After Claude Design replies

1. Confirm the tier assignment — paste back which sidebar sections go where. (Hint: current sections are address input, mode tabs, time slider, multi-location toggle, destinations, mode legend, reach stats, callouts, share. Pick 2 for hero, 4 for standard, rest muted-collapsible.)
2. Generate A. **Implement A in code before generating B-E.** This is the "validate in code" step.
3. If A feels wrong in the browser, iterate before continuing.
4. Once A holds up, run B → C → D → E. Implement each as it lands.

## Move on when

All 5 mockups (A-E) implemented in code. Run `/preflight` + `/smoke-test` on Explore before declaring done. The mobile bottom sheet (E) is easy to skip — don't.
