# NYC Transit Heatmap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that visualizes NYC travel times as a heatmap with multimodal transit comparison, including a novel bike+subway combo mode.

**Architecture:** Two-screen Next.js app — setup survey collects origin/destinations/modes, results screen shows Mapbox GL JS map with pre-computed heatmap overlay. Transit times computed client-side using a build-time subway graph (GTFS) and runtime math for car/bike/walk. Web Worker handles grid computation.

**Tech Stack:** Next.js 15 (App Router), Mapbox GL JS, Tailwind CSS, TypeScript, Web Worker

**Spec:** `docs/superpowers/specs/2026-03-12-nyc-transit-heatmap-design.md`

**Design reference:** Variant.com output (brutalist pink/red, see spec Visual Design section)

---

## File Structure

```
nyc-transit-heatmap/
├── scripts/
│   └── build-subway-graph.ts          # GTFS parser → station-graph.json + station-matrix.json
├── public/
│   └── data/
│       ├── station-graph.json          # Subway stations + edges (build artifact)
│       └── station-matrix.json         # All-pairs shortest path matrix (build artifact)
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with fonts + theme
│   │   ├── globals.css                 # Tailwind + custom CSS vars (pink/red palette)
│   │   ├── page.tsx                    # Setup survey screen
│   │   └── results/
│   │       └── page.tsx                # Results screen (map + sidebar)
│   ├── components/
│   │   ├── setup/
│   │   │   ├── address-input.tsx       # Geocoding text input with Mapbox
│   │   │   ├── mode-toggles.tsx        # Transport mode chip toggles
│   │   │   ├── destination-list.tsx    # Pinned destinations with frequency
│   │   │   ├── destination-card.tsx    # Single destination with time estimates
│   │   │   └── frequency-bars.tsx      # Filled/unfilled block frequency indicator
│   │   ├── results/
│   │   │   ├── map-view.tsx            # Mapbox GL JS map with heatmap layer
│   │   │   ├── sidebar.tsx             # Results sidebar (mirrors setup controls)
│   │   │   ├── heatmap-legend.tsx      # Color gradient legend
│   │   │   ├── view-switch.tsx         # Composite / Per Pin toggle
│   │   │   ├── monthly-footer.tsx      # Monthly time + cost summary
│   │   │   └── hover-tooltip.tsx       # Grid point hover tooltip
│   │   └── ui/
│   │       ├── chip.tsx                # Reusable brutalist chip/button
│   │       └── panel-section.tsx       # Sidebar section with title + border
│   ├── lib/
│   │   ├── types.ts                    # Shared TypeScript types
│   │   ├── constants.ts                # Speeds, costs, default bounds, frequencies
│   │   ├── geocode.ts                  # Mapbox geocoding wrapper
│   │   ├── travel-time.ts             # Point-to-point travel time calculations
│   │   ├── cost.ts                     # Monthly cost estimation
│   │   ├── citibike.ts                 # Citi Bike GBFS fetch + spatial index
│   │   └── subway.ts                   # Load station graph + matrix, nearest station lookup
│   └── workers/
│       └── grid-worker.ts             # Web Worker: grid computation for heatmap
├── data/
│   └── gtfs/                           # MTA GTFS files (gitignored, downloaded by script)
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Chunk 1: Project Scaffold + Core Types + Travel Math

### Task 1: Next.js Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `.gitignore`, `.env.local.example`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/andrew/Projects/nyc-transit-heatmap
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the scaffold.

- [ ] **Step 2: Install dependencies**

```bash
npm install mapbox-gl @mapbox/mapbox-gl-geocoder
npm install -D @types/mapbox-gl
```

- [ ] **Step 3: Configure Tailwind with brutalist theme**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pink: "#fcdde8",
        red: "#e21822",
      },
      fontFamily: {
        display: ['"Arial Black"', "Impact", "sans-serif"],
        body: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up globals.css**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  background-color: #fcdde8;
  color: #e21822;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, .display-text {
  font-family: "Arial Black", Impact, sans-serif;
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1;
}
```

- [ ] **Step 5: Create root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NYC Transit Heatmap",
  description: "Visualize travel times across NYC by transit mode",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden p-3">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create placeholder pages**

`src/app/page.tsx`:
```tsx
export default function SetupPage() {
  return (
    <div className="flex h-full border-3 border-red">
      <h1 className="p-6 text-4xl">Transit Heatmap</h1>
    </div>
  );
}
```

`src/app/results/page.tsx`:
```tsx
export default function ResultsPage() {
  return (
    <div className="flex h-full border-3 border-red">
      <h1 className="p-6 text-4xl">Results</h1>
    </div>
  );
}
```

- [ ] **Step 7: Add .env.local.example**

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

- [ ] **Step 8: Update .gitignore**

Append to `.gitignore`:
```
data/gtfs/
.env.local
.superpowers/
```

- [ ] **Step 9: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with brutalist theme"
```

---

### Task 2: Core Types + Constants

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Define TypeScript types**

`src/lib/types.ts`:

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
}

export interface GridPoint {
  lat: number;
  lng: number;
  times: Record<TransportMode, number | null>;
  fastest: TransportMode;
}

export interface CompositeGridPoint extends GridPoint {
  compositeScore: number; // weighted avg minutes
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

export interface SetupState {
  origin: LatLng | null;
  originAddress: string;
  modes: TransportMode[];
  destinations: Destination[];
  bounds: BoundingBox;
}
```

- [ ] **Step 2: Define constants**

`src/lib/constants.ts`:

```typescript
import type { BoundingBox, DestinationCategory } from "./types";

// Speeds in mph
export const WALK_SPEED = 3;
export const BIKE_SPEED = 9;
export const DRIVE_SPEED_MANHATTAN = 12;
export const DRIVE_SPEED_OUTER = 20;

// Thresholds
export const BIKE_DOCK_RANGE_MI = 0.25; // 5-min walk
export const SUBWAY_MAX_WALK_MI = 1.5;
export const BIKE_SUBWAY_DOCK_RANGE_MI = 0.5;
export const BIKE_DOCK_TIME_MIN = 2; // dock/undock time
export const BIKE_SAVINGS_PERCENT = 0.2; // 20% threshold
export const BIKE_SAVINGS_MIN = 5; // 5-min threshold

// Manhattan boundary (approx 96th St)
export const MANHATTAN_BOUNDARY_LAT = 40.7831;

// Grid
export const GRID_SPACING_DEG = 0.0018; // ~200m
export const DEFAULT_BOUNDS: BoundingBox = {
  sw: { lat: 40.695, lng: -74.02 },
  ne: { lat: 40.81, lng: -73.91 },
};

// Cost per trip
export const COST_SUBWAY_RIDE = 2.9;
export const COST_METROCARD_UNLIMITED = 132;
export const COST_METROCARD_THRESHOLD = 45; // trips/month
export const COST_CITIBIKE_MONTHLY = 17.99;
export const COST_CAR_RIDE = 15;
export const WEEKS_PER_MONTH = 4.3;

// Default frequencies by category
export const DEFAULT_FREQUENCY: Record<DestinationCategory, number> = {
  work: 5,
  social: 1,
  fitness: 3,
  errands: 2,
  other: 1,
};

// Citi Bike GBFS
export const CITIBIKE_STATION_INFO_URL =
  "https://gbfs.citibikenyc.com/gbfs/en/station_information.json";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add core types and constants"
```

---

### Task 3: Travel Time Calculation Functions

**Files:**
- Create: `src/lib/travel-time.ts`
- Create: `src/lib/__tests__/travel-time.test.ts`

- [ ] **Step 1: Write failing tests for distance + travel time helpers**

`src/lib/__tests__/travel-time.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  manhattanDistanceMi,
  walkTime,
  bikeTime,
  driveTime,
} from "../travel-time";

describe("manhattanDistanceMi", () => {
  it("computes Manhattan distance between two points", () => {
    // ~0.5 mi apart
    const d = manhattanDistanceMi(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.735, lng: -73.985 }
    );
    expect(d).toBeGreaterThan(0.4);
    expect(d).toBeLessThan(0.7);
  });

  it("returns 0 for same point", () => {
    const d = manhattanDistanceMi(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.73, lng: -73.99 }
    );
    expect(d).toBe(0);
  });
});

describe("walkTime", () => {
  it("computes walk time in minutes", () => {
    // 1 mile at 3 mph = 20 min
    const t = walkTime(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.7445, lng: -73.99 } // ~1 mi north
    );
    expect(t).toBeGreaterThan(15);
    expect(t).toBeLessThan(25);
  });
});

describe("bikeTime", () => {
  it("computes bike time with dock overhead", () => {
    // 1 mile at 9 mph = ~6.7 min + 4 min dock = ~10.7
    const t = bikeTime(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.7445, lng: -73.99 }
    );
    expect(t).toBeGreaterThan(8);
    expect(t).toBeLessThan(14);
  });
});

describe("driveTime", () => {
  it("uses Manhattan speed for points in Manhattan", () => {
    const t = driveTime(
      { lat: 40.75, lng: -73.99 }, // midtown
      { lat: 40.76, lng: -73.98 }
    );
    // Short distance, 12 mph
    expect(t).toBeGreaterThan(2);
    expect(t).toBeLessThan(10);
  });

  it("uses outer borough speed for points outside Manhattan", () => {
    const t = driveTime(
      { lat: 40.68, lng: -73.95 }, // Brooklyn
      { lat: 40.69, lng: -73.94 }
    );
    // Same distance but 20 mph = faster
    expect(t).toBeGreaterThan(1);
    expect(t).toBeLessThan(6);
  });
});
```

- [ ] **Step 2: Install vitest and run tests to verify they fail**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: { globals: true },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

```bash
npm test -- src/lib/__tests__/travel-time.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement travel time functions**

`src/lib/travel-time.ts`:

```typescript
import type { LatLng } from "./types";
import {
  WALK_SPEED,
  BIKE_SPEED,
  DRIVE_SPEED_MANHATTAN,
  DRIVE_SPEED_OUTER,
  BIKE_DOCK_TIME_MIN,
  MANHATTAN_BOUNDARY_LAT,
} from "./constants";

const DEG_LAT_TO_MI = 69.0;
const DEG_LNG_TO_MI_AT_NYC = 52.3; // cos(40.7°) * 69

export function manhattanDistanceMi(a: LatLng, b: LatLng): number {
  const dLat = Math.abs(a.lat - b.lat) * DEG_LAT_TO_MI;
  const dLng = Math.abs(a.lng - b.lng) * DEG_LNG_TO_MI_AT_NYC;
  return dLat + dLng;
}

export function walkTime(from: LatLng, to: LatLng): number {
  return (manhattanDistanceMi(from, to) / WALK_SPEED) * 60;
}

export function bikeTime(from: LatLng, to: LatLng): number {
  return (manhattanDistanceMi(from, to) / BIKE_SPEED) * 60 + BIKE_DOCK_TIME_MIN * 2;
}

function isInManhattan(point: LatLng): boolean {
  return (
    point.lat <= MANHATTAN_BOUNDARY_LAT &&
    point.lng >= -74.02 &&
    point.lng <= -73.9
  );
}

export function driveTime(from: LatLng, to: LatLng): number {
  const bothManhattan = isInManhattan(from) && isInManhattan(to);
  const speed = bothManhattan ? DRIVE_SPEED_MANHATTAN : DRIVE_SPEED_OUTER;
  return (manhattanDistanceMi(from, to) / speed) * 60;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/__tests__/travel-time.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/travel-time.ts src/lib/__tests__/travel-time.test.ts package.json vitest.config.ts
git commit -m "feat: add travel time calculation functions with tests"
```

---

### Task 4: Cost Estimation

**Files:**
- Create: `src/lib/cost.ts`
- Create: `src/lib/__tests__/cost.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/__tests__/cost.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeMonthlyCost } from "../cost";
import type { Destination, TransportMode } from "../types";

const workDest: Destination = {
  id: "1",
  name: "Work",
  address: "Midtown",
  location: { lat: 40.755, lng: -73.98 },
  category: "work",
  frequency: 5,
};

describe("computeMonthlyCost", () => {
  it("caps subway at unlimited MetroCard price", () => {
    // 5x/week * 2 roundtrips * 4.3 = 43 trips → under 45, so per-ride
    // 43 * $2.90 = $124.70
    const cost = computeMonthlyCost(
      [workDest],
      [{ destId: "1", mode: "subway" as TransportMode }]
    );
    expect(cost).toBeCloseTo(124.7, 0);
  });

  it("adds Citi Bike flat fee when bike mode is used", () => {
    const cost = computeMonthlyCost(
      [workDest],
      [{ destId: "1", mode: "bike" as TransportMode }]
    );
    // Car: free trips don't apply, bike trips are free after membership
    // $17.99 membership
    expect(cost).toBeCloseTo(17.99, 1);
  });

  it("sums costs across multiple destinations", () => {
    const gymDest: Destination = {
      id: "2", name: "Gym", address: "LES",
      location: { lat: 40.72, lng: -73.99 },
      category: "fitness", frequency: 3,
    };
    const cost = computeMonthlyCost(
      [workDest, gymDest],
      [
        { destId: "1", mode: "subway" as TransportMode },
        { destId: "2", mode: "car" as TransportMode },
      ]
    );
    // Subway: 5*2*4.3 = 43 trips * $2.90 = $124.70
    // Car: 3*2*4.3 = 25.8 trips * $15 = $387
    expect(cost).toBeCloseTo(124.7 + 387, 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/cost.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement cost calculation**

`src/lib/cost.ts`:

```typescript
import type { Destination, TransportMode } from "./types";
import {
  COST_SUBWAY_RIDE,
  COST_METROCARD_UNLIMITED,
  COST_METROCARD_THRESHOLD,
  COST_CITIBIKE_MONTHLY,
  COST_CAR_RIDE,
  WEEKS_PER_MONTH,
} from "./constants";

interface DestinationMode {
  destId: string;
  mode: TransportMode;
}

export function computeMonthlyCost(
  destinations: Destination[],
  destinationModes: DestinationMode[]
): number {
  let totalCost = 0;
  let totalSubwayTrips = 0;
  let usesBike = false;

  const destMap = new Map(destinations.map((d) => [d.id, d]));

  for (const { destId, mode } of destinationModes) {
    const dest = destMap.get(destId);
    if (!dest) continue;

    const monthlyTrips = dest.frequency * 2 * WEEKS_PER_MONTH;

    switch (mode) {
      case "subway":
      case "bikeSubway":
        totalSubwayTrips += monthlyTrips;
        if (mode === "bikeSubway") usesBike = true;
        break;
      case "car":
        totalCost += monthlyTrips * COST_CAR_RIDE;
        break;
      case "bike":
        usesBike = true;
        break;
      case "walk":
        break;
    }
  }

  // Subway cost: per-ride or unlimited
  if (totalSubwayTrips > 0) {
    const perRideCost = totalSubwayTrips * COST_SUBWAY_RIDE;
    totalCost += totalSubwayTrips > COST_METROCARD_THRESHOLD
      ? COST_METROCARD_UNLIMITED
      : perRideCost;
  }

  if (usesBike) {
    totalCost += COST_CITIBIKE_MONTHLY;
  }

  return totalCost;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/cost.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cost.ts src/lib/__tests__/cost.test.ts
git commit -m "feat: add monthly cost estimation with MetroCard cap"
```

---

## Chunk 2: GTFS Build Script + Subway Data

### Task 5: GTFS Download + Parse Script

**Files:**
- Create: `scripts/build-subway-graph.ts`
- Create: `scripts/download-gtfs.sh`

- [ ] **Step 1: Create GTFS download script**

`scripts/download-gtfs.sh`:

```bash
#!/bin/bash
set -e
mkdir -p data/gtfs
cd data/gtfs
if [ ! -f stops.txt ]; then
  echo "Downloading MTA GTFS static feed..."
  curl -L -o gtfs.zip "http://web.mta.info/developers/data/nyct/subway/google_transit.zip"
  unzip -o gtfs.zip
  rm gtfs.zip
  echo "GTFS data downloaded and extracted."
else
  echo "GTFS data already exists, skipping download."
fi
```

- [ ] **Step 2: Make executable and run**

```bash
chmod +x scripts/download-gtfs.sh
bash scripts/download-gtfs.sh
```

Expected: Files appear in `data/gtfs/` including `stops.txt`, `stop_times.txt`, `trips.txt`, `transfers.txt`, `calendar.txt`.

- [ ] **Step 3: Install build script dependencies**

```bash
npm install -D tsx csv-parse
```

- [ ] **Step 4: Write the GTFS parser**

`scripts/build-subway-graph.ts`:

```typescript
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { parse } from "csv-parse/sync";
import { resolve } from "path";

const GTFS_DIR = resolve(__dirname, "../data/gtfs");
const OUT_DIR = resolve(__dirname, "../public/data");

// --- Parse CSV helper ---
function readCsv<T>(filename: string): T[] {
  const raw = readFileSync(resolve(GTFS_DIR, filename), "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true }) as T[];
}

// --- Types for GTFS rows ---
interface Stop { stop_id: string; stop_name: string; stop_lat: string; stop_lon: string; parent_station: string; }
interface StopTime { trip_id: string; arrival_time: string; departure_time: string; stop_id: string; stop_sequence: string; }
interface Trip { trip_id: string; route_id: string; service_id: string; direction_id: string; }
interface Calendar { service_id: string; monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; }
interface Transfer { from_stop_id: string; to_stop_id: string; min_transfer_time: string; }

function timeToMinutes(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return h * 60 + m + s / 60;
}

function main() {
  console.log("Loading GTFS files...");
  const stops = readCsv<Stop>("stops.txt");
  const stopTimes = readCsv<StopTime>("stop_times.txt");
  const trips = readCsv<Trip>("trips.txt");
  const calendar = readCsv<Calendar>("calendar.txt");

  let transfers: Transfer[] = [];
  try { transfers = readCsv<Transfer>("transfers.txt"); } catch { console.log("No transfers.txt found, using defaults"); }

  // 1. Find weekday service IDs
  const weekdayServiceIds = new Set(
    calendar
      .filter((c) => c.monday === "1" || c.tuesday === "1" || c.wednesday === "1" || c.thursday === "1" || c.friday === "1")
      .map((c) => c.service_id)
  );

  // 2. Filter trips to weekday service
  const weekdayTripIds = new Set(
    trips.filter((t) => weekdayServiceIds.has(t.service_id)).map((t) => t.trip_id)
  );
  const tripRouteMap = new Map(trips.map((t) => [t.trip_id, t.route_id]));

  // 3. Build parent station map (stop_id → parent_station or self)
  const parentMap = new Map<string, string>();
  for (const s of stops) {
    parentMap.set(s.stop_id, s.parent_station || s.stop_id);
  }

  // 4. Build station info from parent stations
  const stationMap: Record<string, { name: string; lat: number; lng: number; lines: Set<string> }> = {};
  for (const s of stops) {
    if (!s.parent_station || s.parent_station === "") {
      // This is a parent station or standalone
      if (!stationMap[s.stop_id]) {
        stationMap[s.stop_id] = {
          name: s.stop_name,
          lat: parseFloat(s.stop_lat),
          lng: parseFloat(s.stop_lon),
          lines: new Set(),
        };
      }
    }
  }

  // 5. Group stop_times by trip, filter to weekday 7:30-9:30am departures
  console.log("Processing stop times...");
  const tripStops = new Map<string, { stationId: string; time: number }[]>();

  for (const st of stopTimes) {
    if (!weekdayTripIds.has(st.trip_id)) continue;
    const depMin = timeToMinutes(st.departure_time);
    if (depMin < 450 || depMin > 570) continue; // 7:30am = 450, 9:30am = 570

    const stationId = parentMap.get(st.stop_id) || st.stop_id;
    if (!tripStops.has(st.trip_id)) tripStops.set(st.trip_id, []);
    tripStops.get(st.trip_id)!.push({
      stationId,
      time: depMin,
    });

    // Track which lines serve each station
    const routeId = tripRouteMap.get(st.trip_id);
    if (routeId && stationMap[stationId]) {
      stationMap[stationId].lines.add(routeId);
    }
  }

  // 6. Compute edge weights (median travel time between consecutive stations)
  console.log("Computing edge weights...");
  const edgeSamples = new Map<string, number[]>(); // "stationA→stationB" → [times]

  for (const [, stops] of tripStops) {
    const sorted = stops.sort((a, b) => parseInt(a.stationId) - parseInt(b.stationId) || a.time - b.time);
    // Re-sort by time
    sorted.sort((a, b) => a.time - b.time);

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      if (from.stationId === to.stationId) continue;

      const key = `${from.stationId}→${to.stationId}`;
      const travelTime = to.time - from.time;
      if (travelTime > 0 && travelTime < 30) { // Sanity: skip > 30 min edges
        if (!edgeSamples.has(key)) edgeSamples.set(key, []);
        edgeSamples.get(key)!.push(travelTime);
      }
    }
  }

  const edges: Record<string, Record<string, number>> = {};
  for (const [key, samples] of edgeSamples) {
    const [from, to] = key.split("→");
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    if (!edges[from]) edges[from] = {};
    edges[from][to] = Math.round(median * 10) / 10;
  }

  // 7. Parse transfers
  const transferMap: Record<string, Record<string, number>> = {};
  for (const t of transfers) {
    const fromStation = parentMap.get(t.from_stop_id) || t.from_stop_id;
    const toStation = parentMap.get(t.to_stop_id) || t.to_stop_id;
    if (fromStation === toStation) continue;
    if (!transferMap[fromStation]) transferMap[fromStation] = {};
    transferMap[fromStation][toStation] = Math.ceil(parseInt(t.min_transfer_time || "300") / 60);
  }

  // 8. Build station graph JSON
  const stationIds = Object.keys(stationMap).filter((id) => stationMap[id].lines.size > 0);
  const stations: Record<string, { name: string; lat: number; lng: number; lines: string[] }> = {};
  for (const id of stationIds) {
    const s = stationMap[id];
    stations[id] = { name: s.name, lat: s.lat, lng: s.lng, lines: Array.from(s.lines) };
  }

  console.log(`Stations: ${stationIds.length}, Edges: ${edgeSamples.size}`);

  // 9. Floyd-Warshall for all-pairs shortest path
  console.log("Running Floyd-Warshall...");
  const n = stationIds.length;
  const idxMap = new Map(stationIds.map((id, i) => [id, i]));
  const INF = 999;
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(INF));

  // Init diagonal
  for (let i = 0; i < n; i++) dist[i][i] = 0;

  // Init direct edges
  for (const [from, neighbors] of Object.entries(edges)) {
    const i = idxMap.get(from);
    if (i === undefined) continue;
    for (const [to, time] of Object.entries(neighbors)) {
      const j = idxMap.get(to);
      if (j === undefined) continue;
      dist[i][j] = Math.min(dist[i][j], time);
    }
  }

  // Init transfers (add 5 min default if not specified)
  for (const [from, targets] of Object.entries(transferMap)) {
    const i = idxMap.get(from);
    if (i === undefined) continue;
    for (const [to, time] of Object.entries(targets)) {
      const j = idxMap.get(to);
      if (j === undefined) continue;
      dist[i][j] = Math.min(dist[i][j], time);
    }
  }

  // Floyd-Warshall
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }

  // Round matrix values
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      dist[i][j] = Math.round(dist[i][j] * 10) / 10;
    }
  }

  // 10. Write output files
  mkdirSync(OUT_DIR, { recursive: true });

  writeFileSync(
    resolve(OUT_DIR, "station-graph.json"),
    JSON.stringify({ stations, edges, transfers: transferMap }, null, 0)
  );

  writeFileSync(
    resolve(OUT_DIR, "station-matrix.json"),
    JSON.stringify({ stationIds, times: dist }, null, 0)
  );

  const graphSize = (readFileSync(resolve(OUT_DIR, "station-graph.json")).length / 1024).toFixed(0);
  const matrixSize = (readFileSync(resolve(OUT_DIR, "station-matrix.json")).length / 1024).toFixed(0);
  console.log(`Output: station-graph.json (${graphSize}KB), station-matrix.json (${matrixSize}KB)`);
  console.log("Done!");
}

main();
```

- [ ] **Step 5: Add build script to package.json**

Add to `scripts`:
```json
"build:subway": "tsx scripts/build-subway-graph.ts"
```

- [ ] **Step 6: Run the build script**

```bash
npm run build:subway
```

Expected: Outputs `public/data/station-graph.json` and `public/data/station-matrix.json`. Log shows station count (~400-500) and edge count (~1000-1200).

- [ ] **Step 7: Verify output files are reasonable**

```bash
wc -c public/data/station-graph.json public/data/station-matrix.json
```

Expected: station-graph.json ~50-200KB, station-matrix.json ~1-3MB.

- [ ] **Step 8: Commit**

```bash
git add scripts/ public/data/ package.json
git commit -m "feat: add GTFS parser and build subway station graph"
```

---

### Task 6: Subway Lookup Module

**Files:**
- Create: `src/lib/subway.ts`
- Create: `src/lib/__tests__/subway.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/__tests__/subway.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { SubwayData, findNearestStations } from "../subway";
import type { StationGraph, StationMatrix } from "../types";

// Minimal mock data
const mockGraph: StationGraph = {
  stations: {
    "S1": { name: "14th St", lat: 40.7368, lng: -73.9927, lines: ["1", "2", "3"] },
    "S2": { name: "23rd St", lat: 40.7418, lng: -73.9895, lines: ["1"] },
    "S3": { name: "Times Sq", lat: 40.7559, lng: -73.9870, lines: ["1", "2", "7", "N", "Q"] },
  },
  edges: { "S1": { "S2": 2 }, "S2": { "S3": 3 } },
  transfers: {},
};

const mockMatrix: StationMatrix = {
  stationIds: ["S1", "S2", "S3"],
  times: [
    [0, 2, 5],
    [2, 0, 3],
    [5, 3, 0],
  ],
};

describe("findNearestStations", () => {
  it("returns stations sorted by distance", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const nearest = data.findNearest({ lat: 40.737, lng: -73.993 }, 3);
    expect(nearest[0].stationId).toBe("S1"); // closest
    expect(nearest.length).toBeLessThanOrEqual(3);
  });
});

describe("SubwayData.travelTime", () => {
  it("looks up precomputed station-to-station time", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const time = data.stationToStationTime("S1", "S3");
    expect(time).toBe(5);
  });

  it("returns null for unknown station", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const time = data.stationToStationTime("S1", "UNKNOWN");
    expect(time).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/subway.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement subway module**

`src/lib/subway.ts`:

```typescript
import type { LatLng, StationGraph, StationMatrix } from "./types";
import { manhattanDistanceMi } from "./travel-time";
import { SUBWAY_MAX_WALK_MI, WALK_SPEED } from "./constants";

interface NearestStation {
  stationId: string;
  walkMinutes: number;
  distanceMi: number;
}

export class SubwayData {
  private graph: StationGraph;
  private matrix: StationMatrix;
  private idxMap: Map<string, number>;

  constructor(graph: StationGraph, matrix: StationMatrix) {
    this.graph = graph;
    this.matrix = matrix;
    this.idxMap = new Map(matrix.stationIds.map((id, i) => [id, i]));
  }

  findNearest(point: LatLng, count: number): NearestStation[] {
    const stations = Object.entries(this.graph.stations)
      .map(([id, s]) => ({
        stationId: id,
        distanceMi: manhattanDistanceMi(point, { lat: s.lat, lng: s.lng }),
      }))
      .filter((s) => s.distanceMi <= SUBWAY_MAX_WALK_MI)
      .sort((a, b) => a.distanceMi - b.distanceMi)
      .slice(0, count);

    return stations.map((s) => ({
      ...s,
      walkMinutes: (s.distanceMi / WALK_SPEED) * 60,
    }));
  }

  stationToStationTime(fromId: string, toId: string): number | null {
    const i = this.idxMap.get(fromId);
    const j = this.idxMap.get(toId);
    if (i === undefined || j === undefined) return null;
    const time = this.matrix.times[i][j];
    return time >= 999 ? null : time;
  }

  getStation(id: string) {
    return this.graph.stations[id] ?? null;
  }

  get allStations() {
    return this.graph.stations;
  }
}

export function computeSubwayTime(
  subway: SubwayData,
  from: LatLng,
  to: LatLng
): number | null {
  const nearOrigin = subway.findNearest(from, 3);
  const nearDest = subway.findNearest(to, 3);

  if (nearOrigin.length === 0 || nearDest.length === 0) return null;

  let best = Infinity;

  for (const origin of nearOrigin) {
    for (const dest of nearDest) {
      const stationTime = subway.stationToStationTime(origin.stationId, dest.stationId);
      if (stationTime === null) continue;

      const total = origin.walkMinutes + stationTime + dest.walkMinutes;
      if (total < best) best = total;
    }
  }

  return best === Infinity ? null : Math.round(best * 10) / 10;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/subway.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/subway.ts src/lib/__tests__/subway.test.ts
git commit -m "feat: add subway data loader with nearest-station lookup"
```

---

## Chunk 3: Citi Bike + Web Worker + Grid Computation

### Task 7: Citi Bike Data Fetcher

**Files:**
- Create: `src/lib/citibike.ts`

- [ ] **Step 1: Implement Citi Bike module**

`src/lib/citibike.ts`:

```typescript
import type { CitiBikeStation, LatLng } from "./types";
import { manhattanDistanceMi } from "./travel-time";
import { CITIBIKE_STATION_INFO_URL, BIKE_DOCK_RANGE_MI, BIKE_SUBWAY_DOCK_RANGE_MI } from "./constants";

export class CitiBikeData {
  private stations: CitiBikeStation[];

  constructor(stations: CitiBikeStation[]) {
    this.stations = stations;
  }

  static async fetch(): Promise<CitiBikeData> {
    const res = await fetch(CITIBIKE_STATION_INFO_URL);
    const json = await res.json();
    const stations: CitiBikeStation[] = json.data.stations.map((s: any) => ({
      id: s.station_id,
      name: s.name,
      lat: s.lat,
      lng: s.lon,
      capacity: s.capacity,
    }));
    return new CitiBikeData(stations);
  }

  findNearestDock(point: LatLng, maxDistMi: number = BIKE_DOCK_RANGE_MI): CitiBikeStation | null {
    let best: CitiBikeStation | null = null;
    let bestDist = maxDistMi;

    for (const s of this.stations) {
      const d = manhattanDistanceMi(point, { lat: s.lat, lng: s.lng });
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  hasDockNearby(point: LatLng, maxDistMi: number = BIKE_DOCK_RANGE_MI): boolean {
    return this.findNearestDock(point, maxDistMi) !== null;
  }

  findDockNearSubway(stationLat: number, stationLng: number): CitiBikeStation | null {
    return this.findNearestDock({ lat: stationLat, lng: stationLng }, BIKE_SUBWAY_DOCK_RANGE_MI);
  }
}
```

CitiBikeData is committed as part of Task 9.

---

### Task 8: Geocoding Module

**Files:**
- Create: `src/lib/geocode.ts`

- [ ] **Step 1: Implement geocoding wrapper**

`src/lib/geocode.ts`:

```typescript
import type { LatLng } from "./types";

const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export async function geocodeAddress(
  address: string,
  token: string
): Promise<{ location: LatLng; displayName: string } | null> {
  const query = encodeURIComponent(`${address}, New York, NY`);
  const url = `${MAPBOX_GEOCODE_URL}/${query}.json?access_token=${token}&limit=1&bbox=-74.3,-40.4,-73.6,40.95`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.features || data.features.length === 0) return null;

  const feature = data.features[0];
  const [lng, lat] = feature.center;

  return {
    location: { lat, lng },
    displayName: feature.place_name,
  };
}

export async function reverseGeocode(
  point: LatLng,
  token: string
): Promise<string> {
  const url = `${MAPBOX_GEOCODE_URL}/${point.lng},${point.lat}.json?access_token=${token}&types=address&limit=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.[0]) {
      return data.features[0].text || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
    }
  } catch {
    // fall through
  }

  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/geocode.ts
git commit -m "feat: add Mapbox geocoding wrapper"
```

---

### Task 9: Web Worker for Grid Computation

**Files:**
- Create: `src/workers/grid-worker.ts`
- Create: `src/lib/grid.ts` (helper to interface with the worker from main thread)

- [ ] **Step 1: Create the grid worker**

`src/workers/grid-worker.ts`:

```typescript
import type { LatLng, TransportMode, GridPoint, CompositeGridPoint, BoundingBox, StationGraph, StationMatrix, CitiBikeStation, Destination } from "../lib/types";
import { GRID_SPACING_DEG, WALK_SPEED, BIKE_SPEED, DRIVE_SPEED_MANHATTAN, DRIVE_SPEED_OUTER, MANHATTAN_BOUNDARY_LAT, BIKE_DOCK_TIME_MIN, BIKE_DOCK_RANGE_MI, SUBWAY_MAX_WALK_MI, BIKE_SUBWAY_DOCK_RANGE_MI, BIKE_SAVINGS_PERCENT, BIKE_SAVINGS_MIN } from "../lib/constants";

// Inline distance calc (can't import from modules in worker easily)
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

interface WorkerInput {
  bounds: BoundingBox;
  destination: LatLng;
  modes: TransportMode[];
  stationGraph: StationGraph;
  stationMatrix: StationMatrix;
  citiBikeStations: CitiBikeStation[];
}

interface WorkerBatchInput {
  bounds: BoundingBox;
  destinations: Destination[];
  modes: TransportMode[];
  stationGraph: StationGraph;
  stationMatrix: StationMatrix;
  citiBikeStations: CitiBikeStation[];
}

// Precompute station index map
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

  // Also compute plain subway time for threshold comparison
  const plainSubway = computeSubwayTime(from, to, stations, matrix, idxMap);
  if (plainSubway === null) return null;

  let best = plainSubway; // start with subway-only as baseline

  for (const f of nearFrom) {
    const fi = idxMap.get(f.id);
    if (fi === undefined) continue;
    const stationLoc = stations[f.id];

    // Find dock near this subway station
    const dockNearStation = findNearestDock(stationLoc, docks, BIKE_SUBWAY_DOCK_RANGE_MI);
    if (!dockNearStation) continue;

    // Bike-in: bike from origin to dock near station, then subway
    const bikeToStation = bikeMin(from, { lat: dockNearStation.lat, lng: dockNearStation.lng });
    const walkToStation = walkMin(from, stationLoc);

    // Apply threshold: only bike if saves >= 20% or >= 5 min
    const useBikeIn = (walkToStation - bikeToStation) >= BIKE_SAVINGS_MIN ||
      (walkToStation > 0 && (walkToStation - bikeToStation) / walkToStation >= BIKE_SAVINGS_PERCENT);
    const legIn = useBikeIn ? bikeToStation : walkToStation;

    for (const t of nearTo) {
      const ti = idxMap.get(t.id);
      if (ti === undefined) continue;
      const stationTime = matrix[fi][ti];
      if (stationTime >= 999) continue;
      const destStationLoc = stations[t.id];

      // Variant 1: bike-in, walk-out
      const walkOut = (t.dist / WALK_SPEED) * 60;
      const v1 = legIn + stationTime + walkOut;
      if (v1 < best) best = v1;

      // Variant 2: bike-in, bike-out (if dock near dest station)
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

// Main worker message handler
self.onmessage = (e: MessageEvent<WorkerBatchInput>) => {
  const { bounds, destinations, modes, stationGraph, stationMatrix, citiBikeStations } = e.data;

  const idxMap = buildStationIdxMap(stationMatrix.stationIds);

  // Generate grid points
  const points: LatLng[] = [];
  for (let lat = bounds.sw.lat; lat <= bounds.ne.lat; lat += GRID_SPACING_DEG) {
    for (let lng = bounds.sw.lng; lng <= bounds.ne.lng; lng += GRID_SPACING_DEG) {
      points.push({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 });
    }
  }

  // For each destination, compute grid
  const destGrids: Map<string, GridPoint[]> = new Map();

  for (const dest of destinations) {
    const grid: GridPoint[] = [];

    for (const point of points) {
      const times: Record<TransportMode, number | null> = {
        walk: modes.includes("walk") ? walkMin(point, dest.location) : null,
        car: modes.includes("car") ? driveMin(point, dest.location) : null,
        bike: null,
        subway: null,
        bikeSubway: null,
      };

      if (modes.includes("bike")) {
        const hasDockOrigin = findNearestDock(point, citiBikeStations, BIKE_DOCK_RANGE_MI);
        const hasDockDest = findNearestDock(dest.location, citiBikeStations, BIKE_DOCK_RANGE_MI);
        if (hasDockOrigin && hasDockDest) {
          times.bike = bikeMin(point, dest.location);
        }
      }

      if (modes.includes("subway")) {
        times.subway = computeSubwayTime(point, dest.location, stationGraph.stations, stationMatrix.times, idxMap);
      }

      if (modes.includes("bikeSubway")) {
        times.bikeSubway = computeBikeSubwayTime(point, dest.location, stationGraph.stations, stationMatrix.times, idxMap, citiBikeStations);
      }

      // Find fastest enabled mode
      let fastest: TransportMode = "walk";
      let fastestTime = Infinity;
      for (const [mode, time] of Object.entries(times)) {
        if (time !== null && time < fastestTime) {
          fastestTime = time;
          fastest = mode as TransportMode;
        }
      }

      grid.push({ lat: point.lat, lng: point.lng, times, fastest });
    }

    destGrids.set(dest.id, grid);
  }

  // Compute composite grid
  const compositeGrid: CompositeGridPoint[] = points.map((point, i) => {
    let weightedSum = 0;
    let freqSum = 0;
    const times: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, subway: null, bikeSubway: null };

    for (const dest of destinations) {
      const destGrid = destGrids.get(dest.id)!;
      const gp = destGrid[i];

      // Best time to this dest across all enabled modes
      let bestTime = Infinity;
      for (const [mode, t] of Object.entries(gp.times)) {
        if (t !== null && t < bestTime) bestTime = t;
        // Aggregate mode times (take the min across destinations for display)
        if (t !== null && (times[mode as TransportMode] === null || t < times[mode as TransportMode]!)) {
          times[mode as TransportMode] = t;
        }
      }

      if (bestTime < Infinity) {
        weightedSum += bestTime * dest.frequency;
        freqSum += dest.frequency;
      }
    }

    const compositeScore = freqSum > 0 ? Math.round((weightedSum / freqSum) * 10) / 10 : 999;

    let fastest: TransportMode = "walk";
    let fastestTime = Infinity;
    for (const [mode, t] of Object.entries(times)) {
      if (t !== null && t < fastestTime) { fastestTime = t; fastest = mode as TransportMode; }
    }

    return { ...point, times, fastest, compositeScore };
  });

  self.postMessage({
    compositeGrid,
    destGrids: Object.fromEntries(
      Array.from(destGrids.entries()).map(([id, grid]) => [id, grid])
    ),
  });
};
```

- [ ] **Step 2: Create worker interface**

`src/lib/grid.ts`:

```typescript
import type { BoundingBox, Destination, TransportMode, CompositeGridPoint, GridPoint, StationGraph, StationMatrix, CitiBikeStation } from "./types";

export interface GridResult {
  compositeGrid: CompositeGridPoint[];
  destGrids: Record<string, GridPoint[]>;
}

export function computeGrid(
  bounds: BoundingBox,
  destinations: Destination[],
  modes: TransportMode[],
  stationGraph: StationGraph,
  stationMatrix: StationMatrix,
  citiBikeStations: CitiBikeStation[]
): Promise<GridResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/grid-worker.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<GridResult>) => {
      resolve(e.data);
      worker.terminate();
    };

    worker.onerror = (e) => {
      reject(new Error(e.message));
      worker.terminate();
    };

    worker.postMessage({
      bounds,
      destinations,
      modes,
      stationGraph,
      stationMatrix,
      citiBikeStations,
    });
  });
}
```

- [ ] **Step 3: Verify worker loads**

The `new URL('../workers/grid-worker.ts', import.meta.url)` pattern works natively with webpack 5 in Next.js 15. No extra config needed. If the worker fails to load at runtime, add `worker-loader` as a fallback.

- [ ] **Step 4: Commit**

```bash
git add src/workers/grid-worker.ts src/lib/grid.ts src/lib/citibike.ts
git commit -m "feat: add web worker for grid computation with all transport modes"
```

---

## Chunk 4: Setup Survey Screen

### Task 10: Reusable UI Components

**Files:**
- Create: `src/components/ui/chip.tsx`
- Create: `src/components/ui/panel-section.tsx`

- [ ] **Step 1: Create chip component**

`src/components/ui/chip.tsx`:

```tsx
"use client";

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  wide?: boolean;
}

export function Chip({ label, active, onClick, wide }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`border-3 border-red font-display italic uppercase text-base px-3 py-2.5 cursor-pointer transition-colors text-center ${
        wide ? "col-span-2" : ""
      } ${
        active ? "bg-red text-pink" : "bg-transparent text-red hover:bg-red hover:text-pink"
      }`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Create panel section component**

`src/components/ui/panel-section.tsx`:

```tsx
interface PanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelSection({ title, children, className = "" }: PanelSectionProps) {
  return (
    <div className={`border-b-3 border-red p-6 flex flex-col gap-4 ${className}`}>
      {title && (
        <h2 className="font-display italic uppercase text-xl font-bold">{title}</h2>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create frequency bars component**

`src/components/setup/frequency-bars.tsx`:

```tsx
interface FrequencyBarsProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
}

export function FrequencyBars({ value, max = 7, onChange }: FrequencyBarsProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange?.(i + 1)}
          className={`w-3 h-6 border-2 border-red cursor-pointer ${
            i < value ? "bg-red" : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "feat: add reusable UI components (chip, panel-section, frequency-bars)"
```

---

### Task 11: Setup Page — Address Input + Mode Toggles

**Files:**
- Create: `src/components/setup/address-input.tsx`
- Create: `src/components/setup/mode-toggles.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create address input component**

`src/components/setup/address-input.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { geocodeAddress } from "@/lib/geocode";
import type { LatLng } from "@/lib/types";

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (address: string, location: LatLng | null) => void;
}

export function AddressInput({ label, value, onChange }: AddressInputProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleBlur = useCallback(async () => {
    if (!value.trim()) return;
    setIsGeocoding(true);
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const result = await geocodeAddress(value, token);
    setIsGeocoding(false);
    if (result) {
      onChange(result.displayName, result.location);
    }
  }, [value, onChange]);

  return (
    <div className="flex flex-col gap-2">
      <label className="font-bold uppercase text-xs tracking-widest">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, null)}
        onBlur={handleBlur}
        placeholder="Enter address..."
        className="bg-transparent border-3 border-red text-red font-body text-base p-3 outline-none placeholder:text-red/50 focus:bg-red focus:text-pink"
      />
      {isGeocoding && <span className="text-xs opacity-50">Geocoding...</span>}
    </div>
  );
}
```

- [ ] **Step 2: Create mode toggles component**

`src/components/setup/mode-toggles.tsx`:

```tsx
"use client";

import { Chip } from "@/components/ui/chip";
import type { TransportMode } from "@/lib/types";

const MODES: { key: TransportMode; label: string; wide?: boolean }[] = [
  { key: "subway", label: "Subway" },
  { key: "walk", label: "Walking" },
  { key: "car", label: "Car" },
  { key: "bike", label: "Citi Bike" },
  { key: "bikeSubway", label: "Bike + Subway", wide: true },
];

interface ModeTogglesProps {
  selected: TransportMode[];
  onChange: (modes: TransportMode[]) => void;
}

export function ModeToggles({ selected, onChange }: ModeTogglesProps) {
  const toggle = (mode: TransportMode) => {
    if (selected.includes(mode)) {
      if (selected.length > 1) onChange(selected.filter((m) => m !== mode));
    } else {
      onChange([...selected, mode]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((m) => (
        <Chip
          key={m.key}
          label={m.label}
          active={selected.includes(m.key)}
          onClick={() => toggle(m.key)}
          wide={m.wide}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire up the setup page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressInput } from "@/components/setup/address-input";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { DestinationList } from "@/components/setup/destination-list";
import { PanelSection } from "@/components/ui/panel-section";
import type { LatLng, TransportMode, Destination } from "@/lib/types";
import { DEFAULT_BOUNDS } from "@/lib/constants";

export default function SetupPage() {
  const router = useRouter();
  const [originAddress, setOriginAddress] = useState("");
  const [originLocation, setOriginLocation] = useState<LatLng | null>(null);
  const [modes, setModes] = useState<TransportMode[]>(["subway", "bike", "bikeSubway"]);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const canSubmit = originLocation && destinations.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // Store state in sessionStorage for results page
    sessionStorage.setItem("heatmap-setup", JSON.stringify({
      origin: originLocation,
      originAddress,
      modes,
      destinations,
      bounds: DEFAULT_BOUNDS,
    }));
    router.push("/results");
  };

  return (
    <div className="flex h-full border-3 border-red">
      <div className="w-full max-w-lg mx-auto flex flex-col overflow-y-auto">
        <PanelSection className="border-b-0 pb-8">
          <h1 className="text-5xl leading-none">
            Transit<br />Heatmap
          </h1>
        </PanelSection>

        <PanelSection title="Origin Address">
          <AddressInput
            label="Where are you starting from?"
            value={originAddress}
            onChange={(addr, loc) => {
              setOriginAddress(addr);
              if (loc) setOriginLocation(loc);
            }}
          />
          {originLocation && (
            <p className="text-xs opacity-50">
              {originLocation.lat.toFixed(4)}, {originLocation.lng.toFixed(4)}
            </p>
          )}
        </PanelSection>

        <PanelSection title="Transport Modes">
          <ModeToggles selected={modes} onChange={setModes} />
        </PanelSection>

        <PanelSection title="Pinned Destinations" className="flex-1">
          <DestinationList
            destinations={destinations}
            onChange={setDestinations}
            originLocation={originLocation}
            modes={modes}
          />
        </PanelSection>

        <div className="p-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full border-3 border-red font-display italic uppercase text-xl py-4 cursor-pointer transition-colors ${
              canSubmit
                ? "bg-red text-pink hover:bg-red/90"
                : "bg-transparent text-red/30 cursor-not-allowed"
            }`}
          >
            Show Heatmap
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/setup/ src/app/page.tsx
git commit -m "feat: build setup survey page with address input and mode toggles"
```

---

### Task 12: Destination List + Live Estimates

**Files:**
- Create: `src/components/setup/destination-list.tsx`
- Create: `src/components/setup/destination-card.tsx`

- [ ] **Step 1: Create destination card**

`src/components/setup/destination-card.tsx`:

```tsx
"use client";

import { FrequencyBars } from "./frequency-bars";
import type { Destination, TransportMode, LatLng } from "@/lib/types";
import { walkTime, bikeTime, driveTime } from "@/lib/travel-time";
import { computeSubwayTime, SubwayData } from "@/lib/subway";

interface DestinationCardProps {
  destination: Destination;
  originLocation: LatLng | null;
  modes: TransportMode[];
  subwayData: SubwayData | null;
  onFrequencyChange: (freq: number) => void;
  onRemove: () => void;
}

function formatTime(min: number): string {
  return `${Math.round(min)}m`;
}

export function DestinationCard({
  destination,
  originLocation,
  modes,
  subwayData,
  onFrequencyChange,
  onRemove,
}: DestinationCardProps) {
  // Compute live estimates
  const estimates: { mode: string; time: number }[] = [];
  if (originLocation) {
    if (modes.includes("walk")) estimates.push({ mode: "Walk", time: walkTime(originLocation, destination.location) });
    if (modes.includes("car")) estimates.push({ mode: "Car", time: driveTime(originLocation, destination.location) });
    if (modes.includes("bike")) estimates.push({ mode: "Bike", time: bikeTime(originLocation, destination.location) });
    if (modes.includes("subway") && subwayData) {
      const t = computeSubwayTime(subwayData, originLocation, destination.location);
      if (t !== null) estimates.push({ mode: "Subway", time: t });
    }
  }

  const bestTime = estimates.length > 0 ? Math.min(...estimates.map((e) => e.time)) : null;
  const weeklyMinutes = bestTime !== null ? Math.round(bestTime * destination.frequency * 2) : null;

  return (
    <div className="border-3 border-red p-3 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-display italic uppercase text-lg">{destination.name}</span>
          <p className="text-xs">{destination.address}</p>
        </div>
        <button onClick={onRemove} className="text-red/50 hover:text-red text-sm">✕</button>
      </div>

      {estimates.length > 0 && (
        <div className="text-xs flex flex-wrap gap-2">
          {estimates.map((e) => (
            <span key={e.mode} className={e.time === bestTime ? "font-bold" : "opacity-60"}>
              {e.mode} {formatTime(e.time)}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <FrequencyBars value={destination.frequency} onChange={onFrequencyChange} />
        {weeklyMinutes !== null && (
          <span className="text-xs font-bold">
            {destination.frequency}×/wk = {weeklyMinutes} min/wk
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create destination list**

`src/components/setup/destination-list.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { DestinationCard } from "./destination-card";
import { AddressInput } from "./address-input";
import { DEFAULT_FREQUENCY } from "@/lib/constants";
import { SubwayData } from "@/lib/subway";
import type { Destination, DestinationCategory, TransportMode, LatLng, StationGraph, StationMatrix } from "@/lib/types";

interface DestinationListProps {
  destinations: Destination[];
  onChange: (destinations: Destination[]) => void;
  originLocation: LatLng | null;
  modes: TransportMode[];
}

const CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "work", label: "Work" },
  { key: "social", label: "Social" },
  { key: "fitness", label: "Fitness" },
  { key: "errands", label: "Errands" },
  { key: "other", label: "Other" },
];

export function DestinationList({ destinations, onChange, originLocation, modes }: DestinationListProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLocation, setNewLocation] = useState<LatLng | null>(null);
  const [newCategory, setNewCategory] = useState<DestinationCategory>("work");
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);

  // Load subway data for live estimates
  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
        ]);
        const graph: StationGraph = await graphRes.json();
        const matrix: StationMatrix = await matrixRes.json();
        setSubwayData(new SubwayData(graph, matrix));
      } catch (e) {
        console.warn("Failed to load subway data for estimates", e);
      }
    }
    load();
  }, []);

  const addDestination = useCallback(() => {
    if (!newName || !newLocation) return;
    const dest: Destination = {
      id: crypto.randomUUID(),
      name: newName,
      address: newAddress,
      location: newLocation,
      category: newCategory,
      frequency: DEFAULT_FREQUENCY[newCategory],
    };
    onChange([...destinations, dest]);
    setNewName("");
    setNewAddress("");
    setNewLocation(null);
    setShowAdd(false);
  }, [newName, newAddress, newLocation, newCategory, destinations, onChange]);

  return (
    <div className="flex flex-col gap-3">
      {destinations.map((dest) => (
        <DestinationCard
          key={dest.id}
          destination={dest}
          originLocation={originLocation}
          modes={modes}
          subwayData={subwayData}
          onFrequencyChange={(freq) =>
            onChange(destinations.map((d) => (d.id === dest.id ? { ...d, frequency: freq } : d)))
          }
          onRemove={() => onChange(destinations.filter((d) => d.id !== dest.id))}
        />
      ))}

      {showAdd ? (
        <div className="border-3 border-red border-dashed p-3 flex flex-col gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (e.g. Work, Gym)"
            className="bg-transparent border-3 border-red text-red p-2 text-sm outline-none placeholder:text-red/50 focus:bg-red focus:text-pink"
          />
          <AddressInput
            label="Address"
            value={newAddress}
            onChange={(addr, loc) => {
              setNewAddress(addr);
              if (loc) setNewLocation(loc);
            }}
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setNewCategory(c.key)}
                className={`text-xs border-2 border-red px-2 py-1 uppercase font-bold ${
                  newCategory === c.key ? "bg-red text-pink" : ""
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={addDestination}
              disabled={!newName || !newLocation}
              className="flex-1 border-3 border-red bg-red text-pink font-display italic uppercase py-2 disabled:opacity-30"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="border-3 border-red px-4 py-2 font-display italic uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="border-3 border-red border-dashed p-3 text-center font-display italic uppercase cursor-pointer hover:bg-red hover:text-pink transition-colors"
        >
          + Add Place
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Builds successfully.

- [ ] **Step 4: Commit**

```bash
git add src/components/setup/
git commit -m "feat: add destination list with live travel time estimates"
```

---

## Chunk 5: Results Screen — Map + Sidebar

### Task 13: Map View with Heatmap Layer

**Files:**
- Create: `src/components/results/map-view.tsx`

- [ ] **Step 1: Create map component**

`src/components/results/map-view.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { CompositeGridPoint, GridPoint, LatLng, Destination, BoundingBox } from "@/lib/types";
import { reverseGeocode } from "@/lib/geocode";

interface MapViewProps {
  origin: LatLng;
  destinations: Destination[];
  grid: CompositeGridPoint[] | GridPoint[];
  bounds: BoundingBox;
  onBoundsChange?: (bounds: BoundingBox) => void;
}

// Color scale: green (fast) → yellow → red (slow)
function timeToColor(minutes: number): string {
  const t = Math.min(Math.max(minutes, 10), 60);
  const ratio = (t - 10) / 50; // 0 = 10min, 1 = 60min
  if (ratio < 0.5) {
    // green to yellow
    const r = Math.round(ratio * 2 * 255);
    return `rgba(${r}, 200, 50, 0.5)`;
  } else {
    // yellow to red
    const g = Math.round((1 - (ratio - 0.5) * 2) * 200);
    return `rgba(230, ${g}, 30, 0.5)`;
  }
}

export function MapView({ origin, destinations, grid, bounds, onBoundsChange }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const geocodeCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [origin.lng, origin.lat],
      zoom: 12,
    });

    map.current = m;

    m.on("load", () => {
      // Add heatmap source
      const features = grid.map((p) => {
        const score = "compositeScore" in p
          ? (p as CompositeGridPoint).compositeScore
          : Math.min(...Object.values(p.times).filter((t): t is number => t !== null)) || 60;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
          properties: {
            score,
            color: timeToColor(score as number),
            ...p.times,
            fastest: p.fastest,
          },
        };
      });

      m.addSource("heatmap-grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      m.addLayer({
        id: "heatmap-circles",
        type: "circle",
        source: "heatmap-grid",
        paint: {
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.6,
        },
      });

      // Origin marker
      new mapboxgl.Marker({ color: "#e21822" })
        .setLngLat([origin.lng, origin.lat])
        .addTo(m);

      // Destination markers
      for (const dest of destinations) {
        const el = document.createElement("div");
        el.innerHTML = `<div style="background:#e21822;color:#fcdde8;padding:2px 6px;font-size:11px;font-weight:bold;font-family:Arial Black;font-style:italic;text-transform:uppercase;white-space:nowrap">${dest.name}</div>`;
        new mapboxgl.Marker({ element: el })
          .setLngLat([dest.location.lng, dest.location.lat])
          .addTo(m);
      }

      // Hover tooltip
      m.on("mousemove", "heatmap-circles", async (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const coords = (e.features[0].geometry as any).coordinates;

        const cacheKey = `${coords[1].toFixed(4)},${coords[0].toFixed(4)}`;
        let address = geocodeCache.current.get(cacheKey);
        if (!address) {
          address = await reverseGeocode(
            { lat: coords[1], lng: coords[0] },
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
          );
          geocodeCache.current.set(cacheKey, address);
        }

        const modes = ["subway", "car", "bike", "bikeSubway", "walk"];
        const lines = modes
          .filter((m) => props[m] !== null && props[m] !== undefined)
          .map((m) => {
            const label = m === "bikeSubway" ? "Bike+Sub" : m.charAt(0).toUpperCase() + m.slice(1);
            const val = Math.round(props[m]);
            const isFastest = m === props.fastest;
            return isFastest ? `**${label}: ${val}m**` : `${label}: ${val}m`;
          })
          .join(" · ");

        setTooltipContent(`${address}\n${lines}`);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "heatmap-circles", () => {
        setTooltipContent(null);
      });
    });

    return () => m.remove();
  }, [origin, destinations, grid]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full" />
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
        <div className="text-xs uppercase font-bold tracking-widest mb-2">Travel Time</div>
        <div className="w-24 h-3" style={{
          background: "linear-gradient(90deg, rgb(0,200,50), rgb(255,200,50), rgb(230,30,30))"
        }} />
        <div className="flex justify-between text-xs mt-1">
          <span>10m</span><span>35m</span><span>60m+</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/results/map-view.tsx
git commit -m "feat: add Mapbox heatmap map view with tooltip and legend"
```

---

### Task 14: Results Sidebar + Monthly Footer

**Files:**
- Create: `src/components/results/sidebar.tsx`
- Create: `src/components/results/view-switch.tsx`
- Create: `src/components/results/monthly-footer.tsx`

- [ ] **Step 1: Create view switch**

`src/components/results/view-switch.tsx`:

```tsx
"use client";

interface ViewSwitchProps {
  view: "composite" | "perPin";
  onChange: (view: "composite" | "perPin") => void;
}

export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div className="flex border-3 border-red">
      <button
        onClick={() => onChange("composite")}
        className={`flex-1 font-display italic uppercase py-3 border-r-3 border-red ${
          view === "composite" ? "bg-red text-pink" : "text-red"
        }`}
      >
        Composite
      </button>
      <button
        onClick={() => onChange("perPin")}
        className={`flex-1 font-display italic uppercase py-3 ${
          view === "perPin" ? "bg-red text-pink" : "text-red"
        }`}
      >
        Per Pin
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create monthly footer**

`src/components/results/monthly-footer.tsx`:

```tsx
interface MonthlyFooterProps {
  totalHours: number;
  totalCost: number;
}

export function MonthlyFooter({ totalHours, totalCost }: MonthlyFooterProps) {
  return (
    <div className="mt-auto bg-red text-pink p-6">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs uppercase font-bold">Avg Mo. Transit Time</span>
      </div>
      <div className="flex justify-between items-end">
        <span className="text-4xl font-display italic">{Math.round(totalHours)} HR</span>
        <span className="text-xs text-right uppercase font-bold">Based on<br />frequency</span>
      </div>
      <div className="mt-4">
        <span className="text-xs uppercase font-bold">Est Mo. Cost</span>
        <div className="text-3xl font-display italic">${totalCost.toFixed(2)}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create results sidebar**

`src/components/results/sidebar.tsx`:

```tsx
"use client";

import { AddressInput } from "@/components/setup/address-input";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { DestinationCard } from "@/components/setup/destination-card";
import { PanelSection } from "@/components/ui/panel-section";
import { ViewSwitch } from "./view-switch";
import { MonthlyFooter } from "./monthly-footer";
import type { SetupState, TransportMode, Destination, LatLng } from "@/lib/types";
import { SubwayData } from "@/lib/subway";

interface SidebarProps {
  state: SetupState;
  subwayData: SubwayData | null;
  view: "composite" | "perPin";
  selectedDestId: string | null;
  totalHours: number;
  totalCost: number;
  onOriginChange: (address: string, location: LatLng | null) => void;
  onModesChange: (modes: TransportMode[]) => void;
  onDestinationsChange: (destinations: Destination[]) => void;
  onViewChange: (view: "composite" | "perPin") => void;
  onSelectedDestChange: (id: string | null) => void;
}

export function Sidebar({
  state, subwayData, view, selectedDestId,
  totalHours, totalCost,
  onOriginChange, onModesChange, onDestinationsChange,
  onViewChange, onSelectedDestChange,
}: SidebarProps) {
  return (
    <aside className="w-[400px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto scrollbar-hide">
      <PanelSection className="pb-8">
        <h1 className="text-4xl leading-none">Transit<br />Heatmap</h1>
        <AddressInput
          label="Origin"
          value={state.originAddress}
          onChange={onOriginChange}
        />
      </PanelSection>

      <PanelSection title="Transport Mode">
        <ModeToggles selected={state.modes} onChange={onModesChange} />
      </PanelSection>

      <PanelSection title="Pinned Destinations" className="flex-1">
        <div className="flex flex-col gap-3">
          {state.destinations.map((dest) => (
            <DestinationCard
              key={dest.id}
              destination={dest}
              originLocation={state.origin}
              modes={state.modes}
              subwayData={subwayData}
              onFrequencyChange={(freq) =>
                onDestinationsChange(
                  state.destinations.map((d) => (d.id === dest.id ? { ...d, frequency: freq } : d))
                )
              }
              onRemove={() => onDestinationsChange(state.destinations.filter((d) => d.id !== dest.id))}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Heatmap Mode" className="border-b-0">
        <ViewSwitch view={view} onChange={onViewChange} />
        {view === "perPin" && state.destinations.length > 0 && (
          <select
            value={selectedDestId ?? ""}
            onChange={(e) => onSelectedDestChange(e.target.value || null)}
            className="bg-transparent border-3 border-red p-2 text-red font-display italic uppercase"
          >
            {state.destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </PanelSection>

      <MonthlyFooter totalHours={totalHours} totalCost={totalCost} />
    </aside>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/results/
git commit -m "feat: add results sidebar with view switch and monthly footer"
```

---

### Task 15: Results Page — Wire Everything Together

**Files:**
- Modify: `src/app/results/page.tsx`

- [ ] **Step 1: Build the results page**

Replace `src/app/results/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/results/sidebar";
import { MapView } from "@/components/results/map-view";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { computeGrid, type GridResult } from "@/lib/grid";
import { computeMonthlyCost } from "@/lib/cost";
import { walkTime, bikeTime, driveTime } from "@/lib/travel-time";
import { computeSubwayTime } from "@/lib/subway";
import type { SetupState, TransportMode, Destination, LatLng, StationGraph, StationMatrix, CompositeGridPoint, GridPoint } from "@/lib/types";
import { WEEKS_PER_MONTH } from "@/lib/constants";

export default function ResultsPage() {
  const router = useRouter();
  const [state, setState] = useState<SetupState | null>(null);
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [gridResult, setGridResult] = useState<GridResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [view, setView] = useState<"composite" | "perPin">("composite");
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);

  // Load setup state from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("heatmap-setup");
    if (!raw) { router.push("/"); return; }
    const parsed: SetupState = JSON.parse(raw);
    setState(parsed);
    if (parsed.destinations.length > 0) {
      setSelectedDestId(parsed.destinations[0].id);
    }
  }, [router]);

  // Load subway + citi bike data
  useEffect(() => {
    async function load() {
      const [graphRes, matrixRes] = await Promise.all([
        fetch("/data/station-graph.json"),
        fetch("/data/station-matrix.json"),
      ]);
      const graph: StationGraph = await graphRes.json();
      const matrix: StationMatrix = await matrixRes.json();
      setStationGraph(graph);
      setStationMatrix(matrix);
      setSubwayData(new SubwayData(graph, matrix));

      const citi = await CitiBikeData.fetch();
      setCitiBikeData(citi);
    }
    load();
  }, []);

  // Compute grid when state or data changes
  useEffect(() => {
    if (!state?.origin || !stationGraph || !stationMatrix || !citiBikeData) return;
    if (state.destinations.length === 0) return;

    setComputing(true);
    computeGrid(
      state.bounds,
      state.destinations,
      state.modes,
      stationGraph,
      stationMatrix,
      citiBikeData.allStations
    ).then((result) => {
      setGridResult(result);
      setComputing(false);
    }).catch((err) => {
      console.error("Grid computation failed:", err);
      setComputing(false);
    });
  }, [state?.origin, state?.bounds, state?.destinations, state?.modes, stationGraph, stationMatrix, citiBikeData]);

  if (!state?.origin) {
    return <div className="flex h-full items-center justify-center border-3 border-red">
      <span className="font-display italic uppercase text-2xl animate-pulse">Loading...</span>
    </div>;
  }

  // Compute monthly stats from origin-to-destination point-to-point times
  const destModes: { destId: string; mode: TransportMode }[] = [];
  let totalMinutes = 0;

  for (const d of state.destinations) {
    // Compute point-to-point times from origin to this destination
    const times: Partial<Record<TransportMode, number>> = {};
    if (state.modes.includes("walk")) times.walk = walkTime(state.origin, d.location);
    if (state.modes.includes("car")) times.car = driveTime(state.origin, d.location);
    if (state.modes.includes("bike")) times.bike = bikeTime(state.origin, d.location);
    if (state.modes.includes("subway") && subwayData) {
      const t = computeSubwayTime(subwayData, state.origin, d.location);
      if (t !== null) times.subway = t;
    }

    // Find fastest mode for this destination
    let bestMode: TransportMode = "walk";
    let bestTime = Infinity;
    for (const [mode, time] of Object.entries(times)) {
      if (time !== undefined && time < bestTime) { bestTime = time; bestMode = mode as TransportMode; }
    }

    destModes.push({ destId: d.id, mode: bestMode });
    totalMinutes += bestTime * d.frequency * 2 * WEEKS_PER_MONTH;
  }

  const totalCost = computeMonthlyCost(state.destinations, destModes);
  const totalHours = totalMinutes / 60;

  // Pick which grid to display
  const displayGrid: CompositeGridPoint[] | GridPoint[] =
    view === "composite" || !selectedDestId
      ? gridResult?.compositeGrid ?? []
      : gridResult?.destGrids?.[selectedDestId] ?? [];

  return (
    <div className="flex h-full border-3 border-red">
      <Sidebar
        state={state}
        subwayData={subwayData}
        view={view}
        selectedDestId={selectedDestId}
        totalHours={totalHours}
        totalCost={totalCost}
        onOriginChange={(addr, loc) => {
          setState((s) => s ? { ...s, originAddress: addr, origin: loc ?? s.origin } : s);
        }}
        onModesChange={(modes) => setState((s) => s ? { ...s, modes } : s)}
        onDestinationsChange={(dests) => setState((s) => s ? { ...s, destinations: dests } : s)}
        onViewChange={setView}
        onSelectedDestChange={setSelectedDestId}
      />

      <main className="flex-1 relative">
        {computing && (
          <div className="absolute inset-0 bg-pink/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl animate-pulse">Computing...</span>
          </div>
        )}
        <MapView
          origin={state.origin}
          destinations={state.destinations}
          grid={displayGrid}
          bounds={state.bounds}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Expose CitiBikeData stations for the worker**

Add to `src/lib/citibike.ts` class body:

```typescript
get allStations(): CitiBikeStation[] {
  return this.stations;
}
```

Then update the results page to use `citiBikeData.allStations` instead of the `(citiBikeData as any).stations` cast.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Builds successfully.

- [ ] **Step 4: Commit**

```bash
git add src/app/results/page.tsx src/lib/citibike.ts
git commit -m "feat: wire up results page with grid computation and map view"
```

---

## Chunk 6: Polish, Deploy, Verify

### Task 16: GitHub Repo + Vercel Deploy

- [ ] **Step 1: Create GitHub repo**

```bash
cd /Users/andrew/Projects/nyc-transit-heatmap
gh repo create nyc-transit-heatmap --public --source=. --push
```

- [ ] **Step 2: Create Vercel project and deploy**

```bash
npx vercel --yes
npx vercel --prod
```

- [ ] **Step 3: Set Mapbox token env var**

Ask user for their Mapbox token, then:

```bash
echo 'TOKEN_VALUE' | npx vercel env add NEXT_PUBLIC_MAPBOX_TOKEN production
echo 'TOKEN_VALUE' | npx vercel env add NEXT_PUBLIC_MAPBOX_TOKEN preview
echo 'TOKEN_VALUE' | npx vercel env add NEXT_PUBLIC_MAPBOX_TOKEN development
```

Also add to `.env.local` for local dev.

- [ ] **Step 4: Redeploy with env vars**

```bash
npx vercel --prod
```

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A && git commit -m "chore: configure deployment" && git push
```

---

### Task 17: Manual Smoke Test

- [ ] **Step 1: Run local dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test setup flow**

1. Open `http://localhost:3000`
2. Enter an NYC address (e.g. "123 E 4th St")
3. Toggle transport modes
4. Add 2-3 destinations with addresses
5. Verify live time estimates appear
6. Click "Show Heatmap"

- [ ] **Step 3: Test results flow**

1. Verify map loads with heatmap circles
2. Verify origin and destination markers appear
3. Hover grid points — verify tooltip shows
4. Toggle modes — verify heatmap re-renders
5. Switch Composite ↔ Per Pin view
6. Check monthly footer shows numbers

- [ ] **Step 4: Record any bugs for follow-up**

Create issues in GitHub for any bugs found during smoke test.

---

### Task 18: Create CLAUDE.md + PROGRESS.md

- [ ] **Step 1: Create project CLAUDE.md**

`CLAUDE.md`:

```markdown
# NYC Transit Heatmap

## Tech Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Mapbox GL JS for map rendering
- Web Worker for grid computation
- MTA GTFS data (pre-parsed at build time)
- Citi Bike GBFS (fetched at runtime)

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm test` — run vitest tests
- `npm run build:subway` — rebuild subway graph from GTFS data

## Structure
- `src/app/page.tsx` — setup survey screen
- `src/app/results/page.tsx` — results map screen
- `src/lib/` — core logic (travel time, cost, subway, citibike, geocode)
- `src/workers/grid-worker.ts` — web worker for heatmap computation
- `scripts/build-subway-graph.ts` — GTFS → station graph build script
- `public/data/` — pre-built subway data (committed)

## Design
- Brutalist pink (#fcdde8) / red (#e21822) two-color system
- Arial Black italic uppercase for display text
- 3px solid borders, no border-radius
- Spec: `docs/superpowers/specs/2026-03-12-nyc-transit-heatmap-design.md`

## Environment
- Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`
- GTFS data in `data/gtfs/` (gitignored, run `scripts/download-gtfs.sh` to fetch)
```

- [ ] **Step 2: Create PROGRESS.md**

From template.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md PROGRESS.md
git commit -m "docs: add CLAUDE.md and PROGRESS.md"
git push
```
