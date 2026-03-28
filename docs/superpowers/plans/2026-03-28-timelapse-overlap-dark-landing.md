# Time Lapse, Commute Overlap & Dark Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add time lapse animation (auto-blooming isochrone), commute overlap (two-person meet-in-the-middle), and redesign the landing page dark with map preview.

**Architecture:** Time lapse is a play/pause button that programmatically animates the existing slider from 5→60. Commute overlap adds a second origin with its own API isochrone fetch, rendering Person B's contours in a different color. Overlap zone is computed client-side as the intersection of both isochrone polygons. Landing page gets a dark theme with a static map background.

**Tech Stack:** Mapbox GL JS, Mapbox Isochrone API, React 19, Next.js 16, Tailwind CSS v4

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/isochrone/play-button.tsx` | Play/pause button that animates the time slider |
| Create | `src/components/isochrone/friend-input.tsx` | Second person address input with toggle |
| Modify | `src/components/isochrone/isochrone-map.tsx` | Add Person B contour layers + overlap highlight layer |
| Modify | `src/app/explore/page.tsx` | Add play button, friend state, second compute flow |
| Modify | `src/app/page.tsx` | Dark redesign with static Mapbox map background |
| Modify | `src/app/layout.tsx` | Remove p-3 padding for full-bleed landing |
| Modify | `src/components/landing/mode-card.tsx` | Dark theme styling |
| Modify | `src/lib/mapbox-isochrone.ts` | Add `personId` to IsochroneContour for multi-person |

---

## Person Colors

```
Person A (You):     blue    #3b82f6
Person B (Friend):  amber   #f59e0b
Overlap zone:       white   #ffffff (bright glow)
```

---

### Task 1: Dark landing page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/landing/mode-card.tsx`

- [ ] **Step 1: Update layout to support full-bleed pages**

In `src/app/layout.tsx`, remove the fixed `p-3` padding from the body. Each page will handle its own padding.

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  );
}
```

Then add `p-3` to the explore page and find page wrappers so they keep their existing padding. In `src/app/explore/page.tsx`, change the outermost `<div className="flex h-full">` to `<div className="flex h-full p-3">`. Same for `src/app/find/page.tsx`.

- [ ] **Step 2: Redesign the landing page dark**

Replace `src/app/page.tsx` with a dark-themed page that has a static Mapbox map in the background:

```tsx
import { ModeCard } from "@/components/landing/mode-card";

export default function LandingPage() {
  return (
    <div className="relative flex items-center justify-center h-full bg-[#0a0a12] overflow-hidden">
      {/* Static map background — CSS background image from Mapbox Static API */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-73.97,40.75,11,0/1400x900@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 max-w-2xl w-full px-6">
        <h1 className="text-5xl md:text-6xl text-center mb-2 text-white font-display italic uppercase">
          Transit<br />Heatmap
        </h1>
        <p className="text-center font-body text-sm text-white/40 mb-12">
          See how far you can go in NYC — by subway, bike, or foot
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModeCard
            href="/explore"
            title="Isochrone Explorer"
            description="Drop a pin and see how far you can go. Smooth contour rings show your reach by every mode."
            cta="Explore"
            primary
          />
          <ModeCard
            href="/find"
            title="Find My Neighborhood"
            description="Tell us where you go. We'll show you where to live to minimize your commute."
            cta="Get Started"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update ModeCard for dark theme**

Replace `src/components/landing/mode-card.tsx`:

```tsx
import Link from "next/link";

interface ModeCardProps {
  href: string;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
}

export function ModeCard({ href, title, description, cta, primary }: ModeCardProps) {
  return (
    <Link
      href={href}
      className={`border-2 p-8 flex flex-col gap-4 transition-all group ${
        primary
          ? "border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50"
          : "border-white/15 bg-white/[0.02] hover:bg-white/5 hover:border-white/30"
      }`}
    >
      <h2 className="text-2xl leading-tight text-white font-display italic uppercase">
        {title}
      </h2>
      <p className="font-body text-sm leading-relaxed text-white/50 group-hover:text-white/70">
        {description}
      </p>
      <span className="font-display italic uppercase text-lg mt-auto text-white/70 group-hover:text-white">
        {cta} &rarr;
      </span>
    </Link>
  );
}
```

- [ ] **Step 4: Verify build and check both pages still render**

Run: `npx tsc --noEmit && npm run build`
Expected: clean build

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/explore/page.tsx src/app/find/page.tsx src/components/landing/mode-card.tsx
git commit -m "feat: dark landing page with static map background"
```

---

### Task 2: Time lapse play button

**Files:**
- Create: `src/components/isochrone/play-button.tsx`
- Modify: `src/app/explore/page.tsx`

- [ ] **Step 1: Create the play button component**

Create `src/components/isochrone/play-button.tsx`:

```tsx
"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PlayButtonProps {
  /** Current slider value */
  currentValue: number;
  /** Called on each animation frame with the new value */
  onChange: (minutes: number) => void;
  /** Whether there's data to animate (disable if no origin) */
  disabled: boolean;
}

const MIN_TIME = 5;
const MAX_TIME = 60;
const DURATION_MS = 4000; // 4 seconds for full sweep

export function PlayButton({ currentValue, onChange, disabled }: PlayButtonProps) {
  const [playing, setPlaying] = useState(false);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const startValueRef = useRef(MIN_TIME);

  const stop = useCallback(() => {
    setPlaying(false);
    cancelAnimationFrame(animRef.current);
  }, []);

  const play = useCallback(() => {
    if (disabled) return;
    setPlaying(true);
    startTimeRef.current = performance.now();
    startValueRef.current = MIN_TIME;
    // Reset to start
    onChange(MIN_TIME);

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      // Ease-in-out for smooth feel
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const value = Math.round(MIN_TIME + eased * (MAX_TIME - MIN_TIME));

      onChange(value);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        // Hold at max for a moment, then stop
        setTimeout(() => setPlaying(false), 500);
      }
    }

    animRef.current = requestAnimationFrame(tick);
  }, [disabled, onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <button
      onClick={playing ? stop : play}
      disabled={disabled}
      className="w-full border-3 border-red font-display italic uppercase text-sm py-2.5 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red hover:text-pink"
      aria-label={playing ? "Stop animation" : "Play time lapse"}
    >
      {playing ? "■ Stop" : "▶ Play Time Lapse"}
    </button>
  );
}
```

- [ ] **Step 2: Add PlayButton to the explore page sidebar**

In `src/app/explore/page.tsx`, add the import:

```tsx
import { PlayButton } from "@/components/isochrone/play-button";
```

Add the PlayButton in the sidebar after the TimeSlider PanelSection, inside a new PanelSection:

```tsx
<PanelSection>
  <PlayButton
    currentValue={maxMinutes}
    onChange={handleMaxMinutesChange}
    disabled={!origin || computing || cells.length === 0}
  />
</PanelSection>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/isochrone/play-button.tsx src/app/explore/page.tsx
git commit -m "feat: add time lapse play button — auto-animates slider 5→60"
```

---

### Task 3: Add person ID to isochrone contours

**Files:**
- Modify: `src/lib/mapbox-isochrone.ts`

This adds a `personId` field to `IsochroneContour` so the map can distinguish Person A from Person B contours.

- [ ] **Step 1: Update IsochroneContour type and fetch functions**

In `src/lib/mapbox-isochrone.ts`, add `personId` to the interface and update fetch functions to accept and pass it through:

```typescript
export interface IsochroneContour {
  mode: TransportMode;
  minutes: number;
  personId: "a" | "b";
  polygon: GeoJSON.Feature;
}
```

Update `fetchIsochrone` signature to include `personId`:

```typescript
export async function fetchIsochrone(
  origin: LatLng,
  mode: TransportMode,
  maxMinutes: number,
  token: string,
  personId: "a" | "b" = "a"
): Promise<IsochroneContour[]> {
```

In the return mapping, add `personId`:

```typescript
return data.features.map((feature) => ({
  mode,
  minutes: feature.properties?.contour ?? 0,
  personId,
  polygon: {
    ...feature,
    properties: {
      ...feature.properties,
      mode,
      personId,
      minutes: feature.properties?.contour ?? 0,
    },
  },
}));
```

Update `fetchAllIsochrones` to accept and pass `personId`:

```typescript
export async function fetchAllIsochrones(
  origin: LatLng,
  modes: TransportMode[],
  maxMinutes: number,
  token: string,
  personId: "a" | "b" = "a"
): Promise<IsochroneContour[]> {
  const apiModes = modes.filter((m) => API_MODES.includes(m));
  if (apiModes.length === 0) return [];

  const results = await Promise.all(
    apiModes.map((mode) => fetchIsochrone(origin, mode, maxMinutes, token, personId))
  );

  return results.flat();
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors (personId defaults to "a" so existing callsites still work)

- [ ] **Step 3: Commit**

```bash
git add src/lib/mapbox-isochrone.ts
git commit -m "feat: add personId to IsochroneContour for multi-person support"
```

---

### Task 4: Friend input component

**Files:**
- Create: `src/components/isochrone/friend-input.tsx`

- [ ] **Step 1: Create the friend input component**

Create `src/components/isochrone/friend-input.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import type { LatLng } from "@/lib/types";

interface FriendInputProps {
  onSelect: (address: string, location: LatLng) => void;
  onRemove: () => void;
  initialValue?: string;
  hasResult: boolean;
}

export function FriendInput({ onSelect, onRemove, initialValue, hasResult }: FriendInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-display italic uppercase text-xs text-amber-500">
          Friend's Location
        </span>
        {hasResult && (
          <button
            onClick={onRemove}
            className="text-xs font-body text-red/50 hover:text-red cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
      <AddressAutocomplete
        label=""
        placeholder="Their address…"
        onSelect={onSelect}
        initialValue={initialValue ?? ""}
      />
      <p className="font-body text-[10px] text-red/40 leading-tight">
        See where your reachable areas overlap — the best place to meet.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/isochrone/friend-input.tsx
git commit -m "feat: add friend address input component for overlap mode"
```

---

### Task 5: Integrate overlap into explore page

**Files:**
- Modify: `src/app/explore/page.tsx`

This is the main integration task — adds friend state, second compute, passes both person contours to the map.

- [ ] **Step 1: Add friend state and compute**

In `src/app/explore/page.tsx`, add these imports:

```tsx
import { FriendInput } from "@/components/isochrone/friend-input";
```

Add friend state variables after the existing state:

```tsx
const [friendOrigin, setFriendOrigin] = useState<LatLng | null>(null);
const [friendAddress, setFriendAddress] = useState("");
const [friendContours, setFriendContours] = useState<IsochroneContour[]>([]);
const [showFriend, setShowFriend] = useState(false);
```

Add friend compute function after `runCompute`:

```tsx
const runFriendCompute = useCallback(
  async (loc: LatLng) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const contours = await fetchAllIsochrones(loc, ["walk", "bike", "car"], 60, token, "b");
    setFriendContours(contours);
  },
  []
);
```

Add friend handlers:

```tsx
const handleFriendSelect = useCallback(
  (address: string, location: LatLng) => {
    setFriendAddress(address);
    setFriendOrigin(location);
    runFriendCompute(location);
  },
  [runFriendCompute]
);

const removeFriend = useCallback(() => {
  setFriendOrigin(null);
  setFriendAddress("");
  setFriendContours([]);
  setShowFriend(false);
}, []);
```

- [ ] **Step 2: Combine contours for the map**

Add a merged contours array that combines both persons' contours:

```tsx
const allContours = [...apiContours, ...friendContours];
```

Pass `allContours` instead of `apiContours` to the IsochroneMap, and also pass `friendOrigin`:

```tsx
<IsochroneMap
  center={mapCenter}
  cells={cells}
  apiContours={allContours}
  activeModes={activeModes}
  maxMinutes={maxMinutes}
  onMapClick={handleMapClick}
  friendOrigin={friendOrigin}
/>
```

- [ ] **Step 3: Add friend UI to sidebar**

After the "Transport Modes" PanelSection, add:

```tsx
<PanelSection>
  {!showFriend && origin && !computing && cells.length > 0 ? (
    <button
      onClick={() => setShowFriend(true)}
      className="w-full border-3 border-red/50 font-display italic uppercase text-sm py-2 cursor-pointer hover:border-red hover:bg-red hover:text-pink transition-colors text-red/50 hover:text-pink"
    >
      + Add a Friend
    </button>
  ) : showFriend ? (
    <FriendInput
      onSelect={handleFriendSelect}
      onRemove={removeFriend}
      initialValue={friendAddress}
      hasResult={friendOrigin !== null}
    />
  ) : null}
</PanelSection>
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: will fail because IsochroneMap doesn't accept `friendOrigin` yet — that's Task 6

- [ ] **Step 5: Commit (WIP — map update in next task)**

```bash
git add src/app/explore/page.tsx
git commit -m "feat: add friend state, compute, and sidebar UI for overlap mode"
```

---

### Task 6: Update isochrone map for two-person rendering

**Files:**
- Modify: `src/components/isochrone/isochrone-map.tsx`

Add Person B contour layers in amber, and a Friend origin marker. The existing Person A contours stay blue-ish (mode colors). Person B gets amber fills.

- [ ] **Step 1: Update IsochroneMapProps**

Add `friendOrigin` to the props interface:

```tsx
interface IsochroneMapProps {
  center: LatLng;
  cells: HexCell[];
  apiContours: IsochroneContour[];
  activeModes: TransportMode[];
  maxMinutes: number;
  onMapClick?: (location: LatLng) => void;
  friendOrigin?: LatLng | null;
}
```

Accept it in the component destructuring.

- [ ] **Step 2: Add Person B source + layers in map init**

In the `m.on("load")` callback, after the Person A API layers, add Person B layers:

```tsx
// --- Person B (friend) API isochrone layers ---
m.addSource("friend-iso", {
  type: "geojson",
  data: { type: "FeatureCollection", features: [] },
});

m.addLayer({
  id: "friend-fill",
  type: "fill",
  source: "friend-iso",
  paint: {
    "fill-color": "#f59e0b", // amber
    "fill-opacity": 0,
  },
}, firstSymbol);

m.addLayer({
  id: "friend-line",
  type: "line",
  source: "friend-iso",
  paint: {
    "line-color": "#f59e0b",
    "line-width": 1.5,
    "line-opacity": 0,
  },
}, firstSymbol);
```

- [ ] **Step 3: Add friend marker ref and update effect**

Add a ref for the friend marker:

```tsx
const friendMarkerRef = useRef<mapboxgl.Marker | null>(null);
```

Add cleanup in the map teardown:

```tsx
friendMarkerRef.current?.remove();
```

Add a useEffect for the friend marker:

```tsx
// Friend origin marker (amber)
useEffect(() => {
  const m = mapRef.current;
  if (!m || !mapReady) return;

  friendMarkerRef.current?.remove();
  friendMarkerRef.current = null;

  if (friendOrigin) {
    const el = document.createElement("div");
    el.style.cssText =
      "width:14px;height:14px;background:#f59e0b;border:3px solid #f59e0b;border-radius:50%;box-shadow:0 0 20px rgba(245,158,11,0.9),0 0 40px rgba(245,158,11,0.4)";
    friendMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([friendOrigin.lng, friendOrigin.lat])
      .addTo(m);
  }
}, [friendOrigin, mapReady]);
```

- [ ] **Step 4: Update the API contour render effect to handle Person B**

In the existing API contour useEffect, split contours by personId. After the existing Person A loop, add Person B rendering:

```tsx
// Person B (friend) contours — amber
const friendSource = m.getSource("friend-iso") as mapboxgl.GeoJSONSource | undefined;
if (friendSource) {
  const friendContourData = apiContours
    .filter((c) => c.personId === "b" && c.minutes <= maxMinutes)
    .sort((a, b) => b.minutes - a.minutes);

  if (friendContourData.length === 0) {
    friendSource.setData({ type: "FeatureCollection", features: [] });
    m.setPaintProperty("friend-fill", "fill-opacity", 0);
    m.setPaintProperty("friend-line", "line-opacity", 0);
  } else {
    friendSource.setData({
      type: "FeatureCollection",
      features: friendContourData.map((c) => c.polygon),
    });
    m.setPaintProperty("friend-fill", "fill-opacity", 0.15);
    m.setPaintProperty("friend-line", "line-opacity", 0.6);
  }
}
```

Also update the Person A loop to only process `personId === "a"` contours:

```tsx
const contours = apiContours
  .filter((c) => c.personId === "a" && c.mode === mode && c.minutes <= maxMinutes)
  .sort((a, b) => b.minutes - a.minutes);
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean build

- [ ] **Step 6: Commit**

```bash
git add src/components/isochrone/isochrone-map.tsx
git commit -m "feat: add Person B amber contours and friend marker for overlap mode"
```

---

### Task 7: Test, verify, deploy

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all existing tests pass

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: clean build

- [ ] **Step 3: Manual test checklist**

Start: `npm run dev`

Verify:
1. Landing page: dark background, map preview, two cards
2. `/explore`: sidebar + dark map, address input works
3. Time lapse: play button animates slider 5→60, contours grow
4. Add a Friend: button appears after first compute
5. Enter friend address: amber contours appear for friend
6. Both isochrones visible simultaneously (blue Person A, amber Person B)
7. Slider adjusts both sets of contours
8. Remove friend: clears amber contours and marker
9. `/find`: still works with its own padding

- [ ] **Step 4: Push and deploy**

```bash
git push origin main
```

Verify at https://nyc-transit-heatmap.vercel.app

- [ ] **Step 5: Session commit**

```bash
git add -A
git commit -m "Session 6: time lapse, commute overlap, dark landing page"
```
