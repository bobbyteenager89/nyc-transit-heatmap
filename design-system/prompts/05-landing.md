# Round 5 — Landing Re-hero

**Prereq:** Explore surface direction validated in code (Round 4).

## Paste this

```
Redesign the landing page. See landing-desktop.png. Live: https://nyc-transit-heatmap.vercel.app

CONTEXT: Find + Rankings cards are now hidden post-S28. The 3-card layout is broken — Explore needs to dominate. But the landing should still feel like a product with depth, not a single-button page.

Use Round 2 tokens, Round 3 primitives, and Round 4 hierarchy patterns.

DELIVERABLES:

1. Hero treatment for Explore. What's the moment? Propose 2-3 hero options — could be: live mini-isochrone preview that animates on cursor move, static split (left: pitch + CTA / right: live map), or full-bleed map with overlay copy. Show me the options before committing.

2. Secondary content scaffolding. Where do Find + Rankings live when un-hidden? They shouldn't disappear from the IA, just be de-emphasized. Maybe a "More tools" section below the hero.

3. Below-the-fold. Short pitch — "how this works in 3 steps." Data sources. Attribution footer (Round 6 component, leave a placeholder).

CONSTRAINTS:
- Animated landing previews exist — PreviewIsochrone (ring-pulse), PreviewHex (hex-shimmer), PreviewRankings (bar-grow). Keep or replace, but don't delete the animated-preview pattern entirely.
- Arial Black italic uppercase for primary heading (preserved from current design)
- prefers-reduced-motion respected
- Mobile-first — most landing visits are mobile
- Page length: max 3 viewport heights on desktop

DO NOT:
- Add login/auth (out of scope for launch)
- Add a newsletter form (post-launch if needed)
- Add testimonials (don't have any)
- Add a "Built with" / tech badges section (not the vibe)

VERIFICATION FIRST — before scaffolding:
Show me 2-3 hero proposals for deliverable 1. Don't move on to 2 and 3 until I pick.
```

## After Claude Design replies

1. Pick a hero proposal. Iterate once or twice if needed.
2. Once hero locked, ask for deliverables 2 and 3.
3. Implement in code. The landing is small — should fit in one PR.

## Move on when

Landing matches Explore's visual energy. If they feel like two products, keep iterating. Run `/preflight` + `/smoke-test` on `/` before moving on.
