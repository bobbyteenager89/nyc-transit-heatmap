/**
 * Pre-compute neighborhood rankings at build time.
 * Reads station-graph.json + station-matrix.json, scores all neighborhoods,
 * and writes rankings.json to public/data/.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Inline types to avoid importing from src (which uses path aliases)
interface StationGraph {
  stations: Record<string, { lat: number; lng: number; lines: string[] }>;
}
interface StationMatrix {
  stationIds: string[];
  times: number[][];
}

// Must match src/lib/constants.ts
const WALK_SPEED = 3; // mph
const SUBWAY_MAX_WALK_MI = 1.5;

// Must match src/lib/neighborhoods.ts
const NYC_NEIGHBORHOODS = [
  { name: "Williamsburg", borough: "Brooklyn", center: { lat: 40.7081, lng: -73.9571 } },
  { name: "East Village", borough: "Manhattan", center: { lat: 40.7265, lng: -73.9815 } },
  { name: "Upper West Side", borough: "Manhattan", center: { lat: 40.7870, lng: -73.9754 } },
  { name: "Park Slope", borough: "Brooklyn", center: { lat: 40.6710, lng: -73.9777 } },
  { name: "Astoria", borough: "Queens", center: { lat: 40.7723, lng: -73.9301 } },
  { name: "Chelsea", borough: "Manhattan", center: { lat: 40.7465, lng: -74.0014 } },
  { name: "Lower East Side", borough: "Manhattan", center: { lat: 40.7150, lng: -73.9843 } },
  { name: "Greenpoint", borough: "Brooklyn", center: { lat: 40.7274, lng: -73.9510 } },
  { name: "Harlem", borough: "Manhattan", center: { lat: 40.8116, lng: -73.9465 } },
  { name: "DUMBO", borough: "Brooklyn", center: { lat: 40.7033, lng: -73.9890 } },
  { name: "West Village", borough: "Manhattan", center: { lat: 40.7336, lng: -74.0027 } },
  { name: "Bushwick", borough: "Brooklyn", center: { lat: 40.6942, lng: -73.9215 } },
  { name: "Long Island City", borough: "Queens", center: { lat: 40.7440, lng: -73.9560 } },
  { name: "SoHo", borough: "Manhattan", center: { lat: 40.7233, lng: -73.9985 } },
  { name: "Financial District", borough: "Manhattan", center: { lat: 40.7075, lng: -74.0089 } },
  { name: "Prospect Heights", borough: "Brooklyn", center: { lat: 40.6775, lng: -73.9692 } },
  { name: "Midtown", borough: "Manhattan", center: { lat: 40.7549, lng: -73.9840 } },
  { name: "Bed-Stuy", borough: "Brooklyn", center: { lat: 40.6872, lng: -73.9418 } },
  { name: "Crown Heights", borough: "Brooklyn", center: { lat: 40.6694, lng: -73.9422 } },
  { name: "Murray Hill", borough: "Manhattan", center: { lat: 40.7488, lng: -73.9757 } },
  { name: "Cobble Hill", borough: "Brooklyn", center: { lat: 40.6860, lng: -73.9969 } },
  { name: "Hell's Kitchen", borough: "Manhattan", center: { lat: 40.7638, lng: -73.9918 } },
  { name: "Tribeca", borough: "Manhattan", center: { lat: 40.7163, lng: -74.0086 } },
  { name: "Fort Greene", borough: "Brooklyn", center: { lat: 40.6892, lng: -73.9747 } },
  { name: "Gramercy", borough: "Manhattan", center: { lat: 40.7368, lng: -73.9845 } },
];

const LANDMARKS = [
  { name: "Times Square", lat: 40.7580, lng: -73.9855 },
  { name: "Union Square", lat: 40.7359, lng: -73.9911 },
  { name: "Grand Central", lat: 40.7527, lng: -73.9772 },
  { name: "Atlantic Ave", lat: 40.6862, lng: -73.9776 },
  { name: "Penn Station", lat: 40.7506, lng: -73.9935 },
];

function manhattanDistanceMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const latDiff = Math.abs(a.lat - b.lat) * 69.0;
  const lngDiff = Math.abs(a.lng - b.lng) * 54.6;
  return latDiff + lngDiff;
}

function computeSubwayTime(
  graph: StationGraph,
  matrix: StationMatrix,
  idxMap: Map<string, number>,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number | null {
  const findNearest = (point: { lat: number; lng: number }) =>
    Object.entries(graph.stations)
      .map(([id, s]) => ({ id, dist: manhattanDistanceMi(point, s) }))
      .filter((s) => s.dist <= SUBWAY_MAX_WALK_MI)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

  const nearOrigin = findNearest(from);
  const nearDest = findNearest(to);
  if (nearOrigin.length === 0 || nearDest.length === 0) return null;

  let best = Infinity;
  for (const o of nearOrigin) {
    for (const d of nearDest) {
      const i = idxMap.get(o.id);
      const j = idxMap.get(d.id);
      if (i === undefined || j === undefined) continue;
      const stationTime = matrix.times[i][j];
      if (stationTime >= 999) continue;
      const walkO = (o.dist / WALK_SPEED) * 60;
      const walkD = (d.dist / WALK_SPEED) * 60;
      const total = walkO + stationTime + walkD;
      if (total < best) best = total;
    }
  }
  return best === Infinity ? null : Math.round(best * 10) / 10;
}

// Main
const dataDir = resolve(__dirname, "../public/data");
const graph: StationGraph = JSON.parse(readFileSync(resolve(dataDir, "station-graph.json"), "utf-8"));
const matrix: StationMatrix = JSON.parse(readFileSync(resolve(dataDir, "station-matrix.json"), "utf-8"));
const idxMap = new Map(matrix.stationIds.map((id, i) => [id, i]));

const rankings = NYC_NEIGHBORHOODS.map((hood) => {
  const times = LANDMARKS.map((lm) =>
    computeSubwayTime(graph, matrix, idxMap, hood.center, lm)
  ).filter((t): t is number => t !== null);

  const avgMinutes =
    times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : Infinity;

  return {
    name: hood.name,
    borough: hood.borough,
    center: hood.center,
    avgMinutes: avgMinutes === Infinity ? null : Math.round(avgMinutes * 10) / 10,
  };
})
  .filter((r) => r.avgMinutes !== null)
  .sort((a, b) => a.avgMinutes! - b.avgMinutes!);

writeFileSync(resolve(dataDir, "rankings.json"), JSON.stringify(rankings, null, 2));
console.log(`Wrote ${rankings.length} ranked neighborhoods to public/data/rankings.json`);
