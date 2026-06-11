# Pride-Share Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every reach computation produces brag-worthy "pride stats" (population, restaurants, coffee, bars, parks, subway lines within reach), shown in the sidebar and baked into the shareable OG card, with snap-then-fuzz location anonymization and Knicks variant-C brand chrome.

**Architecture:** Build-time scripts aggregate Census population + OSM POIs into compact **res-9-keyed** JSON tables in `public/data/`. At runtime everything is **client-side** (mirrors `ReachStats`): a `useMemo` derives the reachable res-9 parent set from the res-10 cells and sums/unions the tables — reacts to the time slider instantly, no worker changes. Stats travel in the share URL so the stateless edge OG route just renders them.

**Tech Stack:** Next.js 16, TypeScript, h3-js (`cellToParent`, `latLngToCell`, `cellToLatLng`), Census Centers-of-Population CSV (no key), Overpass API, Vitest.

---

## File Structure

- **Create** `scripts/build-pride-data.ts` — fetches Census + Overpass, writes the three tables. One responsibility: data baking.
- **Create** `public/data/pride-population.json` — `{ [res9h3]: number }` (generated, committed).
- **Create** `public/data/pride-pois.json` — `{ [res9h3]: [restaurants, cafes, bars] }` (generated, committed).
- **Create** `public/data/pride-parks.json` — `{ [res9h3]: number[] }` parkId lists (generated, committed).
- **Create** `src/lib/pride-stats.ts` — pure functions: `computePrideStats(cells, activeModes, maxMinutes, tables, stationLineIndex)`. Tested.
- **Create** `src/lib/pride-data.ts` — loaders + `loadPrideTables()` (fetch+parse the 3 JSONs) + `buildStationLineIndex(stationGraph)`.
- **Create** `src/hooks/use-pride-tables.ts` — idle-time loader hook returning tables once ready.
- **Create** `src/components/isochrone/pride-stats.tsx` — sidebar UI. Tested via the lib; component is presentational.
- **Modify** `src/components/explore/explore-content.tsx` — render `<PrideStats>`, snap-then-fuzz share URL, pass stat params.
- **Modify** `src/app/api/og/route.tsx` — accept `pop/rest/cafe/bar/park/lines` params, render stat panel + line bullets + visual fuzz, apply Knicks chrome.
- **Modify** `src/lib/subway-lines.ts` (create) — MTA line → official bullet color map (shared by sidebar + OG).
- **Modify** `package.json` — add `"build:pride"` script.
- **Modify** site chrome wordmark (locate in `explore-content.tsx`) — Knicks variant-C split-bar mark.

---

## Task 1: Build-time data pipeline

**Files:**
- Create: `scripts/build-pride-data.ts`
- Modify: `package.json` (scripts)
- Output: `public/data/pride-{population,pois,parks}.json`

Census centroid file and Overpass are both **verified reachable** (Overpass needs a `User-Agent` header; build runs outside any sandbox). NYC counties: Bronx `005`, Kings `047`, New York `061`, Queens `081`, Richmond `085`. NYC bbox for Overpass: `40.49,-74.27,40.92,-73.68`.

- [ ] **Step 1: Write the script**

```ts
// scripts/build-pride-data.ts
import { writeFileSync } from "fs";
import { resolve } from "path";
import { latLngToCell } from "h3-js";

const OUT = resolve(__dirname, "../public/data");
const PRIDE_RES = 9;
const NYC_COUNTIES = new Set(["005", "047", "061", "081", "085"]);
const UA = { "User-Agent": "nyc-transit-heatmap-build/1.0" };
const CENPOP_URL =
  "https://www2.census.gov/geo/docs/reference/cenpop2020/blkgrp/CenPop2020_Mean_BG.txt";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const BBOX = "40.49,-74.27,40.92,-73.68";

async function buildPopulation(): Promise<Record<string, number>> {
  const res = await fetch(CENPOP_URL, { headers: UA });
  if (!res.ok) throw new Error(`CenPop ${res.status}`);
  const text = await res.text();
  const lines = text.split("\n").slice(1);
  const pop: Record<string, number> = {};
  for (const line of lines) {
    const [state, county, , , population, lat, lng] = line.split(",");
    if (state !== "36" || !NYC_COUNTIES.has(county)) continue;
    const p = Number(population);
    if (!p) continue;
    const cell = latLngToCell(Number(lat), Number(lng), PRIDE_RES);
    pop[cell] = (pop[cell] ?? 0) + p;
  }
  return pop;
}

async function overpass(query: string): Promise<any> {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return res.json();
}

function elCenter(el: any): { lat: number; lng: number } | null {
  if (typeof el.lat === "number") return { lat: el.lat, lng: el.lng };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

async function buildPois(): Promise<Record<string, [number, number, number]>> {
  // index 0 restaurants, 1 cafes, 2 bars/pubs/clubs
  const groups: [string, number][] = [
    ['node["amenity"="restaurant"]', 0],
    ['node["amenity"="cafe"]', 1],
    ['node["amenity"~"^(bar|pub|nightclub)$"]', 2],
  ];
  const out: Record<string, [number, number, number]> = {};
  for (const [selector, idx] of groups) {
    const data = await overpass(`[out:json][timeout:60];${selector}(${BBOX});out;`);
    for (const el of data.elements ?? []) {
      const c = elCenter(el);
      if (!c) continue;
      const cell = latLngToCell(c.lat, c.lng, PRIDE_RES);
      const t = (out[cell] ??= [0, 0, 0]);
      t[idx]++;
    }
  }
  return out;
}

async function buildParks(): Promise<Record<string, number[]>> {
  const data = await overpass(
    `[out:json][timeout:90];(way["leisure"="park"](${BBOX});relation["leisure"="park"](${BBOX}););out center;`
  );
  const out: Record<string, number[]> = {};
  let pid = 0;
  for (const el of data.elements ?? []) {
    const c = elCenter(el);
    if (!c) continue;
    const id = pid++;
    const cell = latLngToCell(c.lat, c.lng, PRIDE_RES);
    (out[cell] ??= []).push(id);
  }
  return out;
}

async function main() {
  console.log("Building population...");
  const population = await buildPopulation();
  console.log(`  ${Object.keys(population).length} res-9 cells, ${Object.values(population).reduce((a, b) => a + b, 0)} people`);
  console.log("Building POIs...");
  const pois = await buildPois();
  console.log("Building parks...");
  const parks = await buildParks();
  writeFileSync(resolve(OUT, "pride-population.json"), JSON.stringify(population));
  writeFileSync(resolve(OUT, "pride-pois.json"), JSON.stringify(pois));
  writeFileSync(resolve(OUT, "pride-parks.json"), JSON.stringify(parks));
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

In `package.json` `"scripts"`, add: `"build:pride": "tsx scripts/build-pride-data.ts"` (match the runner `build:subway` uses — check it; if it uses `ts-node`/`tsx`, mirror it).

- [ ] **Step 3: Run it**

Run: `npm run build:pride`
Expected: prints ~6807 BG rows → ~8.8M people, writes 3 files to `public/data/`. Population uses centroid binning (BG → one res-9 cell). Note parks use `out center;` so ways/relations get a `.center`.

- [ ] **Step 4: Sanity-check outputs**

Run: `node -e "const p=require('./public/data/pride-population.json'); const v=Object.values(p); console.log('cells',v.length,'pop',v.reduce((a,b)=>a+b,0))"`
Expected: pop ≈ 8.8M. Repeat for pois (3-tuples) and parks (id arrays).

- [ ] **Step 5: Commit** (generated data + script together)

```bash
git add scripts/build-pride-data.ts package.json public/data/pride-population.json public/data/pride-pois.json public/data/pride-parks.json
git commit -m "feat(pride): build-time census+OSM pride-stat tables (res-9)"
```

---

## Task 2: Subway-line bullet map (shared)

**Files:**
- Create: `src/lib/subway-lines.ts`

- [ ] **Step 1: Write the line-color map**

```ts
// src/lib/subway-lines.ts
// Official MTA line bullet colors. Keys are route_ids as they appear in
// station-graph.json `lines[]`.
export const LINE_COLORS: Record<string, string> = {
  A: "#0039A6", C: "#0039A6", E: "#0039A6",
  B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
  G: "#6CBE45",
  J: "#996633", Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  S: "#808183", GS: "#808183", FS: "#808183",
};
// MTA bullet sort order
const ORDER = "ABCDEFGJLMNQRWZ1234567S".split("");
export function sortLines(lines: string[]): string[] {
  const rank = (l: string) => { const i = ORDER.indexOf(l[0]); return i === -1 ? 99 : i; };
  return [...new Set(lines)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
export function lineTextColor(line: string): string {
  return line.startsWith("N") || line.startsWith("Q") || line.startsWith("R") || line.startsWith("W") ? "#000" : "#fff";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/subway-lines.ts
git commit -m "feat(pride): MTA line bullet color map"
```

---

## Task 3: Pride-stats computation lib (TDD)

**Files:**
- Create: `src/lib/pride-stats.ts`
- Test: `src/lib/pride-stats.test.ts`

`PrideTables` and the station-line index are passed in (loaded separately). "Reachable" = union over active modes within `maxMinutes` (same predicate as `unionReach`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pride-stats.test.ts
import { describe, it, expect } from "vitest";
import { computePrideStats, type PrideTables } from "./pride-stats";
import { cellToParent, cellToLatLng, latLngToCell } from "h3-js";
import type { HexCell, TransportMode } from "./types";

function cellAt(h3Index: string, subwayMin: number | null): HexCell {
  const [lat, lng] = cellToLatLng(h3Index);
  return {
    h3Index, center: { lat, lng }, boundary: [],
    times: { walk: null, car: null, bike: null, ownbike: null, subway: subwayMin, bus: null, ferry: null },
    fastest: "subway", compositeScore: 0, destBreakdown: {},
  };
}

describe("computePrideStats", () => {
  it("sums population + pois and unions parks over reachable res-9 parents", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const res9 = cellToParent(res10, 9);
    const tables: PrideTables = {
      population: { [res9]: 5000 },
      pois: { [res9]: [40, 8, 6] },
      parks: { [res9]: [1, 2] },
    };
    const cells = [cellAt(res10, 10)]; // reachable by subway in 10 min
    const stats = computePrideStats(cells, ["subway"], 30, tables, new Map());
    expect(stats.population).toBe(5000);
    expect(stats.restaurants).toBe(40);
    expect(stats.cafes).toBe(8);
    expect(stats.bars).toBe(6);
    expect(stats.parks).toBe(2);
  });

  it("excludes cells beyond maxMinutes", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const res9 = cellToParent(res10, 9);
    const tables: PrideTables = { population: { [res9]: 5000 }, pois: {}, parks: {} };
    const cells = [cellAt(res10, 45)]; // 45 > 30
    expect(computePrideStats(cells, ["subway"], 30, tables, new Map()).population).toBe(0);
  });

  it("dedupes res-9 parents so shared cells count once", () => {
    const a = latLngToCell(40.73, -73.99, 10);
    const res9 = cellToParent(a, 9);
    const tables: PrideTables = { population: { [res9]: 5000 }, pois: {}, parks: {} };
    const cells = [cellAt(a, 5), cellAt(a, 6)]; // same cell twice
    expect(computePrideStats(cells, ["subway"], 30, tables, new Map()).population).toBe(5000);
  });

  it("collects distinct subway lines from reachable stations", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const stationLineIndex = new Map<string, string[]>([[res10, ["F", "M", "F"]]]);
    const tables: PrideTables = { population: {}, pois: {}, parks: {} };
    const stats = computePrideStats([cellAt(res10, 12)], ["subway"], 30, tables, stationLineIndex);
    expect(stats.lines).toEqual(["F", "M"]);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — Run: `npm test -- pride-stats` → fails (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/pride-stats.ts
import { cellToParent } from "h3-js";
import type { HexCell, TransportMode } from "./types";
import { sortLines } from "./subway-lines";

const PRIDE_RES = 9;
const STATION_RES = 10;

export interface PrideTables {
  population: Record<string, number>;
  pois: Record<string, [number, number, number]>;
  parks: Record<string, number[]>;
}

export interface PrideStats {
  population: number;
  restaurants: number;
  cafes: number;
  bars: number;
  parks: number;
  lines: string[];
}

function isReachable(t: number | null | undefined, max: number): boolean {
  return t !== null && t !== undefined && t <= max;
}

/** stationLineIndex: res-10 h3 of a station → its lines[]. */
export function computePrideStats(
  cells: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number,
  tables: PrideTables,
  stationLineIndex: Map<string, string[]>,
): PrideStats {
  const reachableParents = new Set<string>();
  const subwayReachableRes10 = new Set<string>();
  const subwayActive = activeModes.includes("subway");

  for (const c of cells) {
    let reachable = false;
    for (const m of activeModes) {
      if (isReachable(c.times[m], maxMinutes)) { reachable = true; break; }
    }
    if (!reachable) continue;
    reachableParents.add(cellToParent(c.h3Index, PRIDE_RES));
    if (subwayActive && isReachable(c.times.subway, maxMinutes)) {
      subwayReachableRes10.add(c.h3Index);
    }
  }

  let population = 0, restaurants = 0, cafes = 0, bars = 0;
  const parkIds = new Set<number>();
  for (const p of reachableParents) {
    population += tables.population[p] ?? 0;
    const poi = tables.pois[p];
    if (poi) { restaurants += poi[0]; cafes += poi[1]; bars += poi[2]; }
    const pk = tables.parks[p];
    if (pk) for (const id of pk) parkIds.add(id);
  }

  const lineSet: string[] = [];
  if (subwayActive) {
    for (const h3 of subwayReachableRes10) {
      const ls = stationLineIndex.get(h3);
      if (ls) lineSet.push(...ls);
    }
  }

  return {
    population, restaurants, cafes, bars,
    parks: parkIds.size,
    lines: sortLines(lineSet),
  };
}
```

Note: `STATION_RES` import kept for clarity; the station index is built at res-10 in Task 4 to match `cell.h3Index` resolution.

- [ ] **Step 4: Run, expect PASS** — Run: `npm test -- pride-stats`

- [ ] **Step 5: Commit**

```bash
git add src/lib/pride-stats.ts src/lib/pride-stats.test.ts
git commit -m "feat(pride): client-side pride-stats computation (res-9 join)"
```

---

## Task 4: Table + station-index loaders

**Files:**
- Create: `src/lib/pride-data.ts`
- Create: `src/hooks/use-pride-tables.ts`

- [ ] **Step 1: Loaders**

```ts
// src/lib/pride-data.ts
import { latLngToCell } from "h3-js";
import type { StationGraph } from "./types";
import type { PrideTables } from "./pride-stats";

export async function loadPrideTables(): Promise<PrideTables> {
  const [population, pois, parks] = await Promise.all([
    fetch("/data/pride-population.json").then((r) => r.json()),
    fetch("/data/pride-pois.json").then((r) => r.json()),
    fetch("/data/pride-parks.json").then((r) => r.json()),
  ]);
  return { population, pois, parks };
}

/** Map each station's res-10 cell → its lines, for line-reach lookups. */
export function buildStationLineIndex(graph: StationGraph): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const s of Object.values(graph.stations)) {
    const cell = latLngToCell(s.lat, s.lng, 10);
    const existing = idx.get(cell);
    if (existing) existing.push(...s.lines);
    else idx.set(cell, [...s.lines]);
  }
  return idx;
}
```

- [ ] **Step 2: Idle-time hook**

```ts
// src/hooks/use-pride-tables.ts
import { useEffect, useState } from "react";
import { loadPrideTables } from "@/lib/pride-data";
import type { PrideTables } from "@/lib/pride-stats";

export function usePrideTables(): PrideTables | null {
  const [tables, setTables] = useState<PrideTables | null>(null);
  useEffect(() => {
    let cancelled = false;
    const run = () => loadPrideTables().then((t) => { if (!cancelled) setTables(t); }).catch(() => {});
    const ric = (window as any).requestIdleCallback;
    const id = ric ? ric(run) : setTimeout(run, 1500);
    return () => {
      cancelled = true;
      const cic = (window as any).cancelIdleCallback;
      if (ric && cic) cic(id); else clearTimeout(id);
    };
  }, []);
  return tables;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/pride-data.ts src/hooks/use-pride-tables.ts
git commit -m "feat(pride): table + station-line-index loaders"
```

---

## Task 5: PrideStats sidebar component

**Files:**
- Create: `src/components/isochrone/pride-stats.tsx`
- Reference aesthetic: `src/components/isochrone/reach-stats.tsx` (JetBrains Mono, hairline borders, tabular-nums).

- [ ] **Step 1: Component**

Stat tints: people `#39ff14`, restaurants `#ffbe0b`, coffee `#06d6a0`, bars `#f97316`, parks `#00b4d8`. Use `Intl.NumberFormat` for population (`2,400,000` → format millions as `2.4M` when ≥ 1e6). Render lines as bullets via `LINE_COLORS`/`lineTextColor`. Component returns `null` when `stats` is null or `population===0 && lines.length===0`.

```tsx
// src/components/isochrone/pride-stats.tsx
"use client";
import type { PrideStats } from "@/lib/pride-stats";
import { LINE_COLORS, lineTextColor } from "@/lib/subway-lines";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return new Intl.NumberFormat("en-US").format(n);
}
const ROWS: [keyof PrideStats, string, string][] = [
  ["population", "PEOPLE", "#39ff14"],
  ["restaurants", "RESTAURANTS", "#ffbe0b"],
  ["cafes", "COFFEE SHOPS", "#06d6a0"],
  ["bars", "BARS & CLUBS", "#f97316"],
  ["parks", "PARKS", "#00b4d8"],
];

export function PrideStats({ stats, maxMinutes }: { stats: PrideStats | null; maxMinutes: number }) {
  if (!stats || (stats.population === 0 && stats.lines.length === 0)) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
        Within reach · {maxMinutes} min
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
        {ROWS.map(([key, label, color]) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "var(--font-data)", fontSize: 22, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {fmt(stats[key] as number)}
            </span>
            <span style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>{label}</span>
          </div>
        ))}
      </div>
      {stats.lines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>
            {stats.lines.length} SUBWAY LINES
          </span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {stats.lines.map((l) => (
              <span key={l} style={{ width: 18, height: 18, borderRadius: "50%", background: LINE_COLORS[l] ?? "#666", color: lineTextColor(l), display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-data)", fontSize: 11 }}>{l}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/isochrone/pride-stats.tsx
git commit -m "feat(pride): PrideStats sidebar component"
```

---

## Task 6: Wire into explore-content + snap-then-fuzz share URL

**Files:**
- Modify: `src/components/explore/explore-content.tsx`

Read the file first; locate (a) where `cells`, `activeModes`, `maxMinutes`, and the station graph live, (b) the `ReachStats` render site, (c) the share-URL builder (where `lat/lng/t/m/address` params are set).

- [ ] **Step 1: Compute + render stats**

- `const prideTables = usePrideTables();`
- Build `stationLineIndex` once via `useMemo(() => stationGraph ? buildStationLineIndex(stationGraph) : new Map(), [stationGraph])`.
- `const prideStats = useMemo(() => prideTables ? computePrideStats(cells, activeModes, maxMinutes, prideTables, stationLineIndex) : null, [cells, activeModes, maxMinutes, prideTables, stationLineIndex]);`
- Render `<PrideStats stats={prideStats} maxMinutes={maxMinutes} />` directly under `<ReachStats>`.

- [ ] **Step 2: Snap-then-fuzz the share URL**

When building the share URL (and the `/api/og` URL), snap the origin to its res-8 centroid and append stat params:

```ts
import { latLngToCell, cellToLatLng } from "h3-js";
// snapped origin (res-8 ≈ 460m, reproducible, no exact home in link)
const snap = cellToLatLng(latLngToCell(origin.lat, origin.lng, 8)); // [lat, lng]
params.set("lat", snap[0].toFixed(5));
params.set("lng", snap[1].toFixed(5));
if (prideStats) {
  params.set("pop", String(prideStats.population));
  params.set("rest", String(prideStats.restaurants));
  params.set("cafe", String(prideStats.cafes));
  params.set("bar", String(prideStats.bars));
  params.set("park", String(prideStats.parks));
  if (prideStats.lines.length) params.set("lines", prideStats.lines.join(","));
}
```

The sharer's own view keeps computing from the exact pin; the card shows the sharer's stat numbers (above). The recipient recomputes from the snapped origin (reproducible).

- [ ] **Step 3: Build check + manual verify**

Run: `npm run build` (expect pass). Then via preview tools: drop a pin, confirm PrideStats renders, slider updates the numbers, and the share URL contains `pop/rest/.../lines` with a snapped (rounded) lat/lng.

- [ ] **Step 4: Commit**

```bash
git add src/components/explore/explore-content.tsx
git commit -m "feat(pride): render PrideStats + snap-then-fuzz share URL with stat params"
```

---

## Task 7: Bake stats into the OG card (+ visual fuzz)

**Files:**
- Modify: `src/app/api/og/route.tsx`

- [ ] **Step 1: Parse new params**

After the existing param parsing, read and clamp:

```ts
const intParam = (k: string) => Math.max(0, Math.min(99_999_999, Number(searchParams.get(k)) || 0));
const pop = intParam("pop"), rest = intParam("rest"), cafe = intParam("cafe"), bar = intParam("bar"), park = intParam("park");
const lines = (searchParams.get("lines") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 16);
const hasStats = pop > 0 || rest > 0 || lines.length > 0;
```

- [ ] **Step 2: Visual-only fuzz of the pin** (no `Math.random` at edge — deterministic hash):

```ts
function hashFuzz(lat: number, lng: number): [number, number] {
  const h = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  const f = h - Math.floor(h);
  const ang = f * Math.PI * 2;
  const r = 0.0009; // ≈ 100m
  return [Math.cos(ang) * r, Math.sin(ang) * r * 0.78];
}
const [dLat, dLng] = hashFuzz(safeLat, safeLng);
const pinLng = safeLng + dLng, pinLat = safeLat + dLat;
```

Use `pinLat/pinLng` in the Mapbox `pin-l` marker URL instead of `safeLat/safeLng`.

- [ ] **Step 3: Render the stat panel** — replace/extend the bottom info card. Inline the `LINE_COLORS` map (edge route can't share the lib reliably across the runtime boundary — duplicate the small map locally with a comment pointing at `src/lib/subway-lines.ts`). 3-col grid of `{pop→PEOPLE, rest→RESTAURANTS, cafe→COFFEE, bar→BARS, park→PARKS, lines.length→LINES}` with the stat tints, then a row of line bullets. Mirror the approved mockup. When `!hasStats`, keep the existing address/time card (back-compat for old links).

- [ ] **Step 4: Verify** — Run `npm run build`, then hit `/api/og?lat=40.73&lng=-73.99&t=30&m=subway,walk,bike&pop=2400000&rest=812&cafe=140&bar=63&park=18&lines=A,C,E,F,N,4,6` in preview; screenshot.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/og/route.tsx
git commit -m "feat(pride): bake pride stats + line bullets into OG card, visual-fuzz pin"
```

---

## Task 8: Knicks variant-C brand chrome

**Files:**
- Modify: site wordmark in `src/components/explore/explore-content.tsx`
- Modify: `src/app/api/og/route.tsx` wordmark

Variant C: a vertical split bar (top half `#006BB6`, bottom half `#F58426`) immediately left of the wordmark; `NYC` in `#F58426`. Time ramp and all data colors untouched.

- [ ] **Step 1: Site chrome** — locate the "Isochrone NYC" wordmark; add the split-bar element (5×26px, `linear-gradient(#006BB6 50%, #F58426 50%)`, `border-radius: 2px`) before it; set `NYC` color to `#F58426`.

- [ ] **Step 2: OG wordmark** — same treatment in `route.tsx` (the NYC span currently `#22d3ee` → `#F58426`; add the split bar as a flex element).

- [ ] **Step 3: Verify** — preview screenshot of header + OG card; confirm ramp untouched.

- [ ] **Step 4: Commit**

```bash
git add src/components/explore/explore-content.tsx src/app/api/og/route.tsx
git commit -m "feat(brand): Knicks variant-C split-bar chrome (time ramp untouched)"
```

---

## Task 9: Verify, preflight, smoke-test

- [ ] **Step 1:** `npm run build && npm test` — all green.
- [ ] **Step 2:** Preview: drop pin → stats render, slider reactive, share URL correct, OG card renders stats; mobile width 375px sane.
- [ ] **Step 3:** `/preflight` + `/smoke-test`.
- [ ] **Step 4:** Finish branch via `superpowers:finishing-a-development-branch` (merge/PR).

---

## Self-Review

- **Spec coverage:** population/restaurants/coffee ✓ (T1,3,5); bars ✓; parks distinct-count ✓; subway lines listed ✓ (T2,3,4); snap-then-fuzz ✓ (T6 snap + T7 visual fuzz); OG stats via URL params ✓ (T6,7); Knicks variant C ✓ (T8); client-side + res-9 refinement ✓ (T3). No-key Census source ✓ (T1).
- **Placeholder scan:** T7 step 3 describes the panel rather than full JSX — intentional (mirror the approved mockup + T5 structure); all logic-bearing steps have code.
- **Type consistency:** `PrideTables`/`PrideStats` defined in T3, imported in T4/T5/T6; `computePrideStats` signature stable across T3/T6; `LINE_COLORS`/`lineTextColor`/`sortLines` defined T2, used T3/T5/T7; station index keyed at res-10 in both T3 test and T4 builder.
