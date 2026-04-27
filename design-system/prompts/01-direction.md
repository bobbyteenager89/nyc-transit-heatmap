# Round 1 — Direction Exploration

**Goal:** Pick a direction before committing to tokens. Saves 5+ rounds downstream.

**Prereq:** Round 0 setup complete.

## Paste this

```
You're a senior product designer. I need 3 distinct visual-identity directions for redesigning the chrome around a NYC transit data-viz map. Live URL and 8 screenshots attached.

This is NOT a navigation app — it's a love-letter-to-NYC data-viz. Tone: confident, brutalist, slightly nerdy. NYT Graphics desk meets Mapbox demo meets MTA MetroCard.

Generate 3 mockups of the SAME screen — Explore sidebar, see explore-desktop-wide.png. Don't redesign the map itself; redesign the chrome around it.

DIRECTION A — MTA-canonical
Lean into NYC transit signage. Helvetica everywhere, bullet-style line markers, MetroCard-yellow alongside cyan, station-roundel iconography for section headers. Referential brutalist.

DIRECTION B — Editorial / NYT Graphics desk
Treat the sidebar like a data essay. Heavier type hierarchy, a featured "headline" stat at top, generous whitespace on dark, less chrome, more information design.

DIRECTION C — Time-gradient as identity
Make the green→yellow→orange→red time gradient the visual spine. Section dividers, focus rings, hover states all derive from gradient position. The legend becomes the primary visual signature.

CONSTRAINTS (apply to all three):
- Dark only. Body #0a0a12, cards #12131a / #1a1b24
- MTA line colors are canonical — no recoloring 1/2/3 red, etc.
- Transport mode palette is semantic: subway #118ab2, walk amber, bus orange, bike green, car purple, ferry teal — don't recolor
- 44px touch targets minimum
- Wizard's red/pink brutalist theme is sacred — see find-wizard-brutalist.png — don't touch
- prefers-reduced-motion must be honored

DO NOT:
- Light mode
- "Cute," "playful," generic SaaS
- Gradient backgrounds (the time gradient is the only gradient that earns its place)
- Emoji in UI
- Glassmorphism for its own sake (incidental glass OK)

Deliverable: 3 sidebar screenshots side-by-side + 2-sentence rationale per direction. After I pick or remix, we'll generate tokens.
```

## What to do with the output

- **You'll likely want to remix.** That's fine. Reply in chat: "Mostly direction B but pull the gradient-as-spine idea from C for section dividers. Show me that."
- Don't spend more than 2 iterations here. Pick a direction and move on — Round 2 (tokens) is where real specificity lives.

## Move on when

You can write a 2-3 sentence description of the chosen direction. Paste that into Round 2 as input.
