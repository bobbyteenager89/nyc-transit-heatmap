# NYC Transit Heatmap — Design Spec

## Overview

A web app that visualizes travel time from a given NYC address as a color-coded heatmap on an interactive map. Users select transport modes (subway, car, Citi Bike, walking, bike+subway combo), pin important destinations with visit frequencies, and see a composite "best place to live" view. The novel feature is the bike+subway combo — showing travel times when you Citi Bike to/from subway stations instead of walking, something no existing maps app offers.

**Audience:** Personal tool for active apartment searching, architected for potential public release.

## Two-Screen Flow

### Screen 1: Setup (Survey)

A standalone screen — no map. Collects all inputs before showing results.

**Sections:**
1. **Origin Address** — text input with geocoding (Mapbox Geocoding API, free tier)
2. **Transport Modes** — toggle chips: Subway, Car/Uber, Citi Bike, Bike+Subway, Walking. Multi-select. At least one required.
3. **Pinned Destinations** — add places by name + address. Each gets:
   - Name (free text, e.g. "Work")
   - Address (geocoded)
   - Category (Work, Social, Fitness, Errands, Other) — auto-sets default frequency
   - Frequency override (visits/week slider or number input)
   - Displays: estimated time range (e.g. "25-35 min") and total minutes/week (e.g. "5x = 250 min/wk") — computed live as user adds pins
4. **Search Bounds** — optional, defaults to Manhattan + nearby Brooklyn/Queens. Can adjust on results screen.
5. **"Show Heatmap" button** — triggers computation and navigates to results.

**Default frequencies by category:**
- Work: 5x/week
- Social: 1x/week
- Fitness: 3x/week
- Errands: 2x/week
- Other: 1x/week

### Screen 2: Results (Map + Sidebar)

Full-bleed Mapbox GL JS map with heatmap overlay + left sidebar with controls.

**Map area:**
- Base: Mapbox street tiles (dark or light, matches pink/red theme)
- Heatmap overlay: green (close/fast) → yellow → red (far/slow), rendered as a grid of colored points or interpolated surface
- Origin marker (red square pin, matching design language)
- Destination pins with travel time labels
- Hover tooltip: per-mode time breakdown for any point
- Zoom/pan controls (brutalist square buttons from design)
- Draw-rectangle tool to adjust computation bounds

**Sidebar (mirrors setup, all editable):**
- Origin address (editable, recomputes on change)
- Transport mode toggles (instant re-render on toggle)
- Pinned destinations list with:
  - Name + address
  - Travel time per enabled mode to that specific destination (e.g. "Subway 25m · Car 18m · Bike 30m")
  - Total minutes/week based on frequency
  - Frequency bars (filled blocks from Variant design)
- View switch: Composite / Per Pin
  - Composite: weighted blend of all pins by frequency
  - Per Pin: dropdown to select one destination, heatmap shows time to just that place
- Monthly summary footer (inverted red background from design):
  - Total monthly transit hours
  - Estimated monthly cost

## Data Model & Computation

### Static Data (fetched once, cached)

- **MTA GTFS Static Feed**: `stops.txt` for station locations, `stop_times.txt` + `trips.txt` for station-to-station travel times. Parse for weekday ~8-9am service.
- **Citi Bike GBFS**: `station_information.json` for dock locations + capacity. Fetched once per session.

### Subway Station Graph (build-time artifact)

A build script parses GTFS into a pre-computed JSON graph:

```typescript
// Schema: station-graph.json
{
  stations: {
    [stationId: string]: {
      name: string;
      lat: number;
      lng: number;
      lines: string[];          // e.g. ["A", "C", "E"]
    }
  },
  edges: {
    [stationId: string]: {
      [neighborStationId: string]: number  // travel time in minutes (direct service, no transfer)
    }
  },
  transfers: {
    [stationId: string]: {
      [targetStationId: string]: number  // transfer walk time in minutes (from GTFS transfers.txt, default 5 min)
    }
  }
}
```

**Algorithm:** BFS/Dijkstra on this graph. Since the graph is small (~500 stations, ~1200 edges), we precompute a full station-to-station travel time matrix at build time (~250k pairs). This is ~2MB as JSON and enables O(1) lookup at runtime — no graph traversal needed per grid point. Each grid point just needs to find its nearest stations (spatial index) and add walking time.

**Build steps:**
1. Parse `stop_times.txt`: group by `trip_id`, compute time difference between consecutive stops → edge weights
2. Filter to weekday trips departing 7:30-9:30am, take median travel time per edge
3. Parse `transfers.txt` for official transfer times; default 5 min for same-station transfers not in file
4. Run Floyd-Warshall on the full graph → station-to-station matrix
5. Output `station-graph.json` (stations + edges) and `station-matrix.json` (precomputed all-pairs times)

### Travel Time Calculations (all use general averages, no live traffic)

**Walking:** 3 mph, Manhattan distance (grid-aligned).

**Biking / Citi Bike:** 9 mph, Manhattan distance + 2 min dock time each end. Available only if BOTH origin AND destination have a Citi Bike dock within 5-min walk (~0.25 mi). If either end lacks a dock, Citi Bike time is `null` for that point.

**Driving:** 12 mph Manhattan average, 20 mph outer boroughs. Manhattan distance.

**Subway:**
- Walk from grid point to nearest station(s) at 3 mph — check top 3 nearest by straight-line distance, max 1.5 miles (~30 min walk). If no station within 1.5 mi, subway time is `null` for that point.
- Look up station-to-station time from precomputed matrix
- Walk from destination station to destination at 3 mph
- For each of the 3 nearest origin stations, check routes to top 3 nearest destination stations → take minimum total time

**Bike + Subway combo:**

Computes two variants per grid point, stores the faster one as `bikeSubway`:

1. **Bike-in only:** Citi Bike from grid point → nearest Citi Bike dock within 0.5 mi of any subway station entrance (use station centroid, not individual entrances) → subway → walk from exit station to destination
2. **Bike-both-ends:** Same as above, but also Citi Bike from exit station dock → destination (if dock exists near exit station)

For each variant, compare to the equivalent subway-only time (walking both legs). If biking a leg saves < 20% OR < 5 minutes over walking that same leg, use walking for that leg instead. The single stored `bikeSubway` value is the best time across both variants after applying this threshold.

### Grid Computation

**Default bounding box:** `SW: (40.6950, -74.0200)` to `NE: (40.8100, -73.9100)` — covers Manhattan below 125th St, Williamsburg/Greenpoint, north Brooklyn to Park Slope, Long Island City/Astoria. User can adjust via draw-rectangle on results screen.

When user provides origin + destinations + modes:
1. Define grid within user's bounds (default above)
2. Grid resolution: ~200m spacing (~2 city blocks). For the default area, this is ~2,000-5,000 points.
3. For each grid point, compute travel time via each enabled mode. If a mode is unavailable for that point (e.g. no Citi Bike dock nearby), store `null`.
4. Store: `{ lat, lng, times: { subway: min|null, car: min, bike: min|null, bikeSubway: min|null, walk: min }, fastest: mode }` — `fastest` is the enabled mode with the lowest non-null time for that specific grid point.
5. Composite score per grid point: `sum(bestTime[pin] × freq[pin]) / sum(freq[pin])` where `bestTime[pin]` is the minimum travel time across all enabled modes from THIS grid point to THAT specific pin (recomputed per pin, since fastest mode varies by destination). This produces a single weighted-average minutes value per grid point, which the heatmap colors by.

Computation runs in a Web Worker. With precomputed station matrix, subway lookups are O(1) — each grid point just needs nearest-station lookup (spatial index using a simple sorted array by distance). Estimated computation time: < 3 seconds for 5,000 points.

**Draw-rectangle recomputation:** When the user draws a new rectangle on the results screen, the grid recomputes automatically. A loading indicator shows during recomputation (~1-3 seconds). No confirmation step needed. Min rectangle size: ~0.5 mi per side. Max: ~10 mi per side (roughly all of NYC). Rectangles outside NYC metro area are clamped to city bounds.

### Setup Screen Live Estimates

The setup screen shows time estimates per destination *before* full grid computation. These are simple origin-to-destination point-to-point calculations (not a grid):

- For each destination, compute travel time from origin via each enabled mode using the same formulas above
- Display as a range across modes: e.g. "25-40 min" (fastest mode to slowest mode)
- Display total minutes/week: best time × frequency × 2 (round trip)
- Recomputes instantly when origin, destinations, or modes change

### Hover Behavior on Heatmap

The heatmap renders as a grid of colored circles (Mapbox `circle` layer) at each grid point. Hover snaps to the nearest grid point (the circles themselves are hoverable). Tooltip shows:

- Nearest cross streets (computed from grid lat/lng using Mapbox reverse geocoding, cached per grid point after first hover — no re-fetch)
- Time by each enabled mode, e.g. "Subway: 25m · Bike+Subway: 20m · Car: 18m"
- Fastest mode highlighted
- If reverse geocode fails or is slow, fall back to "lat, lng" display

### Cost Estimation

Per-trip costs by mode:
- Subway: $2.90/ride
- Citi Bike: $17.99/month membership (unlimited 30-min rides) — flat monthly cost if any bike mode is enabled
- Car/Uber: $15 average per trip (rough NYC average for short rides)
- Walking: free

**Monthly cost formula:** For each pinned destination, use the fastest enabled mode's cost × frequency × 2 (round trips) × 4.3 (weeks/month). Cap subway cost at $132/month (unlimited MetroCard) if total subway trips exceed 45/month. Add Citi Bike membership flat fee ($17.99) if any trip uses bike or bikeSubway mode. Sum all per-destination costs for the monthly total.

## Visual Design

Guided by the Variant.com design output:

- **Palette:** Pink (`#fcdde8`) background, red (`#e21822`) for text, borders, and accents. Two-color system for UI chrome. The heatmap gradient (green → yellow → red) is the one exception — it uses multi-color to convey data, rendered as translucent circles over the map tiles.
- **Typography:** Arial Black / Impact italic uppercase for headings and display text. Helvetica Neue for body.
- **Borders:** 3px solid red on all interactive elements, panels, and containers.
- **Buttons/chips:** Transparent with red border by default, inverted (red bg, pink text) when active/hovered.
- **Layout:** Hard-edged, no border-radius. Brutalist editorial aesthetic.
- **Frequency indicator:** Filled/unfilled block bars (from Variant design).
- **Stats footer:** Inverted red background with pink text, large display numbers.
- **Map area:** Rendering order: Mapbox tiles (base) → faint red grid overlay → heatmap circles → pin markers/labels → watermark text. The heatmap circles are semi-transparent so the map shows through.
- **Mobile:** Desktop-only for V1. No mobile layout — the sidebar and map don't reflow. Functional on tablet landscape but not optimized.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Map:** Mapbox GL JS (free tier: 50k map loads/month)
- **Geocoding:** Mapbox Geocoding API (free tier)
- **Subway data:** MTA GTFS static feed, parsed at build time into a JSON station graph
- **Citi Bike data:** GBFS feed, fetched client-side on load
- **Computation:** Client-side JavaScript (Web Worker for grid computation)
- **Styling:** Tailwind CSS with custom theme matching Variant design
- **Hosting:** Vercel
- **State:** React state (no external state management needed for V1)

## What's NOT in V1

- Location recommender ("best neighborhoods to live")
- User accounts or saved sessions (use URL params or localStorage)
- Real-time traffic or live transit delays
- Mobile-optimized layout (desktop-first, responsive later)
- E-bike speed differentiation
- Multiple origin comparison
