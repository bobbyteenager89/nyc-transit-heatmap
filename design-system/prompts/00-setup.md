# Round 0 — Setup

One-time. Do this before any prompt round.

## Capture screenshots

Save to `../screenshots/`:

| File | What |
|------|------|
| `landing-desktop.png` | Full landing at 1440 width |
| `explore-desktop-wide.png` | Drop a pin at Union Square first so heatmap renders |
| `explore-mobile-sheet.png` | Bottom sheet expanded at 390 width |
| `explore-legend.png` | Close-up of the 12-band time gradient |
| `find-wizard-brutalist.png` | Find wizard Step 1 — shows what NOT to change |
| `rankings-table.png` | Table with one row selected |
| `compare-side-by-side.png` | 2-neighborhood compare |
| `mobile-bottom-sheet.png` | Explore mobile, sheet open |

Capture command:

```bash
agent-browser snap https://nyc-transit-heatmap.vercel.app/explore \
  --width 1440 \
  --output design-system/screenshots/explore-desktop-wide.png
```

Or use Chrome DevTools at 1440 wide (desktop) / 390 wide (mobile) and screenshot.

## Project setup in Claude Design

When creating the project:

1. **Attach all 8 screenshots.**
2. **Link the GitHub repo** — `bobbyteenager89/nyc-transit-heatmap`.
3. **Scope ingestion** — point at `src/components/` and `src/app/globals.css` specifically. Do **not** point at the full repo (full-monorepo ingestion times out per April 2026 reports).
4. **Upload reference docs** — `design-system/tokens.md` and `design-system/components.md`.
5. **Set role** — pick "Design" or "Engineering" at first-run. Calibrates output density.

## Verify capture before Round 1

Before running `01-direction.md`, paste this in chat:

> Summarize what you've captured: current color system, typography, key components, and the "preserve" vs "change" areas you understand. List which transport mode colors you read as semantic.

If the answer is wrong or thin, attach more context before generating. Iterating on a half-wrong base wastes allowance.

## Move on when

- 8 screenshots saved
- Project created with repo + reference docs attached
- Verification reply matches reality
