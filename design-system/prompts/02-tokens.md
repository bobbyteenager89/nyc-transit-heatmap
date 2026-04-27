# Round 2 — Tokens

**Prereq:** Direction picked from Round 1.

## Paste this

```
Generate the final design token set for the NYC transit data-viz tool. Direction picked: [PASTE 2-3 SENTENCE DIRECTION FROM ROUND 1].

Reference: design-system/tokens.md (uploaded) is the current de-facto inventory — flags hardcoded values and missing semantic tokens. Use it as starting point. Keep what works, rename for clarity, add semantic roles, split where colors are doing two jobs.

DELIVERABLE FORMAT:
- Single CSS block paste-able into src/app/globals.css under `@theme inline {}`
- Tailwind v4 conventions — CSS custom properties, no JS config
- Semantic naming: --color-surface, --color-surface-elevated, --color-accent, --color-accent-muted, --color-focus, --color-success, --color-warning, --color-danger
- Preserve transport mode tokens: --color-mode-subway, --color-mode-walk, --color-mode-bus, --color-mode-bike, --color-mode-car, --color-mode-ferry, --color-mode-ownbike
- Preserve MTA line colors as a separate scoped block (1/2/3 red, etc.)
- Add: shadow scale (--shadow-sm/md/lg/xl), radius scale (--radius-sm/md/lg/xl/full), motion (--ease-out-expo, --duration-fast/base/slow)
- Spacing: only tokens we're missing — Tailwind defaults handle most

CONSTRAINTS:
- Dark theme only — no light tokens
- Body background #0a0a12 stays
- Wizard red/pink theme tokens stay in their own scoped block, untouched
- No CSS-in-JS

DO NOT:
- Add tokens we don't actively use
- Use Tailwind theme() function (we're CSS-first)
- Rename transport mode colors to abstractions — they're load-bearing semantic names

VERIFICATION FIRST — before generating:
Tell me what tokens you're inheriting from the existing inventory and what you're proposing to ADD or RENAME. Wait for my confirmation before generating the CSS block.
```

## After Claude Design replies

1. Read its inheritance/add/rename list. If it dropped a token you need or added one that's pure decoration, push back **before** asking for the CSS.
2. Once you confirm, it generates the CSS block.
3. Paste into `src/app/globals.css` under the `@theme inline` directive.
4. Run `npm run build` — verify no broken references.

## Move on when

`globals.css` updated, build passes, you've grep'd for any old token names that need replacing across the codebase.
