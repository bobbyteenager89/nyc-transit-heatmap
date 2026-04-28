# Mobile Map-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile Explore page to show the full map by default, with a tap-to-compute flow, minimal result card, and all advanced controls hidden behind an explicit menu button.

**Architecture:** Remove the always-open bottom sheet in favor of three distinct mobile states: (1) pre-tap instruction card, (2) post-compute slim result card with menu button, (3) explicit menu drawer for address/time/modes. Desktop layout is entirely unchanged. All three mobile states are new small components; `explore/page.tsx` conditionally renders them based on `origin` + `cells.length`.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS v4, TypeScript. No new dependencies.

---

## File Map

| File | Action | What it does |
|------|--------|--------------|
| `src/components/isochrone/mobile-instruction.tsx` | **Create** | Pre-tap bottom card: "Tap anywhere" + quick-start buttons |
| `src/components/isochrone/mobile-result-card.tsx` | **Create** | Post-compute slim card: address + time + menu button |
| `src/components/isochrone/mobile-bottom-sheet.tsx` | **Rewrite** | Menu drawer: opens on demand, has close button, contains address/time/modes/share |
| `src/app/explore/page.tsx` | **Modify** | Wire new components, replace `mobileExpanded` with `mobileMenuOpen`, hide desktop "drop a pin" overlay on mobile |

---

## Task 1: Replace `mobileExpanded` with `mobileMenuOpen` in explore/page.tsx

This is a state wiring change only — no new components yet. After this task, mobile shows a blank bottom area (broken-looking but a valid intermediate state we can test).

**Files:**
- Modify: `src/app/explore/page.tsx`

- [ ] **Step 1: Replace the state declaration**

In `src/app/explore/page.tsx`, find line 96:
```tsx
const [mobileExpanded, setMobileExpanded] = useState(true);
```
Replace with:
```tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

- [ ] **Step 2: Remove the setMobileExpanded(false) call inside runCompute**

Find the `runCompute` useCallback (around line 136):
```tsx
const runCompute = useCallback(
  async (loc: LatLng) => {
    await runComputeRaw(loc);
    setMobileExpanded(false);
  },
  [runComputeRaw]
);
```
Replace with:
```tsx
const runCompute = useCallback(
  async (loc: LatLng) => {
    await runComputeRaw(loc);
  },
  [runComputeRaw]
);
```

- [ ] **Step 3: Replace the mobile bottom sheet JSX at the bottom of the return**

Find (around line 762):
```tsx
{/* Mobile bottom sheet */}
<div className="md:hidden fixed inset-x-0 bottom-0 z-40">
  <MobileBottomSheet
    expanded={mobileExpanded}
    onToggle={() => setMobileExpanded((p) => !p)}
    summary={mobileSummary}
  >
    {sidebarControls}
  </MobileBottomSheet>
</div>
```
Replace with a placeholder comment (the real replacement comes in Task 5):
```tsx
{/* Mobile overlay — wired in Task 5 */}
```

- [ ] **Step 4: Delete the `mobileSummary` variable**

Find and delete the entire `mobileSummary` JSX block (it references `setMobileExpanded` and won't compile):
```tsx
const mobileSummary = (
  <div className="flex items-center justify-between">
    ...
  </div>
);
```

- [ ] **Step 5: Remove MobileBottomSheet import temporarily**

Find:
```tsx
import { MobileBottomSheet } from "@/components/isochrone/mobile-bottom-sheet";
```
Comment it out for now:
```tsx
// import { MobileBottomSheet } from "@/components/isochrone/mobile-bottom-sheet";
```

- [ ] **Step 6: Verify build passes**

```bash
cd ~/Projects/nyc-transit-heatmap && npm run build 2>&1 | tail -20
```
Expected: build completes, no TypeScript errors about `mobileExpanded` or `mobileSummary`.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/nyc-transit-heatmap
git add src/app/explore/page.tsx
git commit -m "refactor(mobile): swap mobileExpanded for mobileMenuOpen, stub mobile overlay"
```

---

## Task 2: Create MobileInstruction component

Pre-tap card shown when no origin is set on mobile. Full-width, sits at the bottom of the screen.

**Files:**
- Create: `src/components/isochrone/mobile-instruction.tsx`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

interface QuickStart {
  name: string;
  lat: number;
  lng: number;
}

interface MobileInstructionProps {
  onQuickStart: (name: string, lat: number, lng: number) => void;
}

const QUICK_STARTS: QuickStart[] = [
  { name: "Times Square", lat: 40.758, lng: -73.9855 },
  { name: "Williamsburg", lat: 40.7081, lng: -73.9571 },
  { name: "Astoria", lat: 40.7724, lng: -73.9301 },
];

export function MobileInstruction({ onQuickStart }: MobileInstructionProps) {
  return (
    <div className="absolute bottom-0 inset-x-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="bg-surface-card/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4">
        <p className="font-display italic uppercase text-white text-lg text-center mb-1">
          Tap anywhere on the map
        </p>
        <p className="font-body text-xs text-white/40 text-center mb-3">
          See how far you can travel in NYC
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          {QUICK_STARTS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => onQuickStart(loc.name, loc.lat, loc.lng)}
              className="px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-body hover:bg-accent/20 transition-colors"
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/Projects/nyc-transit-heatmap && npx tsc --noEmit 2>&1 | grep "mobile-instruction" | head -10
```
Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/nyc-transit-heatmap
git add src/components/isochrone/mobile-instruction.tsx
git commit -m "feat(mobile): add MobileInstruction pre-tap card"
```

---

## Task 3: Create MobileResultCard component

Slim bottom card shown after compute completes. Shows address + time + a menu button. Replaces the old collapsed bottom sheet.

**Files:**
- Create: `src/components/isochrone/mobile-result-card.tsx`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

interface MobileResultCardProps {
  address: string;
  maxMinutes: number;
  modeCount: number;
  onMenuOpen: () => void;
}

export function MobileResultCard({
  address,
  maxMinutes,
  modeCount,
  onMenuOpen,
}: MobileResultCardProps) {
  return (
    <div className="absolute bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="bg-surface-card/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display italic text-sm text-white truncate">
            {address || "Dropped pin"}
          </p>
          <p className="font-body text-xs text-white/40 mt-0.5">
            {maxMinutes} min · {modeCount} mode{modeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onMenuOpen}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Open settings"
        >
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor" aria-hidden="true">
            <rect y="0" width="14" height="2" rx="1" />
            <rect y="5" width="14" height="2" rx="1" />
            <rect y="10" width="14" height="2" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/Projects/nyc-transit-heatmap && npx tsc --noEmit 2>&1 | grep "mobile-result" | head -10
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/nyc-transit-heatmap
git add src/components/isochrone/mobile-result-card.tsx
git commit -m "feat(mobile): add MobileResultCard slim post-compute card"
```

---

## Task 4: Rewrite MobileBottomSheet as on-demand menu drawer

The existing component had expand/collapse states (used as the default mobile panel). The new version is a proper overlay drawer: hidden by default, opens when `open=true`, has a close button and a backdrop.

**Files:**
- Rewrite: `src/components/isochrone/mobile-bottom-sheet.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/isochrone/mobile-bottom-sheet.tsx` with:

```tsx
"use client";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileBottomSheet({ open, onClose, children }: MobileBottomSheetProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-surface border-t border-white/10 rounded-t-2xl max-h-[85dvh] flex flex-col">
        {/* Handle row */}
        <div className="relative flex items-center justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
          <button
            onClick={onClose}
            className="absolute right-4 text-white/40 hover:text-white text-2xl leading-none"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
          {children}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/Projects/nyc-transit-heatmap && npx tsc --noEmit 2>&1 | grep "mobile-bottom" | head -10
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/nyc-transit-heatmap
git add src/components/isochrone/mobile-bottom-sheet.tsx
git commit -m "refactor(mobile): rewrite MobileBottomSheet as on-demand menu drawer"
```

---

## Task 5: Wire the new mobile layout in explore/page.tsx

This task replaces the Task 1 placeholder with the real mobile layout. Adds `handleQuickStart` callback, strips non-essential controls from the mobile menu content, and conditionally renders `MobileInstruction` / `MobileResultCard` / `MobileBottomSheet`.

**Files:**
- Modify: `src/app/explore/page.tsx`

- [ ] **Step 1: Restore and update imports**

Find the commented-out MobileBottomSheet import and replace it with all three mobile component imports:
```tsx
import { MobileBottomSheet } from "@/components/isochrone/mobile-bottom-sheet";
import { MobileInstruction } from "@/components/isochrone/mobile-instruction";
import { MobileResultCard } from "@/components/isochrone/mobile-result-card";
```

- [ ] **Step 2: Add `handleQuickStart` callback**

After the `handleStationClick` callback (around line 289), add:
```tsx
const handleQuickStart = useCallback(
  (name: string, lat: number, lng: number) => {
    const latlng = { lat, lng };
    setOrigin(latlng);
    setOriginAddress(name);
    runCompute(latlng);
    updateURL(latlng, maxMinutes, activeModes, name);
  },
  [runCompute, updateURL, maxMinutes, activeModes]
);
```

- [ ] **Step 3: Create `mobileMenuContent` variable**

Add this just before the `return` statement. This is the stripped-down content for the mobile menu drawer — address, time, modes, share only. No transit trivia, no mode tabs, no View As, no advanced modes:

```tsx
const mobileMenuContent = (
  <>
    <PanelSection title="Location">
      <AddressAutocomplete
        label="Address"
        placeholder="Start typing an address…"
        onSelect={handleAddressSelect}
        initialValue={originAddress}
        autoFocus={false}
      />
      {!dataReady && (
        <p className="font-body text-xs text-white/40 animate-pulse">
          Loading transit data…
        </p>
      )}
    </PanelSection>

    <PanelSection>
      <div className="flex items-center gap-2">
        <PlayButton
          currentValue={maxMinutes}
          onChange={handleMaxMinutesChange}
          disabled={!origin || computing || cells.length === 0}
        />
        <div className="flex-1">
          <TimeSlider value={maxMinutes} onChange={handleMaxMinutesChange} />
        </div>
      </div>
    </PanelSection>

    <PanelSection title="Transport Modes">
      <ModeLegend
        activeModes={activeModes}
        onToggle={toggleMode}
        showAdvanced={false}
      />
    </PanelSection>

    {origin && !computing && cells.length > 0 && (
      <PanelSection>
        {(() => {
          const slug = encodeShareSlug({
            lat: origin.lat,
            lng: origin.lng,
            t: maxMinutes,
            m: activeModes,
            address: originAddress || undefined,
          });
          const url = `/p/${slug}`;
          const label = originAddress || "this spot";
          return (
            <ShareSheet
              url={url}
              title={`${maxMinutes}-minute reach from ${label}`}
              text={`See how far you can go in ${maxMinutes} minutes by ${activeModes.join(", ")} from ${label}.`}
            />
          );
        })()}
      </PanelSection>
    )}
  </>
);
```

- [ ] **Step 4: Hide the desktop "drop a pin" overlay on mobile**

Find the existing empty-state overlay (around line 644):
```tsx
{!origin && (
  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
```
Change to `hidden md:flex` so it only shows on desktop:
```tsx
{!origin && (
  <div className="absolute inset-0 hidden md:flex items-center justify-center z-10 pointer-events-none">
```

- [ ] **Step 5: Replace the mobile overlay placeholder**

Find the comment from Task 1:
```tsx
{/* Mobile overlay — wired in Task 5 */}
```

Replace with the full mobile overlay:
```tsx
{/* Mobile: instruction card — shown when no origin set */}
{!origin && (
  <div className="md:hidden">
    <MobileInstruction onQuickStart={handleQuickStart} />
  </div>
)}

{/* Mobile: result card — shown after compute */}
{origin && cells.length > 0 && !computing && (
  <div className="md:hidden">
    <MobileResultCard
      address={originAddress}
      maxMinutes={maxMinutes}
      modeCount={activeModes.length}
      onMenuOpen={() => setMobileMenuOpen(true)}
    />
  </div>
)}

{/* Mobile: menu drawer */}
<div className="md:hidden">
  <MobileBottomSheet
    open={mobileMenuOpen}
    onClose={() => setMobileMenuOpen(false)}
  >
    {mobileMenuContent}
  </MobileBottomSheet>
</div>
```

- [ ] **Step 6: Full build check**

```bash
cd ~/Projects/nyc-transit-heatmap && npm run build 2>&1 | tail -30
```
Expected: clean build, zero TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/nyc-transit-heatmap
git add src/app/explore/page.tsx
git commit -m "feat(mobile): wire map-first layout — instruction card, result card, menu drawer"
```

---

## Task 6: Verify the full mobile flow in browser

Tests the three states: pre-tap, post-compute, menu open.

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

```bash
cd ~/Projects/nyc-transit-heatmap && npm run dev
```

- [ ] **Step 2: Open in mobile emulation**

Open Chrome DevTools → toggle device toolbar → iPhone 14 Pro (393×852). Navigate to `http://localhost:3000/explore`.

- [ ] **Step 3: Verify pre-tap state**

Expected:
- Full map visible (no panel covering it)
- "Tap anywhere on the map" card at the bottom
- Quick-start buttons (Times Square, Williamsburg, Astoria) visible and tappable
- Desktop "drop a pin" overlay NOT visible on mobile

- [ ] **Step 4: Verify quick-start tap**

Tap "Times Square". Expected:
- "Computing…" overlay appears on map
- After compute: heatmap renders
- MobileResultCard appears at bottom with "Times Square" address and "30 min · 5 modes"
- Instruction card gone

- [ ] **Step 5: Verify map tap**

Reload. Tap anywhere on the map. Expected:
- Same flow as quick-start

- [ ] **Step 6: Verify menu drawer**

Tap the hamburger button on the result card. Expected:
- Backdrop appears
- Drawer slides up from bottom (max 85dvh)
- Address input, time slider, mode toggles, share button visible
- Tap × or backdrop → drawer closes, result card still visible

- [ ] **Step 7: Verify desktop unchanged**

Switch to desktop viewport (1440px wide). Expected:
- Sidebar still shows on left
- "Drop a pin" overlay still shows on empty map
- No mobile components visible
- All existing desktop functionality works

- [ ] **Step 8: Commit verification note**

```bash
cd ~/Projects/nyc-transit-heatmap
git commit --allow-empty -m "chore: mobile map-first flow verified in browser"
```

---

## Self-Review

**Spec coverage check:**
- ✅ "See all the map" — map is full viewport by default, no panel covering it
- ✅ "Can tap in the menu" — hamburger button on result card opens drawer
- ✅ "Given instructions" — MobileInstruction card visible pre-tap
- ✅ "Only main use case: click and see the chart" — quick-start and map tap both trigger compute directly, chart (heatmap) fills the map
- ✅ "Delay on design" — styles use existing tokens (`bg-surface-card`, `text-accent`, `font-display`, `font-body`) with no new design work

**Placeholder scan:**
- No TBDs, no "implement later", all code is complete

**Type consistency:**
- `handleQuickStart(name: string, lat: number, lng: number)` — matches `MobileInstruction`'s `onQuickStart` prop exactly
- `MobileBottomSheet` new interface: `{ open: boolean; onClose: () => void; children: ReactNode }` — used correctly in Task 5 Step 5
- `MobileResultCard` props: `{ address, maxMinutes, modeCount, onMenuOpen }` — all sourced from page state in Task 5 Step 5
