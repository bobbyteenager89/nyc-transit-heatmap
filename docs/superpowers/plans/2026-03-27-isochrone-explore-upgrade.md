# Isochrone Explore Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Explore page's flat hex grid with dramatic isochrone contour bands on a dark map — all modes visible simultaneously with a draggable time slider.

**Architecture:** The compute pipeline (web worker, spatial indexing, travel time calculations) is 100% reused. This is purely a visualization upgrade. Hex cells are grouped by mode + time band, merged into smooth contour polygons via h3-js `cellsToMultiPolygon`, and rendered as stacked Mapbox fill layers with per-mode colors and glow effects. A draggable slider filters which bands are visible (1–60 min). No new API calls, no new data fetching — all filtering happens client-side on pre-computed data.

**Tech Stack:** h3-js (cellsToMultiPolygon for polygon dissolve), Mapbox GL JS (dark-v11 style, multiple fill layers), React 19, Next.js 16, Tailwind CSS v4

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/isochrone.ts` | Group hex cells by mode+time band, dissolve into GeoJSON contour polygons |
| Create | `src/lib/__tests__/isochrone.test.ts` | Unit tests for isochrone grouping and polygon generation |
| Create | `src/components/isochrone/isochrone-map.tsx` | Dark Mapbox map with stacked contour layers, per-mode coloring, glow, tooltip |
| Create | `src/components/isochrone/time-slider.tsx` | Draggable range slider 1–60 min with brutalist styling |
| Create | `src/components/isochrone/mode-legend.tsx` | Color-coded mode legend with toggle checkboxes |
| Modify | `src/app/explore/page.tsx` | Replace hex map with isochrone map, add slider + mode toggles |
| Modify | `src/app/page.tsx` | Update Explore card description for isochrone |
| Modify | `src/lib/types.ts` | Add `IsochroneBand` and `IsochroneLayer` types |

---

## Mode Colors (on dark map)

```
walk:        #ffbe0b (warm amber)
bike:        #06d6a0 (green)
subway:      #118ab2 (blue)
car:         #9b5de5 (purple)
bikeSubway:  #0ead69 (teal-green)
ferry:       #00b4d8 (cyan)
```

Each mode renders as concentric bands at decreasing opacity: innermost (5 min) = 0.6, outermost = 0.15.

## Time Bands

Fixed breakpoints: 5, 10, 15, 20, 30, 45, 60 minutes.
The slider max value determines how many bands are visible. At slider=20, bands 5/10/15/20 show. At slider=60, all bands show.

---

### Task 1: Add isochrone types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add IsochroneBand and IsochroneLayer types**

Add to the end of `src/lib/types.ts`:

```typescript
/** A single time-band contour polygon for one mode */
export interface IsochroneBand {
  mode: TransportMode;
  minMinutes: number;
  maxMinutes: number;
  polygon: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon>;
}

/** All contour bands for a single mode */
export interface IsochroneLayer {
  mode: TransportMode;
  color: string;
  bands: IsochroneBand[];
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add IsochroneBand and IsochroneLayer types"
```

---

### Task 2: Build isochrone contour generator

**Files:**
- Create: `src/lib/isochrone.ts`
- Create: `src/lib/__tests__/isochrone.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/isochrone.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { groupCellsByModeBand, generateIsochroneLayers, TIME_BANDS, MODE_COLORS } from "../isochrone";
import type { HexCell, TransportMode } from "../types";

function makeCell(h3Index: string, times: Partial<Record<TransportMode, number | null>>): HexCell {
  const full: Record<TransportMode, number | null> = {
    walk: null, bike: null, subway: null, car: null, bikeSubway: null, ferry: null,
    ...times,
  };
  return {
    h3Index,
    center: { lat: 40.73, lng: -73.99 },
    boundary: [[-73.99, 40.73], [-73.989, 40.73], [-73.989, 40.731], [-73.99, 40.731]],
    times: full,
    fastest: "walk",
    compositeScore: 10,
    destBreakdown: {},
  };
}

describe("groupCellsByModeBand", () => {
  it("groups cells into correct time bands per mode", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 3, subway: 12 }),
      makeCell("8a2a1072b5bffff", { walk: 8, subway: 7 }),
      makeCell("8a2a1072b5dffff", { walk: 18, subway: 25 }),
    ];

    const groups = groupCellsByModeBand(cells, ["walk", "subway"]);

    // walk: cell1 in 0-5, cell2 in 5-10, cell3 in 15-20
    expect(groups.get("walk:0-5")).toEqual(["8a2a1072b59ffff"]);
    expect(groups.get("walk:5-10")).toEqual(["8a2a1072b5bffff"]);
    expect(groups.get("walk:15-20")).toEqual(["8a2a1072b5dffff"]);

    // subway: cell1 in 10-15, cell2 in 5-10, cell3 in 20-30
    expect(groups.get("subway:10-15")).toEqual(["8a2a1072b59ffff"]);
    expect(groups.get("subway:5-10")).toEqual(["8a2a1072b5bffff"]);
    expect(groups.get("subway:20-30")).toEqual(["8a2a1072b5dffff"]);
  });

  it("skips cells with null time for a mode", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 5, subway: null }),
    ];
    const groups = groupCellsByModeBand(cells, ["walk", "subway"]);
    expect(groups.has("subway:0-5")).toBe(false);
    expect(groups.get("walk:0-5")).toEqual(["8a2a1072b59ffff"]);
  });

  it("handles cells beyond 60 min by placing in 45-60 band", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 75 }),
    ];
    const groups = groupCellsByModeBand(cells, ["walk"]);
    // 75 min is beyond all bands, should not appear
    expect(groups.has("walk:45-60")).toBe(false);
  });
});

describe("generateIsochroneLayers", () => {
  it("produces layers with correct mode colors", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 3 }),
    ];
    const layers = generateIsochroneLayers(cells, ["walk"], 30);
    expect(layers).toHaveLength(1);
    expect(layers[0].mode).toBe("walk");
    expect(layers[0].color).toBe(MODE_COLORS.walk);
    expect(layers[0].bands.length).toBeGreaterThan(0);
  });

  it("filters bands by maxMinutes", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 3 }),
      makeCell("8a2a1072b5bffff", { walk: 25 }),
    ];
    const layers10 = generateIsochroneLayers(cells, ["walk"], 10);
    const layers30 = generateIsochroneLayers(cells, ["walk"], 30);
    // At max 10 min, the 25-min cell should not produce a band
    const totalBands10 = layers10[0].bands.length;
    const totalBands30 = layers30[0].bands.length;
    expect(totalBands30).toBeGreaterThan(totalBands10);
  });

  it("returns empty layers array for modes with no reachable cells", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: null }),
    ];
    const layers = generateIsochroneLayers(cells, ["walk"], 30);
    expect(layers[0].bands).toHaveLength(0);
  });
});

describe("TIME_BANDS", () => {
  it("has contiguous non-overlapping ranges", () => {
    for (let i = 1; i < TIME_BANDS.length; i++) {
      expect(TIME_BANDS[i][0]).toBe(TIME_BANDS[i - 1][1]);
    }
  });

  it("starts at 0 and ends at 60", () => {
    expect(TIME_BANDS[0][0]).toBe(0);
    expect(TIME_BANDS[TIME_BANDS.length - 1][1]).toBe(60);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/isochrone.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement isochrone.ts**

Create `src/lib/isochrone.ts`:

```typescript
import { cellsToMultiPolygon } from "h3-js";
import type { TransportMode, HexCell, IsochroneBand, IsochroneLayer } from "./types";

/** Time band breakpoints in minutes: [min, max) */
export const TIME_BANDS: [number, number][] = [
  [0, 5],
  [5, 10],
  [10, 15],
  [15, 20],
  [20, 30],
  [30, 45],
  [45, 60],
];

/** Per-mode colors for dark map rendering */
export const MODE_COLORS: Record<TransportMode, string> = {
  walk: "#ffbe0b",
  bike: "#06d6a0",
  subway: "#118ab2",
  car: "#9b5de5",
  bikeSubway: "#0ead69",
  ferry: "#00b4d8",
};

/**
 * Group hex cell H3 indexes by "mode:min-max" keys.
 * Each cell is placed in the band matching its travel time for that mode.
 */
export function groupCellsByModeBand(
  cells: HexCell[],
  modes: TransportMode[]
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const cell of cells) {
    for (const mode of modes) {
      const time = cell.times[mode];
      if (time === null || time === undefined) continue;

      for (const [min, max] of TIME_BANDS) {
        if (time >= min && time < max) {
          const key = `${mode}:${min}-${max}`;
          let arr = groups.get(key);
          if (!arr) {
            arr = [];
            groups.set(key, arr);
          }
          arr.push(cell.h3Index);
          break;
        }
      }
    }
  }

  return groups;
}

/**
 * Generate dissolved contour polygon layers for each mode.
 * Each layer contains bands up to maxMinutes.
 * Bands are cumulative: the 10-min band includes all cells reachable in 0-10 min.
 */
export function generateIsochroneLayers(
  cells: HexCell[],
  modes: TransportMode[],
  maxMinutes: number
): IsochroneLayer[] {
  const groups = groupCellsByModeBand(cells, modes);

  return modes.map((mode) => {
    const bands: IsochroneBand[] = [];

    // Build cumulative cell sets: each band includes all cells from previous bands
    let cumulativeCells: string[] = [];

    for (const [min, max] of TIME_BANDS) {
      if (max > maxMinutes) break;

      const bandKey = `${mode}:${min}-${max}`;
      const bandCells = groups.get(bandKey) ?? [];
      cumulativeCells = [...cumulativeCells, ...bandCells];

      if (cumulativeCells.length === 0) continue;

      // Use H3's native polygon merge — much faster than turf dissolve
      const multiPoly = cellsToMultiPolygon(cumulativeCells, true); // true = GeoJSON [lng, lat]

      const feature: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: multiPoly,
        },
        properties: {
          mode,
          minMinutes: 0,
          maxMinutes: max,
        },
      };

      bands.push({
        mode,
        minMinutes: 0,
        maxMinutes: max,
        polygon: feature,
      });
    }

    return {
      mode,
      color: MODE_COLORS[mode],
      bands,
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/isochrone.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/isochrone.ts src/lib/__tests__/isochrone.test.ts
git commit -m "feat: add isochrone contour generator with h3 polygon dissolve"
```

---

### Task 3: Build time slider component

**Files:**
- Create: `src/components/isochrone/time-slider.tsx`

- [ ] **Step 1: Create the time slider**

Create `src/components/isochrone/time-slider.tsx`:

```tsx
"use client";

import { useCallback } from "react";

interface TimeSliderProps {
  value: number; // current max minutes
  onChange: (minutes: number) => void;
}

const SNAP_POINTS = [5, 10, 15, 20, 30, 45, 60];

export function TimeSlider({ value, onChange }: TimeSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(e.target.value, 10);
      // Snap to nearest breakpoint
      let closest = SNAP_POINTS[0];
      let closestDist = Math.abs(raw - closest);
      for (const pt of SNAP_POINTS) {
        const dist = Math.abs(raw - pt);
        if (dist < closestDist) {
          closest = pt;
          closestDist = dist;
        }
      }
      onChange(closest);
    },
    [onChange]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-display italic uppercase text-sm">
          {value} min
        </span>
      </div>

      <input
        type="range"
        min={5}
        max={60}
        step={1}
        value={value}
        onChange={handleChange}
        className="w-full h-2 appearance-none bg-red/30 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:bg-red [&::-webkit-slider-thumb]:border-3
          [&::-webkit-slider-thumb]:border-pink [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:bg-red [&::-moz-range-thumb]:border-3
          [&::-moz-range-thumb]:border-pink [&::-moz-range-thumb]:border-solid
          [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none"
        aria-label={`Maximum travel time: ${value} minutes`}
      />

      <div className="flex justify-between mt-1">
        {SNAP_POINTS.map((pt) => (
          <button
            key={pt}
            onClick={() => onChange(pt)}
            className={`text-xs font-body cursor-pointer transition-colors ${
              value >= pt ? "text-red" : "text-red/30"
            }`}
          >
            {pt}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/isochrone/time-slider.tsx
git commit -m "feat: add isochrone time slider with snap points"
```

---

### Task 4: Build mode legend component

**Files:**
- Create: `src/components/isochrone/mode-legend.tsx`

- [ ] **Step 1: Create the mode legend**

Create `src/components/isochrone/mode-legend.tsx`:

```tsx
"use client";

import type { TransportMode } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";

const MODE_LABELS: { key: TransportMode; label: string }[] = [
  { key: "subway", label: "Subway" },
  { key: "walk", label: "Walk" },
  { key: "car", label: "Car" },
  { key: "bike", label: "Citi Bike" },
  { key: "bikeSubway", label: "Bike+Sub" },
  { key: "ferry", label: "Ferry" },
];

interface ModeLegendProps {
  activeModes: TransportMode[];
  onToggle: (mode: TransportMode) => void;
}

export function ModeLegend({ activeModes, onToggle }: ModeLegendProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {MODE_LABELS.map(({ key, label }) => {
        const isActive = activeModes.includes(key);
        const color = MODE_COLORS[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-2 px-2.5 py-2 border-3 border-red font-display italic uppercase text-xs cursor-pointer transition-opacity ${
              isActive ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className="w-3 h-3 flex-shrink-0 border border-red/30"
              style={{ backgroundColor: isActive ? color : "transparent" }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/isochrone/mode-legend.tsx
git commit -m "feat: add color-coded mode legend with toggles"
```

---

### Task 5: Build isochrone map component

**Files:**
- Create: `src/components/isochrone/isochrone-map.tsx`

This is the core visual component — dark Mapbox map with stacked contour fill layers per mode.

- [ ] **Step 1: Create the isochrone map**

Create `src/components/isochrone/isochrone-map.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LatLng, TransportMode } from "@/lib/types";
import type { IsochroneLayer } from "@/lib/types";
import { reverseGeocode } from "@/lib/geocode";

interface IsochroneMapProps {
  center: LatLng;
  layers: IsochroneLayer[];
  activeModes: TransportMode[];
  maxMinutes: number;
  onMapClick?: (location: LatLng) => void;
}

/** Opacity decreases for outer bands. Index 0 = innermost (brightest). */
const BAND_OPACITIES = [0.55, 0.45, 0.35, 0.28, 0.2, 0.14, 0.08];

export function IsochroneMap({
  center,
  layers,
  activeModes,
  maxMinutes,
  onMapClick,
}: IsochroneMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const geocodeCache = useRef<Map<string, string>>(new Map());

  // Initialize dark map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [center.lng, center.lat],
      zoom: 12,
    });
    mapRef.current = m;

    m.on("load", () => {
      // Click handler for pin drop
      m.on("click", (e) => {
        const waterFeatures = m.queryRenderedFeatures(e.point, {
          layers: m.getStyle().layers
            ?.filter((l) => l.id.includes("water"))
            .map((l) => l.id) ?? [],
        });
        if (waterFeatures.length > 0) return;
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      originMarkerRef.current?.remove();
      m.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update origin marker
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    originMarkerRef.current?.remove();

    if (center) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;background:#e21822;border:3px solid #fcdde8;border-radius:0;box-shadow:0 0 12px rgba(226,24,34,0.6)";
      originMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(m);

      m.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 800 });
    }
  }, [center, mapReady]);

  // Render contour layers
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    // Clear previous isochrone layers and sources
    const style = m.getStyle();
    if (style?.layers) {
      for (const layer of style.layers) {
        if (layer.id.startsWith("iso-")) {
          m.removeLayer(layer.id);
        }
      }
    }
    if (style?.sources) {
      for (const sourceId of Object.keys(style.sources)) {
        if (sourceId.startsWith("iso-")) {
          m.removeSource(sourceId);
        }
      }
    }

    // Add layers: outermost band first (so inner bands render on top)
    for (const layer of layers) {
      if (!activeModes.includes(layer.mode)) continue;

      // Filter bands by current maxMinutes
      const visibleBands = layer.bands.filter((b) => b.maxMinutes <= maxMinutes);
      if (visibleBands.length === 0) continue;

      // Render bands from outermost to innermost
      const reversed = [...visibleBands].reverse();

      for (let i = 0; i < reversed.length; i++) {
        const band = reversed[i];
        const sourceId = `iso-${layer.mode}-${band.maxMinutes}`;
        const layerId = `iso-fill-${layer.mode}-${band.maxMinutes}`;

        m.addSource(sourceId, {
          type: "geojson",
          data: band.polygon,
        });

        // Outermost bands get lower opacity
        const opacityIdx = reversed.length - 1 - i;
        const opacity = BAND_OPACITIES[Math.min(opacityIdx, BAND_OPACITIES.length - 1)];

        m.addLayer({
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": layer.color,
            "fill-opacity": opacity,
          },
        });
      }
    }
  }, [layers, activeModes, maxMinutes, mapReady]);

  // Tooltip on hover over contour layers
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const handleMouseMove = async (e: mapboxgl.MapMouseEvent) => {
      // Check which isochrone layers the cursor is over
      const point = e.point;
      const style = m.getStyle();
      const isoLayerIds = style?.layers
        ?.filter((l) => l.id.startsWith("iso-fill-"))
        .map((l) => l.id) ?? [];

      if (isoLayerIds.length === 0) return;

      const features = m.queryRenderedFeatures(point, { layers: isoLayerIds });
      if (features.length === 0) {
        setTooltipContent(null);
        m.getCanvas().style.cursor = "";
        return;
      }

      m.getCanvas().style.cursor = "pointer";

      // Get the innermost (smallest maxMinutes) band the cursor is in, per mode
      const modeMaxMin = new Map<string, number>();
      for (const f of features) {
        const mode = f.properties?.mode as string;
        const maxMin = f.properties?.maxMinutes as number;
        const existing = modeMaxMin.get(mode);
        if (!existing || maxMin < existing) {
          modeMaxMin.set(mode, maxMin);
        }
      }

      // Reverse geocode position
      const cacheKey = `${e.lngLat.lat.toFixed(3)},${e.lngLat.lng.toFixed(3)}`;
      let address = geocodeCache.current.get(cacheKey);
      if (!address) {
        address = await reverseGeocode(
          { lat: e.lngLat.lat, lng: e.lngLat.lng },
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
        );
        geocodeCache.current.set(cacheKey, address);
      }

      const modeLabels: Record<string, string> = {
        walk: "Walk", bike: "Bike", subway: "Subway",
        car: "Car", bikeSubway: "Bike+Sub", ferry: "Ferry",
      };

      const lines = Array.from(modeMaxMin.entries())
        .map(([mode, mins]) => `${modeLabels[mode] ?? mode}: <${mins}m`)
        .join(" · ");

      setTooltipContent(`${address}\n${lines}`);
      setTooltipPos({ x: point.x, y: point.y });
    };

    const handleMouseLeave = () => {
      setTooltipContent(null);
      m.getCanvas().style.cursor = "";
    };

    m.on("mousemove", handleMouseMove);
    m.on("mouseout", handleMouseLeave);

    return () => {
      m.off("mousemove", handleMouseMove);
      m.off("mouseout", handleMouseLeave);
    };
  }, [mapReady]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full cursor-crosshair" />

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
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/isochrone/isochrone-map.tsx
git commit -m "feat: add dark isochrone map with contour layers and glow"
```

---

### Task 6: Rewrite the Explore page

**Files:**
- Modify: `src/app/explore/page.tsx`

Replace the entire Explore page to use the new isochrone components. Keeps the same compute pipeline (web worker), but feeds results through `generateIsochroneLayers` and renders with the new map.

- [ ] **Step 1: Rewrite explore/page.tsx**

Replace the contents of `src/app/explore/page.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { IsochroneMap } from "@/components/isochrone/isochrone-map";
import { TimeSlider } from "@/components/isochrone/time-slider";
import { ModeLegend } from "@/components/isochrone/mode-legend";
import { PanelSection } from "@/components/ui/panel-section";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import { generateIsochroneLayers } from "@/lib/isochrone";
import type {
  LatLng,
  TransportMode,
  HexCell,
  IsochroneLayer,
  StationGraph,
  StationMatrix,
} from "@/lib/types";
import { CORE_NYC_BOUNDS, H3_RESOLUTION } from "@/lib/constants";

const ALL_MODES: TransportMode[] = ["subway", "walk", "car", "bike", "bikeSubway", "ferry"];

export default function ExplorePage() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [activeModes, setActiveModes] = useState<TransportMode[]>(ALL_MODES);
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [cells, setCells] = useState<HexCell[]>([]);
  const [computing, setComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [ferryData, setFerryData] = useState<{
    data: FerryData;
    adjacency: FerryAdjacency;
  } | null>(null);
  const [dataReady, setDataReady] = useState(false);

  // Load transit data on mount
  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
        ]);
        const graph: StationGraph = await graphRes.json();
        const matrix: StationMatrix = await matrixRes.json();
        setStationGraph(graph);
        setStationMatrix(matrix);
        setSubwayData(new SubwayData(graph, matrix));

        try {
          const citi = await CitiBikeData.fetch();
          setCitiBikeData(citi);
        } catch (err) {
          console.warn("Citi Bike data unavailable:", err);
        }

        const ferry = await loadFerryData();
        setFerryData(ferry);

        setDataReady(true);
      } catch (err) {
        console.error("Failed to load transit data:", err);
        setDataReady(true);
      }
    }
    load();
  }, []);

  const runCompute = useCallback(
    async (loc: LatLng) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData) return;

      setComputing(true);
      setComputeProgress(0);
      try {
        const rawCenters = generateHexCenters(CORE_NYC_BOUNDS, H3_RESOLUTION);
        const hexCenters = rawCenters.map((c) => ({
          h3Index: c.h3Index,
          lat: c.center.lat,
          lng: c.center.lng,
        }));

        // Compute all modes at once — worker calculates times for every mode
        const result = await computeHexGrid(
          {
            hexCenters,
            origin: loc,
            destinations: [],
            modes: ALL_MODES,
            stationGraph,
            stationMatrix,
            citiBikeStations: citiBikeData.getAllStations(),
            ferryTerminals: ferryData.data.terminals,
            ferryAdjacency: ferryData.adjacency,
          },
          (percent) => setComputeProgress(percent)
        );

        // Merge geometry back onto worker results
        const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
        const fullCells = result.cells.map((cell) => {
          const geo = geoLookup.get(cell.h3Index)!;
          return { ...cell, center: geo.center, boundary: geo.boundary };
        });

        setCells(fullCells);
      } catch (err) {
        console.error("Compute failed:", err);
      } finally {
        setComputing(false);
      }
    },
    [stationGraph, stationMatrix, citiBikeData, ferryData]
  );

  // Generate isochrone layers from cells (memoized — only recomputes when cells change)
  const isochroneLayers: IsochroneLayer[] = useMemo(() => {
    if (cells.length === 0) return [];
    return generateIsochroneLayers(cells, ALL_MODES, 60);
  }, [cells]);

  const handleAddressSelect = useCallback(
    (address: string, location: LatLng) => {
      setOriginAddress(address);
      setOrigin(location);
      runCompute(location);
    },
    [runCompute]
  );

  const handleMapClick = useCallback(
    (location: LatLng) => {
      setOrigin(location);
      setOriginAddress("");
      runCompute(location);
    },
    [runCompute]
  );

  const toggleMode = useCallback((mode: TransportMode) => {
    setActiveModes((prev) => {
      if (prev.includes(mode)) {
        return prev.length > 1 ? prev.filter((m) => m !== mode) : prev;
      }
      return [...prev, mode];
    });
  }, []);

  const mapCenter: LatLng = origin ?? { lat: 40.728, lng: -73.958 };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
        <PanelSection className="pb-6">
          <h1 className="text-3xl leading-none">
            Isochrone<br />Explorer
          </h1>
          <p className="font-body text-sm text-red/70 leading-relaxed">
            How far can you go? Enter an address or click anywhere on the map.
          </p>
        </PanelSection>

        <PanelSection title="Location">
          <AddressAutocomplete
            label="Address"
            placeholder="Start typing an address…"
            onSelect={handleAddressSelect}
            initialValue={originAddress}
            autoFocus
          />
          {!dataReady && (
            <p className="font-body text-xs text-red/60 animate-pulse">
              Loading transit data…
            </p>
          )}
        </PanelSection>

        <PanelSection title="Travel Time">
          <TimeSlider value={maxMinutes} onChange={setMaxMinutes} />
        </PanelSection>

        <PanelSection title="Transport Modes">
          <ModeLegend activeModes={activeModes} onToggle={toggleMode} />
          <p className="font-body text-xs text-red/50 mt-2">
            All modes shown. Click to toggle.
          </p>
        </PanelSection>

        {origin && !computing && cells.length > 0 && (
          <PanelSection title="Reading the Map">
            <p className="font-body text-xs text-red/70 leading-relaxed">
              Bright inner rings = reachable quickly. Faded outer rings = takes
              longer. Each color is a transport mode. Hover for details.
            </p>
          </PanelSection>
        )}
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        {computing && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl text-pink animate-pulse">
              Computing… {computeProgress}%
            </span>
          </div>
        )}

        {!origin && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <p className="font-display italic uppercase text-3xl text-white/20">
                Enter an address
              </p>
              <p className="font-body text-sm text-white/10 mt-2">
                or click the map to drop a pin
              </p>
            </div>
          </div>
        )}

        <IsochroneMap
          center={mapCenter}
          layers={isochroneLayers}
          activeModes={activeModes}
          maxMinutes={maxMinutes}
          onMapClick={handleMapClick}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/explore/page.tsx
git commit -m "feat: replace explore page with isochrone contour view"
```

---

### Task 7: Update landing page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update Explore card copy**

In `src/app/page.tsx`, change the second `ModeCard` props:

```tsx
<ModeCard
  href="/explore"
  title="Isochrone Explorer"
  description="Drop a pin and see how far you can go. Glowing contour rings show your reach by subway, bike, foot, and car — drag the slider to watch them grow."
  cta="Explore"
/>
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update landing page copy for isochrone explorer"
```

---

### Task 8: Dev server test and deploy

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all tests pass (existing + new isochrone tests)

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev`

Check:
1. Landing page shows "Isochrone Explorer" card
2. Navigate to /explore — dark map loads
3. Enter an address — contour bands appear in all mode colors
4. Drag time slider — bands grow/shrink
5. Toggle modes off — layers disappear
6. Click map to drop pin — new isochrone generates
7. Hover contour — tooltip shows neighborhood + mode times

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: clean build, no errors

- [ ] **Step 4: Push and deploy**

```bash
git push origin main
```

Verify at https://nyc-transit-heatmap.vercel.app/explore

- [ ] **Step 5: Final commit (session marker)**

```bash
git add -A
git commit -m "Session 5: isochrone explore upgrade — contour bands, dark map, time slider, mode comparison"
```
