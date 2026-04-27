# Round 3 — Component Primitives

**Prereq:** Tokens landed (Round 2).

## Paste this

```
Generate primitive component designs using the tokens from Round 2. Stack: Next.js 16 + Tailwind v4 + React.

PRIMITIVES (in this order):

1. Button — variants: primary, secondary, ghost, destructive. States: default, hover, active, focus, disabled, loading. Sizes: sm (32px min-h), md (40px), lg (44px touch target).

2. Slider — single-value (time slider 1-60) and range. Must include the play button affordance for time-lapse. Touch-friendly thumb (28px). Track shows the time gradient.

3. Callout — variants: info, success, warning, insight. Insight variant unifies the BestNeighborhood / SurpriseInsight / MeetupSummary patterns (currently 3 different styles).

4. Chip — selectable + dismissible. Used for destination tags. 44px touch.

5. Section — sidebar collapsible card. Header with title + optional action. Currently `PanelSection` × 9 stacked, all same weight — propose 3-tier hierarchy: hero / standard / muted.

6. Modal — overlay with focus trap + ESC dismiss. Used for share, error states.

7. Dropdown — single + multi-select. Used in mode selection, ranking filters.

FOR EACH PRIMITIVE DELIVER:
- One mockup showing all variants and states side-by-side
- Tailwind v4 class strings (no CSS modules, no styled-components)
- Required ARIA attributes
- One usage example tied to a real surface — e.g., "Button primary used here on Explore sidebar 'Find places' CTA"

CONSTRAINTS:
- 44px minimum touch on interactive elements
- Focus rings using --color-focus token (currently missing on most components)
- prefers-reduced-motion must remove motion variants
- No new dependencies — primitives must work with what's already installed (no Radix, no Headless UI unless you can show a strict size benefit)

DO NOT:
- Generate primitives I didn't list
- Add a Theme/ThemeProvider component — we're CSS-first
- Use Tailwind theme() function — CSS custom properties only

VERIFICATION FIRST — before mockups:
Tell me which existing components from components.md (uploaded) each new primitive replaces. The inventory has 40 files. I want to confirm the mapping before you commit.
```

## After Claude Design replies

1. Read the consolidation map. Push back if it's collapsing things that shouldn't merge.
2. Approve, get the 7 mockups + class strings.
3. Don't implement yet. Round 4 uses them in context first to validate they actually compose right.

## Move on when

You have mockups + class strings for all 7 primitives, and the consolidation map is sane.
