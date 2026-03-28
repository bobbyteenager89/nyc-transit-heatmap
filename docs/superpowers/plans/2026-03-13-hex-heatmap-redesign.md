# NYC Transit Heatmap v2 — Hex Grid Redesign

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the transit heatmap from scattered dots into a polished apartment-hunting tool with H3 hex tiles, two entry modes (Find My Neighborhood wizard + Explore the Map), autocomplete addresses, shareable URLs, and five delight features (hex tooltip breakdown, surprise insight, animated reveal, best neighborhood badge, share button).

**Architecture:** Client-side SPA using Next.js App Router. H3 hex grid (resolution 8, ~460m hexes) replaces circle grid. URL query params encode destinations for shareability (versioned `v=1`). Two entry paths converge on the same results view with hex tile Mapbox `fill` layer. All computation remains in Web Worker.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Mapbox GL JS, h3-js v4, @mapbox/search-js-react, nuqs (URL state), vitest

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/page.tsx` | Landing page — choice between Find/Explore modes |
| `src/app/find/page.tsx` | Wizard flow — guided destination entry → results |
| `src/app/explore/page.tsx` | Explore flow — address input → accessibility heatmap |
| `src/components/landing/mode-card.tsx` | Choice card component for landing page |
| `src/components/wizard/wizard-shell.tsx` | Wizard container with step navigation |
| `src/components/wizard/step-work.tsx` | "Where do you work?" step |
| `src/components/wizard/step-gym.tsx` | "Where do you work out?" step |
| `src/components/wizard/step-social.tsx` | "Where do friends live?" step |
| `src/components/wizard/step-extras.tsx` | "Anywhere else?" freeform step |
| `src/components/results/hex-map.tsx` | Mapbox map with H3 hex fill layer (replaces map-view.tsx) |
| `src/components/results/hex-tooltip.tsx` | Rich tooltip with per-destination breakdown |
| `src/components/results/results-sidebar.tsx` | Results sidebar with summary + edit |
| `src/components/results/best-neighborhood.tsx` | "Your best bet" badge component |
| `src/components/results/surprise-insight.tsx` | Counterintuitive finding callout |
| `src/components/results/share-button.tsx` | Copy URL / native share button |
| `src/components/shared/address-autocomplete.tsx` | Mapbox SearchBox wrapper component |
| `src/lib/hex.ts` | H3 hex grid generation + GeoJSON conversion |
| `src/lib/url-state.ts` | URL encode/decode for shareable state |
| `src/lib/__tests__/hex.test.ts` | Tests for hex grid generation |
| `src/lib/__tests__/url-state.test.ts` | Tests for URL encode/decode round-trip |

### Modified Files
| File | Changes |
|------|---------|
| `src/workers/grid-worker.ts` | Accept hex cell centers instead of rectangular grid; output per-cell results |
| `src/lib/grid.ts` | Pass hex centers to worker instead of generating rectangular grid |
| `src/lib/types.ts` | Add `HexCell`, `HexGridResult`, `WizardState`; remove `SetupState` |
| `src/lib/constants.ts` | Add `H3_RESOLUTION`, `CORE_NYC_BOUNDS`; remove `GRID_SPACING_DEG` |
| `src/app/layout.tsx` | Update metadata for SEO |
| `package.json` | Add h3-js, @mapbox/search-js-react, nuqs |

### Deleted Files
| File | Reason |
|------|--------|
| `src/components/results/map-view.tsx` | Replaced by `hex-map.tsx` |
| `src/components/setup/address-input.tsx` | Replaced by `address-autocomplete.tsx` |
| `src/app/results/page.tsx` | No longer needed (results integrated into find/explore) |
| `src/components/results/view-switch.tsx` | No longer needed (single composite view) |

### Unchanged Files (100% reuse)
- `src/lib/travel-time.ts` + tests
- `src/lib/cost.ts` + tests
- `src/lib/subway.ts` + tests
- `src/lib/citibike.ts`
- `src/lib/geocode.ts` (reverseGeocode still used for tooltips)
- `src/components/ui/chip.tsx`
- `src/components/ui/panel-section.tsx`
- `src/components/setup/mode-toggles.tsx`
- `src/components/setup/frequency-bars.tsx`
- `src/components/setup/destination-card.tsx`
- `src/components/setup/destination-list.tsx`
- `src/components/results/monthly-footer.tsx`

---

## Chunk 1: Foundation — Types, Constants, H3 Grid, URL State

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install h3-js, search-js-react, nuqs**

```bash
npm install h3-js @mapbox/search-js-react nuqs
```

- [ ] **Step 2: Verify h3-js works**

```bash
node -e "const h3 = require('h3-js'); console.log(h3.latLngToCell(40.7128, -74.0060, 8))"
```

Expected: prints an H3 cell index string like `"882a100d63fffff"`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add h3-js, @mapbox/search-js-react, nuqs dependencies"
```

---

### Task 2: Update types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add new types, remove dead type**

Replace the entire file with:

```typescript
export type TransportMode = "subway" | "car" | "bike" | "bikeSubway" | "walk";

export type DestinationCategory = "work" | "social" | "fitness" | "errands" | "other";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  category: DestinationCategory;
  frequency: number; // visits per week
  locations?: LatLng[]; // multiple locations (e.g., gym chains). If set, closest used per grid point
}

export interface GridPoint {
  lat: number;
  lng: number;
  times: Record<TransportMode, number | null>;
  fastest: TransportMode;
}

export interface CompositeGridPoint extends GridPoint {
  compositeScore: number; // total monthly minutes
}

/** H3 hex cell with computed travel data */
export interface HexCell {
  h3Index: string;
  center: LatLng;
  boundary: [number, number][]; // [lng, lat] pairs for GeoJSON polygon
  times: Record<TransportMode, number | null>;
  fastest: TransportMode;
  compositeScore: number; // total monthly minutes (0 = no destinations)
  /** Per-destination breakdown: destId → best travel time in minutes */
  destBreakdown: Record<string, number>;
}

export interface HexGridResult {
  cells: HexCell[];
}

export interface StationGraph {
  stations: Record<string, {
    name: string;
    lat: number;
    lng: number;
    lines: string[];
  }>;
  edges: Record<string, Record<string, number>>;
  transfers: Record<string, Record<string, number>>;
}

export interface StationMatrix {
  stationIds: string[];
  times: number[][]; // times[i][j] = minutes from stationIds[i] to stationIds[j]
}

export interface CitiBikeStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
}

export interface BoundingBox {
  sw: LatLng;
  ne: LatLng;
}

/** Shareable URL state — everything needed to reconstruct a heatmap */
export interface ShareableState {
  v: 1; // version for forward compat
  destinations: {
    n: string; // name
    a: string; // address
    lat: number;
    lng: number;
    c: DestinationCategory;
    f: number; // frequency
  }[];
  modes: TransportMode[];
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Some components may have type errors referencing removed `SetupState` — that's fine, those files will be replaced.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add HexCell, HexGridResult, ShareableState types; remove SetupState"
```

---

### Task 3: Update constants

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add new constants (keep all existing ones)**

**Important:** This step is ADDITIVE only. Keep all existing constants to avoid breaking `citibike.ts`, `grid-worker.ts`, and `page.tsx` which still import them. Old constants will be removed in Task 13 (cleanup) after the files that use them are deleted.

Add these lines to the END of `src/lib/constants.ts` (do not remove anything):

```typescript
// H3 hex grid
export const H3_RESOLUTION = 8; // ~460m edge length, ~3000 cells over core NYC

// Core NYC bounds (Manhattan + Brooklyn + nearby Queens)
export const CORE_NYC_BOUNDS: BoundingBox = {
  sw: { lat: 40.63, lng: -74.04 },
  ne: { lat: 40.83, lng: -73.87 },
};
```

- [ ] **Step 2: Run tests to verify nothing breaks**

```bash
npm test
```

Expected: All 19 tests pass. No existing imports are broken.

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add H3_RESOLUTION and CORE_NYC_BOUNDS constants"
```

---

### Task 4: H3 hex grid generation

**Files:**
- Create: `src/lib/hex.ts`
- Create: `src/lib/__tests__/hex.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/hex.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateHexCenters, hexCellToGeoJSON } from "../hex";
import type { BoundingBox } from "../types";

const NYC_BOUNDS: BoundingBox = {
  sw: { lat: 40.7, lng: -74.0 },
  ne: { lat: 40.8, lng: -73.9 },
};

describe("generateHexCenters", () => {
  it("returns hex cell IDs within bounds", () => {
    const cells = generateHexCenters(NYC_BOUNDS, 8);
    expect(cells.length).toBeGreaterThan(100);
    expect(cells.length).toBeLessThan(5000);
    // Every cell has required fields
    for (const cell of cells) {
      expect(cell.h3Index).toBeTruthy();
      expect(cell.center.lat).toBeGreaterThan(40.5);
      expect(cell.center.lat).toBeLessThan(41.0);
      expect(cell.center.lng).toBeGreaterThan(-74.2);
      expect(cell.center.lng).toBeLessThan(-73.5);
      expect(cell.boundary.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("returns no duplicates", () => {
    const cells = generateHexCenters(NYC_BOUNDS, 8);
    const ids = cells.map((c) => c.h3Index);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("hexCellToGeoJSON", () => {
  it("converts hex cells to a GeoJSON FeatureCollection with Polygon features", () => {
    const cells = generateHexCenters(NYC_BOUNDS, 8);
    const geojson = hexCellToGeoJSON(cells.slice(0, 5).map((c) => ({
      ...c,
      times: { walk: 10, car: 5, bike: 8, subway: 7, bikeSubway: 6 },
      fastest: "car" as const,
      compositeScore: 300,
      destBreakdown: {},
    })));
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(5);
    expect(geojson.features[0].geometry.type).toBe("Polygon");
    expect(geojson.features[0].properties.compositeScore).toBe(300);
    expect(geojson.features[0].properties.color).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/hex.test.ts
```

Expected: FAIL — module `../hex` not found.

- [ ] **Step 3: Implement hex.ts**

Create `src/lib/hex.ts`:

```typescript
import { polygonToCells, cellToLatLng, cellToBoundary } from "h3-js";
import type { BoundingBox, HexCell } from "./types";

interface HexCenterInfo {
  h3Index: string;
  center: { lat: number; lng: number };
  boundary: [number, number][]; // [lng, lat] for GeoJSON
}

/**
 * Generate H3 hex cell centers within a bounding box.
 * Returns cell IDs, centers, and polygon boundaries ready for Mapbox.
 */
export function generateHexCenters(bounds: BoundingBox, resolution: number): HexCenterInfo[] {
  // H3 polygonToCells expects [lat, lng] pairs
  const polygon = [
    [bounds.sw.lat, bounds.sw.lng],
    [bounds.sw.lat, bounds.ne.lng],
    [bounds.ne.lat, bounds.ne.lng],
    [bounds.ne.lat, bounds.sw.lng],
  ];

  const cellIds = polygonToCells(polygon, resolution, false);

  return cellIds.map((h3Index) => {
    const [lat, lng] = cellToLatLng(h3Index);
    // cellToBoundary returns [lat, lng][] — convert to [lng, lat][] for GeoJSON
    const rawBoundary = cellToBoundary(h3Index);
    const boundary: [number, number][] = rawBoundary.map(([bLat, bLng]) => [bLng, bLat]);

    return { h3Index, center: { lat, lng }, boundary };
  });
}

/**
 * Score mode (with destinations): hours/month coloring
 * 5 hrs/mo (green) -> 25 hrs/mo (yellow) -> 50+ hrs/mo (red)
 */
function hoursToColor(monthlyMinutes: number): string {
  const hours = monthlyMinutes / 60;
  const t = Math.min(Math.max(hours, 5), 50);
  const ratio = (t - 5) / 45;
  if (ratio < 0.4) {
    const r = Math.round((ratio / 0.4) * 255);
    return `rgba(${r}, 200, 50, 0.85)`;
  } else {
    const g = Math.round((1 - (ratio - 0.4) / 0.6) * 200);
    return `rgba(230, ${g}, 30, 0.85)`;
  }
}

/**
 * Accessibility mode (no destinations): time-based coloring
 * 5 min (green) -> 17 min (yellow) -> 40+ min (red)
 */
function timeToColor(minutes: number): string {
  const t = Math.min(Math.max(minutes, 5), 40);
  const ratio = (t - 5) / 35;
  if (ratio < 0.35) {
    const r = Math.round((ratio / 0.35) * 255);
    return `rgba(${r}, 200, 50, 0.85)`;
  } else {
    const g = Math.round((1 - (ratio - 0.35) / 0.65) * 200);
    return `rgba(230, ${g}, 30, 0.85)`;
  }
}

/**
 * Convert HexCells to a GeoJSON FeatureCollection for Mapbox fill layer.
 */
export function hexCellToGeoJSON(
  cells: HexCell[],
  hasDestinations: boolean = false
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = cells.map((cell) => {
    const color = hasDestinations
      ? hoursToColor(cell.compositeScore)
      : timeToColor(cell.compositeScore);

    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...cell.boundary, cell.boundary[0]]], // close the ring
      },
      properties: {
        h3Index: cell.h3Index,
        compositeScore: cell.compositeScore,
        color,
        fastest: cell.fastest,
        ...cell.times,
        destBreakdown: JSON.stringify(cell.destBreakdown),
      },
    };
  });

  return { type: "FeatureCollection", features };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/__tests__/hex.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hex.ts src/lib/__tests__/hex.test.ts
git commit -m "feat: add H3 hex grid generation and GeoJSON conversion"
```

---

### Task 5: URL state encoding/decoding

**Files:**
- Create: `src/lib/url-state.ts`
- Create: `src/lib/__tests__/url-state.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/url-state.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { encodeShareableState, decodeShareableState } from "../url-state";
import type { Destination, TransportMode } from "../types";

const SAMPLE_DESTINATIONS: Destination[] = [
  {
    id: "1",
    name: "Office",
    address: "123 Broadway, New York",
    location: { lat: 40.7128, lng: -74.006 },
    category: "work",
    frequency: 5,
  },
  {
    id: "2",
    name: "Equinox",
    address: "100 Greenwich St",
    location: { lat: 40.7095, lng: -74.0131 },
    category: "fitness",
    frequency: 3,
  },
];

const SAMPLE_MODES: TransportMode[] = ["subway", "bike", "bikeSubway"];

describe("URL state round-trip", () => {
  it("encodes and decodes destinations + modes losslessly", () => {
    const encoded = encodeShareableState(SAMPLE_DESTINATIONS, SAMPLE_MODES);
    expect(encoded).toContain("v=1");

    const decoded = decodeShareableState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.destinations.length).toBe(2);
    expect(decoded!.destinations[0].name).toBe("Office");
    expect(decoded!.destinations[0].category).toBe("work");
    expect(decoded!.destinations[0].frequency).toBe(5);
    expect(decoded!.destinations[0].location.lat).toBeCloseTo(40.7128, 3);
    expect(decoded!.destinations[0].location.lng).toBeCloseTo(-74.006, 3);
    expect(decoded!.modes).toEqual(SAMPLE_MODES);
  });

  it("returns null for malformed input", () => {
    expect(decodeShareableState("v=1&d=INVALID_BASE64!!!")).toBeNull();
    expect(decodeShareableState("")).toBeNull();
    expect(decodeShareableState("v=2&d=abc")).toBeNull(); // wrong version
  });

  it("handles empty destinations", () => {
    const encoded = encodeShareableState([], SAMPLE_MODES);
    const decoded = decodeShareableState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.destinations.length).toBe(0);
  });

  it("produces URL-safe strings", () => {
    const encoded = encodeShareableState(SAMPLE_DESTINATIONS, SAMPLE_MODES);
    // Should not contain characters that need URL encoding
    expect(encoded).not.toMatch(/[^a-zA-Z0-9=&_\-.+%]/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/url-state.test.ts
```

Expected: FAIL — module `../url-state` not found.

- [ ] **Step 3: Implement url-state.ts**

Create `src/lib/url-state.ts`:

```typescript
import type { Destination, TransportMode, ShareableState } from "./types";

/**
 * Encode destinations + modes into a URL query string.
 * Format: v=1&d=<base64-encoded JSON>&m=<comma-separated modes>
 */
export function encodeShareableState(
  destinations: Destination[],
  modes: TransportMode[]
): string {
  const state: ShareableState = {
    v: 1,
    destinations: destinations.map((d) => ({
      n: d.name,
      a: d.address,
      lat: Math.round(d.location.lat * 10000) / 10000,
      lng: Math.round(d.location.lng * 10000) / 10000,
      c: d.category,
      f: d.frequency,
    })),
    modes,
  };

  const json = JSON.stringify(state);
  const base64 = btoa(json);
  return `v=1&d=${encodeURIComponent(base64)}`;
}

/**
 * Decode a URL query string back into destinations + modes.
 * Returns null if the string is malformed or wrong version.
 */
export function decodeShareableState(
  queryString: string
): { destinations: Destination[]; modes: TransportMode[] } | null {
  try {
    const params = new URLSearchParams(queryString);
    const version = params.get("v");
    if (version !== "1") return null;

    const encoded = params.get("d");
    if (!encoded) return null;

    const json = atob(decodeURIComponent(encoded));
    const state: ShareableState = JSON.parse(json);

    if (!state.destinations || !state.modes) return null;

    const destinations: Destination[] = state.destinations.map((d, i) => ({
      id: crypto.randomUUID(),
      name: d.n,
      address: d.a,
      location: { lat: d.lat, lng: d.lng },
      category: d.c,
      frequency: d.f,
    }));

    return { destinations, modes: state.modes };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/__tests__/url-state.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-state.ts src/lib/__tests__/url-state.test.ts
git commit -m "feat: add URL state encoding/decoding with v=1 versioning"
```

---

## Chunk 2: Autocomplete + Worker Update

### Task 6: Address autocomplete component

**Files:**
- Create: `src/components/shared/address-autocomplete.tsx`

This wraps `@mapbox/search-js-react` `SearchBox` component with our styling and NYC bounding box. **Note:** `@mapbox/search-js-react` uses Web Components internally which requires `"use client"` and may need dynamic import to avoid SSR issues.

- [ ] **Step 1: Create the component**

Create `src/components/shared/address-autocomplete.tsx`:

```typescript
"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import type { LatLng } from "@/lib/types";

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (address: string, location: LatLng) => void;
  initialValue?: string;
  autoFocus?: boolean;
}

/**
 * Address input with Mapbox Search autocomplete suggestions.
 * Uses the Mapbox Geocoding API directly for reliability with React 19 / Next.js 16.
 * Debounces at 300ms and restricts to NYC bounding box.
 */
export function AddressAutocomplete({
  label,
  placeholder = "Start typing an address\u2026",
  onSelect,
  initialValue = "",
  autoFocus = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<
    { place_name: string; center: [number, number] }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const NYC_BBOX = "-74.04,40.63,-73.87,40.83";

  const fetchSuggestions = useCallback(
    async (text: string) => {
      if (text.length < 3) {
        setSuggestions([]);
        return;
      }
      const encoded = encodeURIComponent(text);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&bbox=${NYC_BBOX}&limit=5&types=address,poi`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(
          (data.features || []).map((f: { place_name: string; center: [number, number] }) => ({
            place_name: f.place_name,
            center: f.center,
          }))
        );
        setShowDropdown(true);
        setSelectedIndex(-1);
      } catch {
        // Silently ignore network errors — suggestions will just not appear
      }
    },
    [token]
  );

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
    },
    [fetchSuggestions]
  );

  const handleSelect = useCallback(
    (suggestion: { place_name: string; center: [number, number] }) => {
      setQuery(suggestion.place_name);
      setShowDropdown(false);
      setSuggestions([]);
      onSelect(suggestion.place_name, {
        lat: suggestion.center[1],
        lng: suggestion.center[0],
      });
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [showDropdown, suggestions, selectedIndex, handleSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <label className="font-bold uppercase text-xs tracking-widest">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        name="address"
        autoComplete="off"
        autoFocus={autoFocus}
        className="bg-transparent border-3 border-red text-red font-body text-base p-3 outline-none focus-visible:ring-2 focus-visible:ring-red placeholder:text-red/50 focus:bg-red focus:text-pink"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 bg-pink border-3 border-red border-t-0 z-50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_name}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => handleSelect(s)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === selectedIndex ? "bg-red text-pink" : "hover:bg-red/10"
              }`}
            >
              {s.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Design note:** We use the raw Mapbox Geocoding v5 API instead of `@mapbox/search-js-react`'s `<SearchBox>` component because it has known compatibility issues with React 19 / Next.js 16 (Web Component wrapper conflicts). The raw API gives us full control over styling and keyboard navigation while still providing autocomplete suggestions.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Component is not yet used anywhere.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/address-autocomplete.tsx
git commit -m "feat: add address autocomplete component with Mapbox geocoding"
```

---

### Task 7: Update web worker for hex grid

**Files:**
- Modify: `src/workers/grid-worker.ts`
- Modify: `src/lib/grid.ts`

The worker currently generates a rectangular grid of points. Change it to accept pre-computed hex cell centers from the caller, and output `HexCell` results with per-destination breakdown.

- [ ] **Step 1: Update grid.ts to accept hex centers**

Replace `src/lib/grid.ts`:

```typescript
import type { Destination, TransportMode, HexCell, HexGridResult, StationGraph, StationMatrix, CitiBikeStation, LatLng } from "./types";

export type { HexGridResult };

let activeWorker: Worker | null = null;

export interface HexWorkerInput {
  hexCenters: { h3Index: string; lat: number; lng: number }[];
  origin: LatLng | null; // null for wizard mode (no single origin)
  destinations: Destination[];
  modes: TransportMode[];
  stationGraph: StationGraph;
  stationMatrix: StationMatrix;
  citiBikeStations: CitiBikeStation[];
}

export function computeHexGrid(input: HexWorkerInput): Promise<HexGridResult> {
  // Cancel any in-flight worker
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/grid-worker.ts", import.meta.url));
    activeWorker = worker;

    // 30s timeout
    const timeout = setTimeout(() => {
      worker.terminate();
      activeWorker = null;
      reject(new Error("Grid computation timed out after 30s"));
    }, 30000);

    worker.onmessage = (e: MessageEvent<HexGridResult>) => {
      clearTimeout(timeout);
      resolve(e.data);
      activeWorker = null;
      worker.terminate();
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      reject(new Error(e.message));
      activeWorker = null;
      worker.terminate();
    };

    worker.postMessage(input);
  });
}
```

- [ ] **Step 2: Update grid-worker.ts**

Replace `src/workers/grid-worker.ts` entirely:

```typescript
import type { LatLng, TransportMode, CitiBikeStation, Destination, StationGraph, StationMatrix } from "../lib/types";
import { WALK_SPEED, BIKE_SPEED, DRIVE_SPEED_MANHATTAN, DRIVE_SPEED_OUTER, MANHATTAN_BOUNDARY_LAT, BIKE_DOCK_TIME_MIN, BIKE_DOCK_RANGE_MI, SUBWAY_MAX_WALK_MI, BIKE_SUBWAY_DOCK_RANGE_MI, BIKE_SAVINGS_PERCENT, BIKE_SAVINGS_MIN, WEEKS_PER_MONTH } from "../lib/constants";

// --- Inline distance/travel calculations (can't import lib in worker) ---

const DEG_LAT_MI = 69.0;
const DEG_LNG_MI = 52.3;

function manhattanDist(a: LatLng, b: LatLng): number {
  return Math.abs(a.lat - b.lat) * DEG_LAT_MI + Math.abs(a.lng - b.lng) * DEG_LNG_MI;
}

function walkMin(from: LatLng, to: LatLng): number {
  return (manhattanDist(from, to) / WALK_SPEED) * 60;
}

function bikeMin(from: LatLng, to: LatLng): number {
  return (manhattanDist(from, to) / BIKE_SPEED) * 60 + BIKE_DOCK_TIME_MIN * 2;
}

function driveMin(from: LatLng, to: LatLng): number {
  const inManhattan = from.lat <= MANHATTAN_BOUNDARY_LAT && from.lng >= -74.02 && from.lng <= -73.9 &&
    to.lat <= MANHATTAN_BOUNDARY_LAT && to.lng >= -74.02 && to.lng <= -73.9;
  const speed = inManhattan ? DRIVE_SPEED_MANHATTAN : DRIVE_SPEED_OUTER;
  return (manhattanDist(from, to) / speed) * 60;
}

// --- Station helpers ---

function buildStationIdxMap(ids: string[]): Map<string, number> {
  return new Map(ids.map((id, i) => [id, i]));
}

function findNearestStations(point: LatLng, stations: Record<string, { lat: number; lng: number }>, maxDist: number, count: number) {
  return Object.entries(stations)
    .map(([id, s]) => ({ id, dist: manhattanDist(point, { lat: s.lat, lng: s.lng }) }))
    .filter((s) => s.dist <= maxDist)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count);
}

function findNearestDock(point: LatLng, docks: CitiBikeStation[], maxDist: number): CitiBikeStation | null {
  let best: CitiBikeStation | null = null;
  let bestDist = maxDist;
  for (const d of docks) {
    const dist = manhattanDist(point, { lat: d.lat, lng: d.lng });
    if (dist < bestDist) { bestDist = dist; best = d; }
  }
  return best;
}

function computeSubwayTime(
  from: LatLng, to: LatLng,
  stations: Record<string, { lat: number; lng: number }>,
  matrix: number[][], idxMap: Map<string, number>
): number | null {
  const nearFrom = findNearestStations(from, stations, SUBWAY_MAX_WALK_MI, 3);
  const nearTo = findNearestStations(to, stations, SUBWAY_MAX_WALK_MI, 3);
  if (nearFrom.length === 0 || nearTo.length === 0) return null;
  let best = Infinity;
  for (const f of nearFrom) {
    const fi = idxMap.get(f.id);
    if (fi === undefined) continue;
    const walkToStation = (f.dist / WALK_SPEED) * 60;
    for (const t of nearTo) {
      const ti = idxMap.get(t.id);
      if (ti === undefined) continue;
      const stationTime = matrix[fi][ti];
      if (stationTime >= 999) continue;
      const walkFromStation = (t.dist / WALK_SPEED) * 60;
      const total = walkToStation + stationTime + walkFromStation;
      if (total < best) best = total;
    }
  }
  return best === Infinity ? null : Math.round(best * 10) / 10;
}

function computeBikeSubwayTime(
  from: LatLng, to: LatLng,
  stations: Record<string, { lat: number; lng: number }>,
  matrix: number[][], idxMap: Map<string, number>,
  docks: CitiBikeStation[]
): number | null {
  const nearFrom = findNearestStations(from, stations, SUBWAY_MAX_WALK_MI, 3);
  const nearTo = findNearestStations(to, stations, SUBWAY_MAX_WALK_MI, 3);
  if (nearFrom.length === 0 || nearTo.length === 0) return null;
  const plainSubway = computeSubwayTime(from, to, stations, matrix, idxMap);
  if (plainSubway === null) return null;
  let best = plainSubway;
  for (const f of nearFrom) {
    const fi = idxMap.get(f.id);
    if (fi === undefined) continue;
    const stationLoc = stations[f.id];
    const dockNearStation = findNearestDock(stationLoc, docks, BIKE_SUBWAY_DOCK_RANGE_MI);
    if (!dockNearStation) continue;
    const bikeToStation = bikeMin(from, { lat: dockNearStation.lat, lng: dockNearStation.lng });
    const walkToStation = walkMin(from, stationLoc);
    const useBikeIn = (walkToStation - bikeToStation) >= BIKE_SAVINGS_MIN ||
      (walkToStation > 0 && (walkToStation - bikeToStation) / walkToStation >= BIKE_SAVINGS_PERCENT);
    const legIn = useBikeIn ? bikeToStation : walkToStation;
    for (const t of nearTo) {
      const ti = idxMap.get(t.id);
      if (ti === undefined) continue;
      const stationTime = matrix[fi][ti];
      if (stationTime >= 999) continue;
      const destStationLoc = stations[t.id];
      const walkOut = (t.dist / WALK_SPEED) * 60;
      const v1 = legIn + stationTime + walkOut;
      if (v1 < best) best = v1;
      const dockNearDest = findNearestDock(destStationLoc, docks, BIKE_SUBWAY_DOCK_RANGE_MI);
      if (dockNearDest) {
        const bikeFromStation = bikeMin({ lat: dockNearDest.lat, lng: dockNearDest.lng }, to);
        const useBikeOut = (walkOut - bikeFromStation) >= BIKE_SAVINGS_MIN ||
          (walkOut > 0 && (walkOut - bikeFromStation) / walkOut >= BIKE_SAVINGS_PERCENT);
        const legOut = useBikeOut ? bikeFromStation : walkOut;
        const v2 = legIn + stationTime + legOut;
        if (v2 < best) best = v2;
      }
    }
  }
  return Math.round(best * 10) / 10;
}

// --- Compute travel times from a point to a destination ---

function computeTimesForLocation(
  point: LatLng, destLoc: LatLng, modes: TransportMode[],
  stationGraph: StationGraph, stationMatrix: { times: number[][] },
  idxMap: Map<string, number>, citiBikeStations: CitiBikeStation[]
): Record<TransportMode, number | null> {
  const times: Record<TransportMode, number | null> = {
    walk: modes.includes("walk") ? walkMin(point, destLoc) : null,
    car: modes.includes("car") ? driveMin(point, destLoc) : null,
    bike: null, subway: null, bikeSubway: null,
  };
  if (modes.includes("bike")) {
    const hasDockOrigin = findNearestDock(point, citiBikeStations, BIKE_DOCK_RANGE_MI);
    const hasDockDest = findNearestDock(destLoc, citiBikeStations, BIKE_DOCK_RANGE_MI);
    if (hasDockOrigin && hasDockDest) times.bike = bikeMin(point, destLoc);
  }
  if (modes.includes("subway")) {
    times.subway = computeSubwayTime(point, destLoc, stationGraph.stations, stationMatrix.times, idxMap);
  }
  if (modes.includes("bikeSubway")) {
    times.bikeSubway = computeBikeSubwayTime(point, destLoc, stationGraph.stations, stationMatrix.times, idxMap, citiBikeStations);
  }
  return times;
}

function getFastestTime(times: Record<TransportMode, number | null>): { fastest: TransportMode; time: number } {
  let fastest: TransportMode = "walk";
  let fastestTime = Infinity;
  for (const [mode, time] of Object.entries(times)) {
    if (time !== null && time < fastestTime) { fastestTime = time; fastest = mode as TransportMode; }
  }
  return { fastest, time: fastestTime };
}

// --- Main worker handler ---

interface WorkerInput {
  hexCenters: { h3Index: string; lat: number; lng: number }[];
  origin: LatLng | null;
  destinations: Destination[];
  modes: TransportMode[];
  stationGraph: StationGraph;
  stationMatrix: StationMatrix;
  citiBikeStations: CitiBikeStation[];
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { hexCenters, origin, destinations, modes, stationGraph, stationMatrix, citiBikeStations } = e.data;
  const idxMap = buildStationIdxMap(stationMatrix.stationIds);

  // Explore mode (no destinations, has origin): accessibility from origin
  if (destinations.length === 0 && origin) {
    const cells = hexCenters.map((hex) => {
      const point: LatLng = { lat: hex.lat, lng: hex.lng };
      const times = computeTimesForLocation(point, origin, modes, stationGraph, stationMatrix, idxMap, citiBikeStations);
      const { fastest, time } = getFastestTime(times);
      return {
        h3Index: hex.h3Index,
        times,
        fastest,
        compositeScore: time === Infinity ? 999 : Math.round(time * 10) / 10,
        destBreakdown: {} as Record<string, number>,
      };
    });
    self.postMessage({ cells });
    return;
  }

  // Score mode (with destinations): total monthly minutes per hex cell
  const cells = hexCenters.map((hex) => {
    const point: LatLng = { lat: hex.lat, lng: hex.lng };
    let totalMonthlyMinutes = 0;
    const aggTimes: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, subway: null, bikeSubway: null };
    const destBreakdown: Record<string, number> = {};

    for (const dest of destinations) {
      const destLocations = dest.locations && dest.locations.length > 0 ? dest.locations : [dest.location];
      let bestTime = Infinity;
      let bestTimes: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, subway: null, bikeSubway: null };

      for (const destLoc of destLocations) {
        const locTimes = computeTimesForLocation(point, destLoc, modes, stationGraph, stationMatrix, idxMap, citiBikeStations);
        const { time } = getFastestTime(locTimes);
        if (time < bestTime) { bestTime = time; bestTimes = locTimes; }
      }

      // Aggregate times (keep shortest per mode across all destinations)
      for (const [mode, t] of Object.entries(bestTimes)) {
        if (t !== null && (aggTimes[mode as TransportMode] === null || t < aggTimes[mode as TransportMode]!)) {
          aggTimes[mode as TransportMode] = t;
        }
      }

      if (bestTime < Infinity) {
        totalMonthlyMinutes += bestTime * dest.frequency * 2 * WEEKS_PER_MONTH;
        destBreakdown[dest.id] = Math.round(bestTime * 10) / 10;
      }
    }

    const { fastest } = getFastestTime(aggTimes);

    return {
      h3Index: hex.h3Index,
      times: aggTimes,
      fastest,
      compositeScore: totalMonthlyMinutes > 0 ? Math.round(totalMonthlyMinutes * 10) / 10 : 999,
      destBreakdown,
    };
  });

  self.postMessage({ cells });
};
```

- [ ] **Step 3: Run existing tests (some may break due to type changes)**

```bash
npm test
```

Expected: Core travel-time, cost, and subway tests still pass (19 tests). Build may have issues with old references to `GridResult` in `page.tsx` — that's expected since we're replacing that page.

- [ ] **Step 4: Commit**

```bash
git add src/lib/grid.ts src/workers/grid-worker.ts
git commit -m "feat: update worker for hex grid with per-destination breakdown and timeout"
```

---

## Chunk 3: Landing Page + Explore Mode

### Task 8: Landing page

**Files:**
- Create: `src/components/landing/mode-card.tsx`
- Rewrite: `src/app/page.tsx`

- [ ] **Step 1: Create mode-card component**

Create `src/components/landing/mode-card.tsx`:

```typescript
import Link from "next/link";

interface ModeCardProps {
  href: string;
  title: string;
  description: string;
  cta: string;
}

export function ModeCard({ href, title, description, cta }: ModeCardProps) {
  return (
    <Link
      href={href}
      className="border-3 border-red p-8 flex flex-col gap-4 hover:bg-red hover:text-pink transition-colors group"
    >
      <h2 className="text-3xl">{title}</h2>
      <p className="font-body text-sm leading-relaxed group-hover:text-pink/80">
        {description}
      </p>
      <span className="font-display italic uppercase text-lg mt-auto">
        {cta} &rarr;
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: Rewrite the landing page**

Replace `src/app/page.tsx` entirely:

```typescript
import { ModeCard } from "@/components/landing/mode-card";

export default function LandingPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-2xl w-full px-4">
        <h1 className="text-5xl md:text-6xl text-center mb-2">
          Transit<br />Heatmap
        </h1>
        <p className="text-center font-body text-sm text-red/60 mb-12">
          Find the NYC neighborhood that minimizes your commute
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModeCard
            href="/find"
            title="Find My Neighborhood"
            description="Tell us where you work, work out, and hang out. We'll show you where to live to minimize your monthly transit time."
            cta="Get Started"
          />
          <ModeCard
            href="/explore"
            title="Explore the Map"
            description="Enter any address and instantly see how long it takes to get anywhere in NYC by subway, bike, or foot."
            cta="Explore"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds (may warn about unused imports in old components — that's fine, we'll clean up later).

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/landing/mode-card.tsx
git commit -m "feat: add landing page with Find/Explore mode choice"
```

---

### Task 9: Hex map component

**Files:**
- Create: `src/components/results/hex-map.tsx`

This replaces `map-view.tsx`. Renders H3 hex polygons as a Mapbox `fill` layer with water masking, animated reveal, tooltips, and pin drop support.

- [ ] **Step 1: Create hex-map.tsx**

Create `src/components/results/hex-map.tsx`:

```typescript
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { HexCell, LatLng, Destination, DestinationCategory } from "@/lib/types";
import { hexCellToGeoJSON } from "@/lib/hex";
import { reverseGeocode } from "@/lib/geocode";

interface HexMapProps {
  center: LatLng;
  cells: HexCell[];
  destinations: Destination[];
  hasDestinations: boolean;
  pinDropMode?: boolean;
  onMapClick?: (location: LatLng) => void;
  pendingPin?: LatLng | null;
  onPinConfirm?: (name: string, category: DestinationCategory) => void;
  onPinCancel?: () => void;
}

const PIN_DROP_CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "social", label: "Social" },
  { key: "work", label: "Work" },
  { key: "fitness", label: "Fitness" },
  { key: "errands", label: "Errands" },
  { key: "other", label: "Other" },
];

export function HexMap({
  center, cells, destinations, hasDestinations,
  pinDropMode, onMapClick, pendingPin, onPinConfirm, onPinCancel,
}: HexMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const geocodeCache = useRef<Map<string, string>>(new Map());

  const [pinName, setPinName] = useState("");
  const [pinCategory, setPinCategory] = useState<DestinationCategory>("social");

  // Animation state
  const animationRef = useRef<number>(0);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [center.lng, center.lat],
      zoom: 11.5,
    });
    mapRef.current = m;

    m.on("load", () => {
      // Hex fill source
      m.addSource("hex-grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      const firstSymbol = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      // Hex fill layer (below labels)
      m.addLayer({
        id: "hex-fill",
        type: "fill",
        source: "hex-grid",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0, // starts at 0 for animation
        },
      }, firstSymbol);

      // Hex outline
      m.addLayer({
        id: "hex-outline",
        type: "line",
        source: "hex-grid",
        paint: {
          "line-color": "#fcdde8",
          "line-width": 0.5,
          "line-opacity": 0,
        },
      }, firstSymbol);

      // Water mask
      try {
        m.addLayer({
          id: "water-mask",
          type: "fill",
          source: "composite",
          "source-layer": "water",
          paint: { "fill-color": "#d4dadc", "fill-opacity": 1 },
        }, firstSymbol);
      } catch {
        // Skip if water source unavailable
      }

      // Click handler for pin drop
      m.on("click", (e) => {
        // Check if click is on water
        const waterFeatures = m.queryRenderedFeatures(e.point, { layers: ["water-mask"] });
        if (waterFeatures.length > 0) {
          // On water — don't allow pin drop
          return;
        }
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // Hover tooltip
      m.on("mousemove", "hex-fill", async (e) => {
        if (!e.features?.[0]) return;
        m.getCanvas().style.cursor = "pointer";
        const props = e.features[0].properties!;

        // Reverse geocode hex center
        const geom = e.features[0].geometry as GeoJSON.Polygon;
        const centerCoord = geom.coordinates[0].reduce(
          (acc, c) => [acc[0] + c[0] / geom.coordinates[0].length, acc[1] + c[1] / geom.coordinates[0].length],
          [0, 0]
        );
        const cacheKey = `${centerCoord[1].toFixed(3)},${centerCoord[0].toFixed(3)}`;
        let address = geocodeCache.current.get(cacheKey);
        if (!address) {
          address = await reverseGeocode(
            { lat: centerCoord[1], lng: centerCoord[0] },
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
          );
          geocodeCache.current.set(cacheKey, address);
        }

        // Build tooltip lines
        const modes = ["subway", "car", "bike", "bikeSubway", "walk"];
        const modeLines = modes
          .filter((mode) => props[mode] !== null && props[mode] !== undefined)
          .map((mode) => {
            const label = mode === "bikeSubway" ? "Bike+Sub" : mode.charAt(0).toUpperCase() + mode.slice(1);
            const val = Math.round(props[mode]);
            const isFastest = mode === props.fastest;
            return isFastest ? `**${label}: ${val}m**` : `${label}: ${val}m`;
          })
          .join(" \u00b7 ");

        // Per-destination breakdown
        let breakdownLines = "";
        if (props.destBreakdown && props.destBreakdown !== "{}") {
          try {
            const breakdown = JSON.parse(props.destBreakdown) as Record<string, number>;
            const entries = Object.entries(breakdown);
            if (entries.length > 0) {
              const hours = props.compositeScore / 60;
              breakdownLines = `\n${hours.toFixed(1)} hrs/mo total`;
            }
          } catch {
            // ignore
          }
        }

        setTooltipContent(`${address}\n${modeLines}${breakdownLines}`);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "hex-fill", () => {
        m.getCanvas().style.cursor = "";
        setTooltipContent(null);
      });

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      m.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Update hex data with animated reveal
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const geojson = hexCellToGeoJSON(cells, hasDestinations);
    const source = m.getSource("hex-grid") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);

      // Animated reveal: fade in over 500ms
      cancelAnimationFrame(animationRef.current);
      const start = performance.now();
      const duration = 500;

      function animate(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        m!.setPaintProperty("hex-fill", "fill-opacity", eased * 0.85);
        m!.setPaintProperty("hex-outline", "line-opacity", eased * 0.4);
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [cells, hasDestinations, mapReady]);

  // Destination markers
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    for (const dest of destinations) {
      const el = document.createElement("div");
      const label = document.createElement("div");
      label.style.cssText = "background:#e21822;color:#fcdde8;padding:2px 6px;font-size:11px;font-weight:bold;font-family:Arial Black;font-style:italic;text-transform:uppercase;white-space:nowrap";
      label.textContent = dest.name;
      el.appendChild(label);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([dest.location.lng, dest.location.lat])
        .addTo(m);
      markersRef.current.push(marker);
    }
  }, [destinations]);

  return (
    <div className="relative flex-1 h-full">
      <div
        ref={mapContainer}
        className={`w-full h-full ${pinDropMode ? "cursor-crosshair" : ""}`}
      />

      {/* Pin drop mode indicator */}
      {pinDropMode && (
        <div role="status" aria-live="polite" className="absolute top-4 left-1/2 -translate-x-1/2 bg-red text-pink px-4 py-2 z-20 font-display italic uppercase text-sm">
          Click anywhere on the map to drop a pin
        </div>
      )}

      {/* Pending pin form */}
      {pendingPin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-pink border-3 border-red p-4 z-30 w-72">
          <p className="text-xs uppercase font-bold tracking-widest mb-3">Name This Pin</p>
          <input
            type="text"
            value={pinName}
            onChange={(e) => setPinName(e.target.value)}
            placeholder="e.g. Jake's place\u2026"
            autoFocus
            name="pin-name"
            autoComplete="off"
            className="w-full bg-transparent border-3 border-red text-red p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-red placeholder:text-red/50 focus:bg-red focus:text-pink mb-3"
            onKeyDown={(e) => {
              if (e.key === "Enter" && pinName.trim()) {
                onPinConfirm?.(pinName.trim(), pinCategory);
                setPinName("");
              }
            }}
          />
          <div className="flex gap-1 flex-wrap mb-3">
            {PIN_DROP_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setPinCategory(c.key)}
                className={`text-xs border-2 border-red px-2 py-1 uppercase font-bold cursor-pointer ${
                  pinCategory === c.key ? "bg-red text-pink" : ""
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (pinName.trim()) {
                  onPinConfirm?.(pinName.trim(), pinCategory);
                  setPinName("");
                }
              }}
              disabled={!pinName.trim()}
              className="flex-1 border-3 border-red bg-red text-pink font-display italic uppercase py-2 disabled:opacity-30 cursor-pointer text-sm"
            >
              Add
            </button>
            <button
              onClick={() => { onPinCancel?.(); setPinName(""); }}
              className="border-3 border-red px-3 py-2 font-display italic uppercase cursor-pointer text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="absolute pointer-events-none bg-red text-pink p-2 text-xs font-body z-50 max-w-xs"
          style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 16 }}
        >
          {tooltipContent.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-pink border-3 border-red p-3 z-10">
        <div className="text-xs uppercase font-bold tracking-widest mb-2">
          {hasDestinations ? "Monthly Transit Hours" : "Travel Time"}
        </div>
        <div
          className="w-24 h-3"
          role="img"
          aria-label={hasDestinations ? "Color scale: green is 5 hours, yellow is 25 hours, red is 50+ hours per month" : "Color scale: green is 5 minutes, yellow is 17 minutes, red is 40+ minutes"}
          style={{ background: "linear-gradient(90deg, rgb(0,200,50), rgb(255,200,50), rgb(230,30,30))" }}
        />
        <div className="flex justify-between text-xs mt-1">
          {hasDestinations ? (
            <><span>5h</span><span>25h</span><span>50h+</span></>
          ) : (
            <><span>5m</span><span>17m</span><span>40m+</span></>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build (component not yet used)**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/results/hex-map.tsx
git commit -m "feat: add hex map component with H3 fill layer, water mask, animated reveal"
```

---

### Task 10: Explore mode page

**Files:**
- Create: `src/app/explore/page.tsx`

This is the simpler of the two modes — enter an address, see an accessibility heatmap.

- [ ] **Step 1: Create the explore page**

Create `src/app/explore/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { HexMap } from "@/components/results/hex-map";
import { PanelSection } from "@/components/ui/panel-section";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import type { TransportMode, LatLng, StationGraph, StationMatrix, HexCell } from "@/lib/types";
import { CORE_NYC_BOUNDS, H3_RESOLUTION } from "@/lib/constants";
import Link from "next/link";

export default function ExplorePage() {
  const [originAddress, setOriginAddress] = useState("");
  const [originLocation, setOriginLocation] = useState<LatLng | null>(null);
  const [modes, setModes] = useState<TransportMode[]>(["subway", "bike", "bikeSubway"]);

  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [cells, setCells] = useState<HexCell[]>([]);
  const [computing, setComputing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Pre-generate hex centers (static for core NYC bounds)
  const hexCenters = useMemo(() => {
    const raw = generateHexCenters(CORE_NYC_BOUNDS, H3_RESOLUTION);
    return raw.map((h) => ({ h3Index: h.h3Index, lat: h.center.lat, lng: h.center.lng, boundary: h.boundary }));
  }, []);

  // Load subway + citi bike data
  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
        ]);
        if (!graphRes.ok || !matrixRes.ok) {
          setDataError("Failed to load transit data. Please refresh the page.");
          return;
        }
        const graph: StationGraph = await graphRes.json();
        const matrix: StationMatrix = await matrixRes.json();
        setStationGraph(graph);
        setStationMatrix(matrix);
        setSubwayData(new SubwayData(graph, matrix));

        const citi = await CitiBikeData.fetch();
        setCitiBikeData(citi);
      } catch {
        setDataError("Failed to load transit data. Please refresh the page.");
      }
    }
    load();
  }, []);

  // Compute grid when origin or modes change
  useEffect(() => {
    if (!originLocation || !stationGraph || !stationMatrix || !citiBikeData) return;

    setComputing(true);
    computeHexGrid({
      hexCenters: hexCenters.map((h) => ({ h3Index: h.h3Index, lat: h.lat, lng: h.lng })),
      origin: originLocation,
      destinations: [],
      modes,
      stationGraph,
      stationMatrix,
      citiBikeStations: citiBikeData.getAllStations(),
    })
      .then((result) => {
        // Merge boundary data back into cells
        const cellMap = new Map(hexCenters.map((h) => [h.h3Index, h]));
        const fullCells: HexCell[] = result.cells.map((c) => {
          const hex = cellMap.get(c.h3Index)!;
          return { ...c, center: { lat: hex.lat, lng: hex.lng }, boundary: hex.boundary };
        });
        setCells(fullCells);
        setComputing(false);
      })
      .catch((err) => {
        console.error("Grid computation failed:", err);
        setComputing(false);
      });
  }, [originLocation, modes, hexCenters, stationGraph, stationMatrix, citiBikeData]);

  const handleOriginSelect = useCallback((address: string, location: LatLng) => {
    setOriginAddress(address);
    setOriginLocation(location);
  }, []);

  return (
    <div className="flex h-full border-3 border-red">
      {/* Sidebar */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
        <PanelSection>
          <Link href="/" className="text-xs uppercase font-bold tracking-widest hover:underline">&larr; Back</Link>
          <h1 className="text-3xl leading-none mt-2">Explore<br />the Map</h1>
          <p className="font-body text-xs text-red/60 mt-2">
            Enter an address to see how long it takes to get anywhere in NYC
          </p>
        </PanelSection>

        <PanelSection>
          <AddressAutocomplete
            label="Address"
            onSelect={handleOriginSelect}
            autoFocus
          />
        </PanelSection>

        <PanelSection title="Transport Modes">
          <ModeToggles selected={modes} onChange={setModes} />
        </PanelSection>

        <div className="mt-auto p-6">
          <Link
            href="/find"
            className="block border-3 border-red p-4 text-center font-display italic uppercase hover:bg-red hover:text-pink transition-colors"
          >
            Find My Neighborhood &rarr;
          </Link>
        </div>
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        {dataError && (
          <div className="absolute inset-0 bg-pink z-50 flex items-center justify-center">
            <p className="font-display italic uppercase text-xl text-red">{dataError}</p>
          </div>
        )}
        {computing && (
          <div className="absolute inset-0 bg-pink/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl animate-pulse">Computing\u2026</span>
          </div>
        )}
        {originLocation ? (
          <HexMap
            center={originLocation}
            cells={cells}
            destinations={[]}
            hasDestinations={false}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-pink">
            <p className="font-display italic uppercase text-2xl text-red/30">
              Enter an address to explore
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/explore/page.tsx
git commit -m "feat: add explore mode page with hex heatmap and autocomplete"
```

---

## Chunk 4: Wizard Flow (Find My Neighborhood)

### Task 11: Wizard shell + step components

**Files:**
- Create: `src/components/wizard/wizard-shell.tsx`
- Create: `src/components/wizard/step-work.tsx`
- Create: `src/components/wizard/step-gym.tsx`
- Create: `src/components/wizard/step-social.tsx`
- Create: `src/components/wizard/step-extras.tsx`

- [ ] **Step 1: Create wizard shell**

Create `src/components/wizard/wizard-shell.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { StepWork } from "./step-work";
import { StepGym } from "./step-gym";
import { StepSocial } from "./step-social";
import { StepExtras } from "./step-extras";
import type { Destination } from "@/lib/types";

interface WizardShellProps {
  onComplete: (destinations: Destination[]) => void;
}

const STEPS = ["work", "gym", "social", "extras"] as const;
type StepName = (typeof STEPS)[number];

const STEP_LABELS: Record<StepName, string> = {
  work: "Work",
  gym: "Gym",
  social: "Social",
  extras: "Extras",
};

export function WizardShell({ onComplete }: WizardShellProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const addDestination = useCallback((dest: Destination) => {
    setDestinations((prev) => [...prev, dest]);
  }, []);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete(destinations);
    }
  }, [currentStep, destinations, onComplete]);

  const goBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const stepName = STEPS[currentStep];

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="flex border-b-3 border-red">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-widest ${
              i <= currentStep ? "bg-red text-pink" : "text-red/40"
            } ${i < STEPS.length - 1 ? "border-r-3 border-red" : ""}`}
          >
            {STEP_LABELS[step]}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        {stepName === "work" && (
          <StepWork onAdd={addDestination} destinations={destinations} />
        )}
        {stepName === "gym" && (
          <StepGym onAdd={addDestination} destinations={destinations} />
        )}
        {stepName === "social" && (
          <StepSocial onAdd={addDestination} destinations={destinations} />
        )}
        {stepName === "extras" && (
          <StepExtras onAdd={addDestination} destinations={destinations} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex border-t-3 border-red">
        {currentStep > 0 && (
          <button
            onClick={goBack}
            className="px-6 py-4 font-display italic uppercase border-r-3 border-red hover:bg-red hover:text-pink transition-colors cursor-pointer"
          >
            &larr; Back
          </button>
        )}
        <button
          onClick={goNext}
          className="flex-1 py-4 font-display italic uppercase bg-red text-pink hover:opacity-90 transition-opacity cursor-pointer text-lg"
        >
          {currentStep < STEPS.length - 1 ? "Next \u2192" : "Show My Heatmap \u2192"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create step components**

Create `src/components/wizard/step-work.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { FrequencyBars } from "@/components/setup/frequency-bars";
import type { Destination, LatLng } from "@/lib/types";

interface StepWorkProps {
  onAdd: (dest: Destination) => void;
  destinations: Destination[];
}

export function StepWork({ onAdd, destinations }: StepWorkProps) {
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [frequency, setFrequency] = useState(5);
  const existing = destinations.filter((d) => d.category === "work");

  const handleSelect = useCallback((addr: string, loc: LatLng) => {
    setAddress(addr);
    setLocation(loc);
  }, []);

  const handleAdd = useCallback(() => {
    if (!location) return;
    onAdd({
      id: crypto.randomUUID(),
      name: "Work",
      address,
      location,
      category: "work",
      frequency,
    });
    setAddress("");
    setLocation(null);
  }, [address, location, frequency, onAdd]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl">Where do you work?</h2>
      <p className="font-body text-sm text-red/60">
        Enter your office address. Skip if you work from home.
      </p>

      {existing.map((d) => (
        <div key={d.id} className="border-3 border-red p-3">
          <span className="text-sm font-bold">{d.address}</span>
          <span className="text-xs text-red/60 ml-2">{d.frequency}x/week</span>
        </div>
      ))}

      <AddressAutocomplete
        label="Office Address"
        onSelect={handleSelect}
        autoFocus={existing.length === 0}
      />

      {location && (
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest">Days per Week</span>
            <FrequencyBars value={frequency} onChange={setFrequency} />
          </div>
          <button
            onClick={handleAdd}
            className="border-3 border-red bg-red text-pink font-display italic uppercase py-3 cursor-pointer"
          >
            Add Workplace
          </button>
        </div>
      )}
    </div>
  );
}
```

Create `src/components/wizard/step-gym.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { FrequencyBars } from "@/components/setup/frequency-bars";
import type { Destination, LatLng } from "@/lib/types";

interface StepGymProps {
  onAdd: (dest: Destination) => void;
  destinations: Destination[];
}

export function StepGym({ onAdd, destinations }: StepGymProps) {
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [frequency, setFrequency] = useState(3);
  const existing = destinations.filter((d) => d.category === "fitness");

  const handleSelect = useCallback((addr: string, loc: LatLng) => {
    setAddress(addr);
    setLocation(loc);
  }, []);

  const handleAdd = useCallback(() => {
    if (!location) return;
    onAdd({
      id: crypto.randomUUID(),
      name: address.split(",")[0] || "Gym",
      address,
      location,
      category: "fitness",
      frequency,
    });
    setAddress("");
    setLocation(null);
  }, [address, location, frequency, onAdd]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl">Where do you work out?</h2>
      <p className="font-body text-sm text-red/60">
        Add your gym, yoga studio, or fitness spot. Skip if you don't have one.
      </p>

      {existing.map((d) => (
        <div key={d.id} className="border-3 border-red p-3">
          <span className="text-sm font-bold">{d.name}</span>
          <span className="text-xs text-red/60 ml-2">{d.frequency}x/week</span>
        </div>
      ))}

      <AddressAutocomplete label="Gym Address" onSelect={handleSelect} />

      {location && (
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest">Times per Week</span>
            <FrequencyBars value={frequency} onChange={setFrequency} />
          </div>
          <button
            onClick={handleAdd}
            className="border-3 border-red bg-red text-pink font-display italic uppercase py-3 cursor-pointer"
          >
            Add Gym
          </button>
        </div>
      )}
    </div>
  );
}
```

Create `src/components/wizard/step-social.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { FrequencyBars } from "@/components/setup/frequency-bars";
import type { Destination, LatLng } from "@/lib/types";

interface StepSocialProps {
  onAdd: (dest: Destination) => void;
  destinations: Destination[];
}

export function StepSocial({ onAdd, destinations }: StepSocialProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [frequency, setFrequency] = useState(1);
  const existing = destinations.filter((d) => d.category === "social");

  const handleSelect = useCallback((addr: string, loc: LatLng) => {
    setAddress(addr);
    setLocation(loc);
  }, []);

  const handleAdd = useCallback(() => {
    if (!location || !name.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      address,
      location,
      category: "social",
      frequency,
    });
    setName("");
    setAddress("");
    setLocation(null);
  }, [name, address, location, frequency, onAdd]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl">Where do friends live?</h2>
      <p className="font-body text-sm text-red/60">
        Add places you visit regularly — friends, family, a favorite bar. Don't worry about exact addresses — close enough works.
      </p>

      {existing.map((d) => (
        <div key={d.id} className="border-3 border-red p-3">
          <span className="text-sm font-bold">{d.name}</span>
          <span className="text-xs text-red/60 ml-2">{d.frequency}x/week</span>
        </div>
      ))}

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Jake's place)\u2026"
        name="social-name"
        autoComplete="off"
        className="bg-transparent border-3 border-red text-red p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-red placeholder:text-red/50 focus:bg-red focus:text-pink"
      />

      <AddressAutocomplete label="Address or Neighborhood" onSelect={handleSelect} />

      {location && name.trim() && (
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest">Times per Week</span>
            <FrequencyBars value={frequency} onChange={setFrequency} />
          </div>
          <button
            onClick={handleAdd}
            className="border-3 border-red bg-red text-pink font-display italic uppercase py-3 cursor-pointer"
          >
            Add Place
          </button>
        </div>
      )}
    </div>
  );
}
```

Create `src/components/wizard/step-extras.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { FrequencyBars } from "@/components/setup/frequency-bars";
import type { Destination, DestinationCategory, LatLng } from "@/lib/types";
import { DEFAULT_FREQUENCY } from "@/lib/constants";

const CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "errands", label: "Errands" },
  { key: "social", label: "Social" },
  { key: "fitness", label: "Fitness" },
  { key: "other", label: "Other" },
];

interface StepExtrasProps {
  onAdd: (dest: Destination) => void;
  destinations: Destination[];
}

export function StepExtras({ onAdd, destinations }: StepExtrasProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [category, setCategory] = useState<DestinationCategory>("errands");
  const [frequency, setFrequency] = useState(DEFAULT_FREQUENCY["errands"]);

  const handleSelect = useCallback((addr: string, loc: LatLng) => {
    setAddress(addr);
    setLocation(loc);
  }, []);

  const handleAdd = useCallback(() => {
    if (!location || !name.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      address,
      location,
      category,
      frequency,
    });
    setName("");
    setAddress("");
    setLocation(null);
  }, [name, address, location, category, frequency, onAdd]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl">Anywhere Else?</h2>
      <p className="font-body text-sm text-red/60">
        Add any other regular destinations — grocery store, doctor, favorite coffee shop.
      </p>

      {/* Show all destinations added so far */}
      {destinations.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase font-bold tracking-widest">Your Places ({destinations.length})</span>
          {destinations.map((d) => (
            <div key={d.id} className="border-3 border-red p-2 flex justify-between text-sm">
              <span className="font-bold">{d.name}</span>
              <span className="text-red/60">{d.category} \u00b7 {d.frequency}x/wk</span>
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name\u2026"
        name="extra-name"
        autoComplete="off"
        className="bg-transparent border-3 border-red text-red p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-red placeholder:text-red/50 focus:bg-red focus:text-pink"
      />

      <AddressAutocomplete label="Address" onSelect={handleSelect} />

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setCategory(c.key);
              setFrequency(DEFAULT_FREQUENCY[c.key]);
            }}
            className={`text-xs border-2 border-red px-2 py-1 uppercase font-bold cursor-pointer ${
              category === c.key ? "bg-red text-pink" : ""
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {location && name.trim() && (
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest">Times per Week</span>
            <FrequencyBars value={frequency} onChange={setFrequency} />
          </div>
          <button
            onClick={handleAdd}
            className="border-3 border-red bg-red text-pink font-display italic uppercase py-3 cursor-pointer"
          >
            Add Place
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/wizard/
git commit -m "feat: add wizard shell with work, gym, social, extras step components"
```

---

### Task 12: Find My Neighborhood page

**Files:**
- Create: `src/app/find/page.tsx`
- Create: `src/components/results/results-sidebar.tsx`
- Create: `src/components/results/best-neighborhood.tsx`
- Create: `src/components/results/surprise-insight.tsx`
- Create: `src/components/results/share-button.tsx`

- [ ] **Step 1: Create results sidebar**

Create `src/components/results/results-sidebar.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import { PanelSection } from "@/components/ui/panel-section";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { MonthlyFooter } from "./monthly-footer";
import { BestNeighborhood } from "./best-neighborhood";
import { ShareButton } from "./share-button";
import type { Destination, TransportMode, HexCell } from "@/lib/types";
import Link from "next/link";

interface ResultsSidebarProps {
  destinations: Destination[];
  modes: TransportMode[];
  cells: HexCell[];
  totalHours: number;
  totalCost: number;
  onModesChange: (modes: TransportMode[]) => void;
  onEdit: () => void;
  pinDropMode: boolean;
  onPinDropToggle: () => void;
}

export function ResultsSidebar({
  destinations, modes, cells, totalHours, totalCost,
  onModesChange, onEdit, pinDropMode, onPinDropToggle,
}: ResultsSidebarProps) {
  return (
    <aside className="w-[360px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
      <PanelSection>
        <Link href="/" className="text-xs uppercase font-bold tracking-widest hover:underline">&larr; Back</Link>
        <h1 className="text-3xl leading-none mt-2">Your<br />Heatmap</h1>
      </PanelSection>

      <BestNeighborhood cells={cells} />

      <PanelSection title="Your Places">
        {destinations.map((d) => (
          <div key={d.id} className="border-3 border-red p-2 flex justify-between text-sm">
            <span className="font-bold">{d.name}</span>
            <span className="text-red/60">{d.category} \u00b7 {d.frequency}x/wk</span>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 border-3 border-red p-2 text-center font-display italic uppercase text-sm cursor-pointer hover:bg-red hover:text-pink transition-colors"
          >
            Edit Places
          </button>
          <button
            onClick={onPinDropToggle}
            className={`flex-1 border-3 border-red p-2 text-center font-display italic uppercase text-sm cursor-pointer transition-colors ${
              pinDropMode ? "bg-red text-pink" : "hover:bg-red hover:text-pink"
            }`}
          >
            {pinDropMode ? "Click Map\u2026" : "Drop Pin"}
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Transport Modes">
        <ModeToggles selected={modes} onChange={onModesChange} />
      </PanelSection>

      <ShareButton destinations={destinations} modes={modes} />

      <MonthlyFooter totalHours={totalHours} totalCost={totalCost} />
    </aside>
  );
}
```

- [ ] **Step 2: Create best neighborhood component**

Create `src/components/results/best-neighborhood.tsx`:

```typescript
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { reverseGeocode } from "@/lib/geocode";
import type { HexCell } from "@/lib/types";

interface BestNeighborhoodProps {
  cells: HexCell[];
}

export function BestNeighborhood({ cells }: BestNeighborhoodProps) {
  const [neighborhoodName, setNeighborhoodName] = useState<string | null>(null);
  const prevBestRef = useRef<string>("");

  // Find the best hex cell (lowest composite score, excluding 999)
  const best = useMemo(() => {
    if (cells.length === 0) return null;
    const valid = cells.filter((c) => c.compositeScore > 0 && c.compositeScore < 999);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => (a.compositeScore < b.compositeScore ? a : b));
  }, [cells]);

  // Reverse geocode the best cell center
  useEffect(() => {
    if (!best) { setNeighborhoodName(null); return; }
    const key = best.h3Index;
    if (key === prevBestRef.current) return;
    prevBestRef.current = key;

    reverseGeocode(best.center, process.env.NEXT_PUBLIC_MAPBOX_TOKEN!).then((name) => {
      setNeighborhoodName(name);
    });
  }, [best]);

  if (!best || !neighborhoodName) return null;

  const hours = (best.compositeScore / 60).toFixed(1);

  return (
    <div className="border-b-3 border-red p-6 bg-red/5">
      <span className="text-xs uppercase font-bold tracking-widest">Your Best Bet</span>
      <div className="text-xl font-display italic uppercase mt-1">{neighborhoodName}</div>
      <div className="text-sm font-body mt-1 text-red/80">{hours} hrs/month in transit</div>
    </div>
  );
}
```

- [ ] **Step 3: Create surprise insight component**

Create `src/components/results/surprise-insight.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import type { HexCell, Destination } from "@/lib/types";

interface SurpriseInsightProps {
  cells: HexCell[];
  destinations: Destination[];
}

/**
 * Finds the most counterintuitive finding: where distance and travel time diverge most.
 * "Greenpoint is 3mi from your office but 47 min. Bushwick is 5mi away but only 28 min."
 */
export function SurpriseInsight({ cells, destinations }: SurpriseInsightProps) {
  const insight = useMemo(() => {
    if (cells.length === 0 || destinations.length === 0) return null;

    // Find the biggest discrepancy: a cell that's close by distance but slow by transit,
    // compared to a cell that's far by distance but fast by transit.
    const valid = cells.filter((c) => c.compositeScore > 0 && c.compositeScore < 999);
    if (valid.length < 10) return null;

    // Sort by composite score
    const sorted = [...valid].sort((a, b) => a.compositeScore - b.compositeScore);
    const best = sorted[0];
    const worst = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];

    if (!best || !worst) return null;

    const bestHours = (best.compositeScore / 60).toFixed(1);
    const worstHours = (worst.compositeScore / 60).toFixed(1);
    const ratio = worst.compositeScore / best.compositeScore;

    if (ratio < 1.5) return null; // Not interesting enough

    return {
      bestHours,
      worstHours,
      ratio: ratio.toFixed(1),
    };
  }, [cells, destinations]);

  if (!insight) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red text-pink px-4 py-3 z-20 max-w-sm text-center">
      <p className="text-xs uppercase font-bold tracking-widest mb-1">Did You Know?</p>
      <p className="font-body text-sm">
        The best area saves you <strong>{insight.bestHours} hrs/mo</strong> vs the worst at{" "}
        <strong>{insight.worstHours} hrs/mo</strong> &mdash; a {insight.ratio}x difference
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create share button**

Create `src/components/results/share-button.tsx`:

```typescript
"use client";

import { useCallback, useState } from "react";
import { encodeShareableState } from "@/lib/url-state";
import type { Destination, TransportMode } from "@/lib/types";

interface ShareButtonProps {
  destinations: Destination[];
  modes: TransportMode[];
}

export function ShareButton({ destinations, modes }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const params = encodeShareableState(destinations, modes);
    const url = `${window.location.origin}/find?${params}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "My NYC Transit Heatmap", url });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed — show URL in prompt as fallback
      window.prompt("Copy this link to share your heatmap:", url);
    }
  }, [destinations, modes]);

  if (destinations.length === 0) return null;

  return (
    <div className="border-b-3 border-red p-6">
      <button
        onClick={handleShare}
        className="w-full border-3 border-red p-3 font-display italic uppercase cursor-pointer hover:bg-red hover:text-pink transition-colors"
      >
        {copied ? "Link Copied!" : "Share This Heatmap"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create the Find page**

Create `src/app/find/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { ResultsSidebar } from "@/components/results/results-sidebar";
import { HexMap } from "@/components/results/hex-map";
import { SurpriseInsight } from "@/components/results/surprise-insight";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { computeHexGrid } from "@/lib/grid";
import { computeMonthlyCost } from "@/lib/cost";
import { generateHexCenters } from "@/lib/hex";
import { decodeShareableState } from "@/lib/url-state";
import { walkTime, bikeTime, driveTime } from "@/lib/travel-time";
import { computeSubwayTime } from "@/lib/subway";
import type { TransportMode, LatLng, StationGraph, StationMatrix, HexCell, Destination, DestinationCategory } from "@/lib/types";
import { CORE_NYC_BOUNDS, H3_RESOLUTION, WEEKS_PER_MONTH } from "@/lib/constants";

export default function FindPage() {
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<"wizard" | "results">("wizard");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [modes, setModes] = useState<TransportMode[]>(["subway", "bike", "bikeSubway"]);

  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [cells, setCells] = useState<HexCell[]>([]);
  const [computing, setComputing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [pinDropMode, setPinDropMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<LatLng | null>(null);

  // Hex centers (static)
  const hexCenters = useMemo(() => {
    const raw = generateHexCenters(CORE_NYC_BOUNDS, H3_RESOLUTION);
    return raw.map((h) => ({ h3Index: h.h3Index, lat: h.center.lat, lng: h.center.lng, boundary: h.boundary }));
  }, []);

  // Load shared state from URL params
  useEffect(() => {
    const queryString = searchParams.toString();
    if (!queryString) return;
    const decoded = decodeShareableState(queryString);
    if (decoded && decoded.destinations.length > 0) {
      setDestinations(decoded.destinations);
      setModes(decoded.modes);
      setPhase("results");
    }
  }, [searchParams]);

  // Load transit data
  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
        ]);
        if (!graphRes.ok || !matrixRes.ok) {
          setDataError("Failed to load transit data. Please refresh.");
          return;
        }
        const graph: StationGraph = await graphRes.json();
        const matrix: StationMatrix = await matrixRes.json();
        setStationGraph(graph);
        setStationMatrix(matrix);
        setSubwayData(new SubwayData(graph, matrix));
        const citi = await CitiBikeData.fetch();
        setCitiBikeData(citi);
      } catch {
        setDataError("Failed to load transit data. Please refresh.");
      }
    }
    load();
  }, []);

  // Compute hex grid when destinations or modes change
  useEffect(() => {
    if (phase !== "results" || destinations.length === 0) return;
    if (!stationGraph || !stationMatrix || !citiBikeData) return;

    setComputing(true);
    computeHexGrid({
      hexCenters: hexCenters.map((h) => ({ h3Index: h.h3Index, lat: h.lat, lng: h.lng })),
      origin: null,
      destinations,
      modes,
      stationGraph,
      stationMatrix,
      citiBikeStations: citiBikeData.getAllStations(),
    })
      .then((result) => {
        const cellMap = new Map(hexCenters.map((h) => [h.h3Index, h]));
        const fullCells: HexCell[] = result.cells.map((c) => {
          const hex = cellMap.get(c.h3Index)!;
          return { ...c, center: { lat: hex.lat, lng: hex.lng }, boundary: hex.boundary };
        });
        setCells(fullCells);
        setComputing(false);
      })
      .catch((err) => {
        console.error("Grid computation failed:", err);
        setComputing(false);
      });
  }, [phase, destinations, modes, hexCenters, stationGraph, stationMatrix, citiBikeData]);

  const handleWizardComplete = useCallback((dests: Destination[]) => {
    setDestinations(dests);
    setPhase("results");
  }, []);

  const handleMapClick = useCallback((location: LatLng) => {
    if (pinDropMode) {
      setPendingPin(location);
      setPinDropMode(false);
    }
  }, [pinDropMode]);

  const handlePinConfirm = useCallback((name: string, category: DestinationCategory) => {
    if (!pendingPin) return;
    const dest: Destination = {
      id: crypto.randomUUID(),
      name,
      address: `${pendingPin.lat.toFixed(4)}, ${pendingPin.lng.toFixed(4)}`,
      location: pendingPin,
      category,
      frequency: category === "work" ? 5 : category === "fitness" ? 3 : 1,
    };
    setDestinations((prev) => [...prev, dest]);
    setPendingPin(null);
  }, [pendingPin]);

  const handlePinCancel = useCallback(() => setPendingPin(null), []);

  // Monthly stats (simplified — uses first destination's location as reference)
  const { totalHours, totalCost } = useMemo(() => {
    if (destinations.length === 0 || cells.length === 0) return { totalHours: 0, totalCost: 0 };

    // Find best cell
    const valid = cells.filter((c) => c.compositeScore > 0 && c.compositeScore < 999);
    if (valid.length === 0) return { totalHours: 0, totalCost: 0 };
    const best = valid.reduce((a, b) => (a.compositeScore < b.compositeScore ? a : b));

    const totalHours = best.compositeScore / 60;

    // Simplified cost: use destination modes from best cell breakdown
    const destModes = destinations.map((d) => ({
      destId: d.id,
      mode: best.fastest as TransportMode,
    }));
    const totalCost = computeMonthlyCost(destinations, destModes);

    return { totalHours, totalCost };
  }, [destinations, cells]);

  // Map center: centroid of all destinations, or default NYC
  const mapCenter = useMemo<LatLng>(() => {
    if (destinations.length === 0) return { lat: 40.73, lng: -73.97 };
    const avgLat = destinations.reduce((s, d) => s + d.location.lat, 0) / destinations.length;
    const avgLng = destinations.reduce((s, d) => s + d.location.lng, 0) / destinations.length;
    return { lat: avgLat, lng: avgLng };
  }, [destinations]);

  // Wizard phase
  if (phase === "wizard") {
    return (
      <div className="flex h-full border-3 border-red">
        <aside className="w-[400px] flex-shrink-0 border-r-3 border-red bg-pink">
          <WizardShell onComplete={handleWizardComplete} />
        </aside>
        <main className="flex-1 flex items-center justify-center bg-pink">
          <div className="text-center px-8">
            <h2 className="font-display italic uppercase text-3xl mb-4">Tell Us About Your Life</h2>
            <p className="text-red/60 text-sm">
              Add your regular destinations and we'll find the best neighborhood for you
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Results phase
  return (
    <div className="flex h-full border-3 border-red">
      <ResultsSidebar
        destinations={destinations}
        modes={modes}
        cells={cells}
        totalHours={totalHours}
        totalCost={totalCost}
        onModesChange={setModes}
        onEdit={() => setPhase("wizard")}
        pinDropMode={pinDropMode}
        onPinDropToggle={() => setPinDropMode((p) => !p)}
      />
      <main className="flex-1 relative">
        {dataError && (
          <div className="absolute inset-0 bg-pink z-50 flex items-center justify-center">
            <p className="font-display italic uppercase text-xl">{dataError}</p>
          </div>
        )}
        {computing && (
          <div className="absolute inset-0 bg-pink/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl animate-pulse">Computing\u2026</span>
          </div>
        )}
        <SurpriseInsight cells={cells} destinations={destinations} />
        <HexMap
          center={mapCenter}
          cells={cells}
          destinations={destinations}
          hasDestinations={true}
          pinDropMode={pinDropMode}
          onMapClick={handleMapClick}
          pendingPin={pendingPin}
          onPinConfirm={handlePinConfirm}
          onPinCancel={handlePinCancel}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/app/find/ src/components/results/results-sidebar.tsx src/components/results/best-neighborhood.tsx src/components/results/surprise-insight.tsx src/components/results/share-button.tsx
git commit -m "feat: add Find My Neighborhood wizard with results, best neighborhood, surprise insight, share button"
```

---

## Chunk 5: Cleanup + Polish + Verification

### Task 13: Delete old files and clean up

**Files:**
- Delete: `src/components/results/map-view.tsx`
- Delete: `src/components/setup/address-input.tsx`
- Delete: `src/app/results/page.tsx`
- Delete: `src/components/results/view-switch.tsx` (no longer needed — single view)

- [ ] **Step 1: Delete old files**

```bash
rm src/components/results/map-view.tsx
rm src/components/setup/address-input.tsx
rm src/app/results/page.tsx
rm src/components/results/view-switch.tsx
```

- [ ] **Step 2: Verify build — fix any broken imports**

```bash
npm run build
```

Expected: Build may fail if old components are still imported somewhere. Fix any remaining imports.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old map-view, address-input, results page, view-switch"
```

---

### Task 14: Update layout metadata

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update metadata**

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NYC Transit Heatmap — Find Your Neighborhood",
  description: "Enter your regular destinations and find the NYC neighborhood that minimizes your monthly commute. Shareable hex tile heatmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden p-3">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "chore: update metadata for SEO"
```

---

### Task 15: Run all tests + build verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All existing tests pass (travel-time: 11, cost: 5, subway: 3 = 19). New tests pass (hex: 3, url-state: 4 = 7). **Total: 26 tests passing.**

- [ ] **Step 2: Full production build**

```bash
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 3: Smoke test in dev**

```bash
npm run dev
```

Then test:
1. Landing page loads with two cards
2. "Explore" → address autocomplete works → hex heatmap renders
3. "Find My Neighborhood" → wizard steps → heatmap with destinations
4. Share button copies URL → pasting URL restores state
5. Pin drop on map → name prompt → added to destinations
6. Pin drop on water → rejected (no prompt appears)
7. Best neighborhood badge shows in sidebar
8. Surprise insight banner appears
9. Hex tiles animate in on first render

- [ ] **Step 4: Deploy to Vercel**

```bash
npx vercel --prod
```

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build/test issues from integration"
```

---

## Verification Checklist

1. `npm test` — 26+ tests pass
2. `npm run build` — clean build
3. Landing page: two clear mode choices
4. Explore mode: autocomplete → hex heatmap → no gaps
5. Find mode: wizard → hex heatmap with destinations → shareable URL
6. Hex tooltip shows per-destination breakdown
7. Best neighborhood badge appears in sidebar
8. Surprise insight callout appears
9. Share button copies URL / opens native share
10. Pin drop on water rejected
11. Animated hex reveal on render
12. Live URL accessible on Vercel
