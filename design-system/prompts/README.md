# Claude Design Intake — Sequenced Prompts

Strategic context lives in `../brief.md`. These are the prompts to paste into Claude Design, in order. Don't paste the brief — it's a designer doc, not a Claude Design prompt.

## Why sequenced

Claude Design generates well from one focused artifact per prompt — not a 6-deliverable mega-brief. Initial generation burns more allowance than iteration. Invest specificity upfront on one target, iterate cheaply, move on.

## Order

| # | File | Round | Output |
|---|------|-------|--------|
| 0 | `00-setup.md` | Setup | Screenshots captured, project configured (one-time) |
| 1 | `01-direction.md` | Direction | 2-3 visual identity options to pick from |
| 2 | `02-tokens.md` | Tokens | Paste-able CSS for `globals.css` |
| 3 | `03-components.md` | Components | 7 primitive mockups + class strings |
| 4 | `04-explore.md` | Explore | Hero surface redesign (sidebar, legend, slider) |
| 5 | `05-landing.md` | Landing | Re-hero with Find/Rankings hidden |
| 6 | `06-cleanup.md` | Cleanup | Footer + Rankings/Compare refresh |

## Iteration affordances — use the right one

- **Chat replies** — layout rewrites, structural changes ("move the legend to the top")
- **Inline comments** — element-level edits ("this button is too small")
- **Tweak sliders** — color/spacing/radius adjustments — **does NOT burn allowance**, use liberally

## Pitfalls (observed from 2026 user reports)

- Multiple deliverables per prompt → muddled output
- Skipping the verification step ("what did you capture?") → iterate on a half-wrong base
- Full-repo ingestion → times out; scope to specific subdirectories
- Generic AI placeholders ("hero image goes here", marketing-speak copy) → manually replace before shipping
- No screenshots attached → tool reverts to generic SaaS aesthetic

## Reference materials

- **Live:** https://nyc-transit-heatmap.vercel.app
- **Repo:** github.com/bobbyteenager89/nyc-transit-heatmap
- **Strategic context:** `../brief.md`
- **Token inventory:** `../tokens.md`
- **Component inventory:** `../components.md`
- **Screenshots:** `../screenshots/` (capture per `00-setup.md`)
