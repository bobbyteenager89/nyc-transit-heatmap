# NYC Transit Heatmap — Design Tokens

> Extracted from `src/app/globals.css`, `src/lib/isochrone.ts`, `src/components/isochrone/isochrone-map.tsx`, and grep across `src/` (2026-04-24).
> This is the ground-truth inventory for Claude Design. Canonical tokens are in `@theme inline` in `globals.css`; everything else below is currently hardcoded in component files and should be folded into the system.

---

## Color

### Canonical (in `@theme inline`)
| Token | Value | Usage |
|---|---|---|
| `--color-surface` | `#12131a` | Main app background (dark navy-black) |
| `--color-surface-card` | `#1a1b24` | Card / panel background |
| `--color-border` | `rgba(255,255,255,0.1)` | Default hairline border |
| `--color-accent` | `#22d3ee` | Primary interactive accent (cyan) |
| `--color-pink` | `#fcdde8` | Wizard brutalist theme — text on red |
| `--color-red` | `#e21822` | Wizard brutalist theme — fills |
| `body bg` | `#0a0a12` | Root body color (NOT surface — one notch darker) |

### Transport mode palette (`src/lib/isochrone.ts`)
| Mode | Hex | Notes |
|---|---|---|
| `walk` | `#ffbe0b` | Amber yellow |
| `bike` | `#06d6a0` | Teal green (Citi Bike) |
| `ownbike` | `#10b981` | Emerald (own bike) |
| `subway` | `#118ab2` | Desaturated blue |
| `bus` | `#f97316` | Orange |
| `car` | `#9b5de5` | Purple |
| `ferry` | `#00b4d8` | Cyan-blue |

**Note:** `CLAUDE.md` claims `walk=#ffbe0b, bike=#06d6a0, subway=#118ab2, bus=#f97316, car=#9b5de5, ferry=#00b4d8` — matches. But CLAUDE.md misses `ownbike`.

### Travel-time gradient
| Minutes | Hex | Semantic |
|---|---|---|
| 0 | `#39ff14` | Neon green — instant |
| 5 | `#c8ff00` | Lime |
| 10 | `#ffd700` | Gold |
| 15 | `#ffaa00` | Amber |
| 20 | `#ff7700` | Orange |
| 25 | `#ff4500` | Red-orange |
| 30 | `#e81800` | Red |
| 35 | `#c8101a` | Dark red |
| 40 | `#a00030` | Burgundy |
| 45 | `#800020` | Maroon |
| 50 | `#6a1b6a` | Purple |
| 60 | `#4a0a4a` | Deep purple |

Defined inline in `src/components/isochrone/map-legend.tsx`. Not tokenized.

### MTA subway line colors (`isochrone-map.tsx:25`)
Canonical MTA bullet colors — matches `web.mta.info`. 25+ hardcoded hex:
```
1/2/3  → #EE352E (red)
4/5/6  → #00933C (green)
7      → #B933AD (purple)
A/C/E  → #0039A6 (blue)
B/D/F/M → #FF6319 (orange)
G      → #6CBE45 (light green)
J/Z    → #996633 (brown)
L      → #A7A9AC (gray)
N/Q/R/W → #FCCC0A (yellow)
Shuttle (FS/GS/H) → #808183 (dark gray)
SI     → #0039A6 (blue)
```

### Opacity / tint system (convention, not tokenized)
| Pattern | Meaning | Count in codebase |
|---|---|---|
| `bg-white/[0.03]` | Subtle raised surface | ~12 uses |
| `bg-white/5` | Raised card, hover bg | ~20 uses |
| `bg-white/10` | Pressed / active tint | ~8 uses |
| `border-white/10` | Default border (same as `--color-border`) | ~40 uses |
| `border-white/15` | Emphasized border | ~5 uses |
| `border-white/20`, `/30` | Strong border (CTAs, outlined buttons) | ~10 uses |
| `bg-accent/10`, `/15` | Accent tint (selected, highlight) | ~10 uses |
| `border-accent/30`, `/50` | Accent border (selected row, callout) | ~8 uses |

### One-off accents (flag for consolidation)
| Color | Used in | Consolidate? |
|---|---|---|
| `amber-500` | `FairnessSlider` — yellow theme for meetup tolerance | Yes — reduce to either accent or a semantic "warning" token |
| `emerald-500` | `MeetupSummary` — green callout for overlap found | Yes — needs a "success" semantic token |
| `text-accent` (cyan) | BestNeighborhood, SurpriseInsight | Fine — primary |
| Hardcoded `#e21822`, `#fcdde8` | DropPinMap marker, Wizard | Fine — these are intentional brutalist theme escape |

---

## Typography

### Fonts (canonical)
| Token | Stack | Role |
|---|---|---|
| `--font-display` | `"Arial Black", Impact, sans-serif` | H1/H2/H3 + `.display-text` |
| `--font-body` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | All body text |

### Display style (global `h1/h2/h3`)
- `font-style: italic`
- `letter-spacing: 0.02em`
- `line-height: 1`
- `text-wrap: balance`
- Typically `uppercase` in usage (applied per-component, not global)

### Scale (observed in components, not tokenized)
| Size | Use |
|---|---|
| `text-[10px]` + `uppercase tracking-widest` | Small labels ("YOUR REACH", "TIME", etc.) — ~15 uses |
| `text-xs` | Helper text, captions |
| `text-sm` | Body paragraph in cards |
| `text-base` | Default body |
| `text-lg`, `text-xl` | Result callouts |
| `text-4xl` | MonthlyFooter hero number |
| Heading (no explicit size, Arial Black) | Varies — 1.5rem–3rem inline |

### Numeric formatting
- `tabular-nums` applied in `TimeSlider`, `MonthlyFooter` (inconsistent — not everywhere numbers appear)

### Body defaults
- Color: `#ffffff`
- `-webkit-font-smoothing: antialiased`
- `text-wrap: pretty`
- `-webkit-text-size-adjust: 100%` on `<html>` (iOS fix)

---

## Spacing

**No canonical spacing tokens.** Relies on Tailwind defaults. Observed patterns:

| Context | Padding / Gap | Notes |
|---|---|---|
| `PanelSection` (every card) | `p-5` (20px) | Hardcoded across ~15 uses — should be a token |
| Section gaps | `gap-3` (12px) | PanelSection internal |
| Sidebar sections | `gap-4` (16px) between sections |
| Touch targets | `min-h-[44px]`, `min-w-[44px]` | Chips, mode tabs, snap buttons — hardcoded pixel value repeated ~10 times |
| MobileBottomSheet | `max-h-[75dvh]`, collapsed `max-h-[120px]` | Arbitrary |
| Sidebar width | `w-[360px]` | ResultsSidebar |

---

## Radii

**No radius tokens.** Usage:
| Scale | Where |
|---|---|
| `rounded-lg` (8px) | Mode tabs, buttons |
| `rounded-xl` (12px) | `PanelSection` (default card radius) |
| `rounded-2xl` (16px) | Landing `ModeCard` — bigger cards |
| `rounded-full` | Pills, avatars, play button |

Suggest canonizing: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`.

---

## Shadows

**No shadow tokens.** All hardcoded arbitrary values:
| Shadow | Where |
|---|---|
| `shadow-[0_0_32px_rgba(34,211,238,0.15)]` | ModeCard hover glow (cyan bloom) |
| `shadow-[0_8px_32px_rgba(0,0,0,0.4)]` | ModeCard resting elevation |
| `shadow-[0_0_8px_rgba(255,255,255,0.5)]` | TimeSlider thumb |
| `backdrop-blur-sm` | MapLegend, various overlays |

Suggest canonizing: `--shadow-card`, `--shadow-card-hover`, `--shadow-glow-accent`, `--shadow-thumb`.

---

## Motion

### Animations (in globals.css)
| Name | Duration | Easing | Where |
|---|---|---|---|
| `card-enter` | `0.5s` | `cubic-bezier(0.16, 1, 0.3, 1)` | Landing card entrance (staggered via `enterDelay` prop) |
| `ring-pulse` | `2.4s` infinite | default | Landing Explore preview |
| `hex-shimmer` | `2s` infinite | default | Landing Find preview |
| `bar-grow` | `0.6s` | `cubic-bezier` | Landing Rankings preview (staggered) |

All four are scoped to Landing. `prefers-reduced-motion: reduce` disables `card-enter` + `animate-ping`.

### Transitions (convention)
After S27 `/make-interfaces-feel-better` pass, we migrated *away* from `transition-all` to specific props:
- `transition-colors` — most interactive states
- `transition-[width]` — ReachStats bars
- `transition-[max-height]` — MobileBottomSheet
- `transition-[transform,background-color,border-color,box-shadow]` — ModeCard
- Active-state feedback: `active:scale-[0.96]` or `active:scale-[0.98]` on pressables

### Durations (convention)
- Default Tailwind (`duration-150`, `duration-200`) — most hovers
- `duration-300` — slower sheet/panel transitions
- `400ms` — TransitTrivia fade
- `2400ms / 2000ms` — decorative pulses

---

## Breakpoints

Uses Tailwind defaults. Observed usage:
| Prefix | Value | Where |
|---|---|---|
| default | mobile-first | base styles |
| `md:` | 768px | Almost all responsive branching (sidebar ↔ bottom sheet, grid columns) |
| `lg:`, `xl:` | Rarely used |

Mobile strategy = `MobileBottomSheet` pattern (shared by Explore + Find).

---

## Semantic gaps to close

Claude Design should propose tokens for these *semantic roles* that currently don't exist:

1. **Success** — currently ad-hoc `emerald-500` (MeetupSummary)
2. **Warning / caution** — currently ad-hoc `amber-500` (FairnessSlider)
3. **Destructive / error** — none (there's no real error UI)
4. **Muted text** — currently `text-white/50`, `/60`, `/70` scattered
5. **Link / inline action** — currently just `text-accent`
6. **Elevation system** — no shadow ramp; cards are flat + border, hover = glow
7. **Focus ring** — `ring-cyan-400 ring-offset-[#12131a]` (one place only — ModeLegend)

---

## Summary for Claude Design

**What's canonical:** 6 color variables, 2 font stacks, one animation keyframe set.

**What's convention-not-canonical:** opacity tint ladder, size scales, Panel padding, touch targets, mode + time-gradient palettes, MTA line palette.

**What should become tokens:** radii, shadows, spacing, touch-target, focus ring, semantic colors (success/warning/muted/link), animation durations + easings.

**Known "escape hatches" to preserve:**
- Wizard (Find page steps) uses red/pink brutalist theme — intentional, isolated. Do not blend with main dark theme.
- MTA line palette — ground truth, must stay exact.
