/**
 * Expand bus-stops.json with GTFS bus stop data to cover underserved areas.
 *
 * Reads the Brooklyn bus GTFS stops.txt (downloaded to project root),
 * finds areas with no current bus stop coverage, and adds strategic stops
 * from the GTFS data to fill gaps — especially deep Brooklyn (Canarsie,
 * East New York, Flatlands, Marine Park).
 *
 * Usage: npx tsx scripts/expand-bus-stops.ts
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT = path.resolve(__dirname, "..");
const GTFS_STOPS_BROOKLYN = path.join(PROJECT, "data/gtfs-bus/stops.txt");
const GTFS_STOPS_QUEENS = path.join(PROJECT, "data/gtfs-bus/queens/stops.txt");
const CURRENT_FILE = path.join(PROJECT, "public/data/bus-stops.json");
const OUTPUT_FILE = path.join(PROJECT, "public/data/bus-stops.json");

// NYC bounds (from constants.ts MAX_NYC_BOUNDS)
const NYC = { minLat: 40.55, maxLat: 40.90, minLng: -74.06, maxLng: -73.72 };

const DEG_LAT_MI = 69.0;
const DEG_LNG_MI = 52.3;
function manhattanDist(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return Math.abs(a.lat - b.lat) * DEG_LAT_MI + Math.abs(a.lng - b.lng) * DEG_LNG_MI;
}

interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

// Parse GTFS stops.txt from one or more files
function parseGtfsStops(): Array<{ id: string; name: string; lat: number; lng: number }> {
  const files = [GTFS_STOPS_BROOKLYN, GTFS_STOPS_QUEENS].filter(f => fs.existsSync(f));
  const all: Array<{ id: string; name: string; lat: number; lng: number }> = [];
  for (const file of files) {
    const csv = fs.readFileSync(file, "utf8");
    const lines = csv.trim().split("\n");
    const stops = lines.slice(1).map((line) => {
      const parts = line.split(",");
      return {
        id: parts[0].trim().replace(/"/g, ""),
        name: parts[1].trim().replace(/"/g, ""),
        lat: parseFloat(parts[3]),
        lng: parseFloat(parts[4]),
      };
    }).filter(
      (s) =>
        !isNaN(s.lat) &&
        !isNaN(s.lng) &&
        s.lat >= NYC.minLat &&
        s.lat <= NYC.maxLat &&
        s.lng >= NYC.minLng &&
        s.lng <= NYC.maxLng
    );
    all.push(...stops);
  }
  // Deduplicate by stop_id
  const seen = new Set<string>();
  return all.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
}

// Load current bus stops
function loadCurrentStops(): BusStop[] {
  const data = JSON.parse(fs.readFileSync(CURRENT_FILE, "utf8"));
  return data.stops;
}

// Grid-based gap finder: divide NYC into cells, find cells with GTFS stops
// but no current coverage within COVERAGE_RADIUS miles.
const CELL_SIZE = 0.008; // ~0.55 mi lat, ~0.42 mi lng
const COVERAGE_RADIUS = 0.4; // miles — if no current stop within this, it's a gap

function findGaps(
  current: BusStop[],
  gtfs: Array<{ id: string; name: string; lat: number; lng: number }>
) {
  // Build grid of GTFS stops
  const cells = new Map<string, typeof gtfs>();
  for (const s of gtfs) {
    const key = `${Math.floor(s.lat / CELL_SIZE)},${Math.floor(s.lng / CELL_SIZE)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(s);
  }

  // Find uncovered cells
  const gaps: Array<{ cellKey: string; stops: typeof gtfs; minDist: number }> = [];
  for (const [key, cellStops] of cells) {
    // Use the cell centroid to check distance
    const centroid = {
      lat: cellStops.reduce((s, c) => s + c.lat, 0) / cellStops.length,
      lng: cellStops.reduce((s, c) => s + c.lng, 0) / cellStops.length,
    };
    const nearest = current.reduce(
      (min, c) => Math.min(min, manhattanDist(centroid, c)),
      Infinity
    );
    if (nearest > COVERAGE_RADIUS) {
      gaps.push({ cellKey: key, stops: cellStops, minDist: nearest });
    }
  }

  return gaps.sort((a, b) => b.minDist - a.minDist);
}

// Select the best representative stop per gap cell.
// Prefer stops near the cell center (most central coverage).
function selectRepresentative(stops: Array<{ id: string; name: string; lat: number; lng: number }>) {
  const centroid = {
    lat: stops.reduce((s, c) => s + c.lat, 0) / stops.length,
    lng: stops.reduce((s, c) => s + c.lng, 0) / stops.length,
  };
  return stops.reduce((best, s) => {
    const d = manhattanDist(s, centroid);
    const bd = manhattanDist(best, centroid);
    return d < bd ? s : best;
  }, stops[0]);
}

// Main
const gtfsStops = parseGtfsStops();
const currentStops = loadCurrentStops();

console.log(`GTFS Brooklyn bus stops: ${gtfsStops.length}`);
console.log(`Current curated stops: ${currentStops.length}`);

const gaps = findGaps(currentStops, gtfsStops);
console.log(`Uncovered grid cells: ${gaps.length}`);

// Select one representative per gap
const newStops: BusStop[] = gaps.map((gap) => {
  const rep = selectRepresentative(gap.stops);
  return {
    id: `bus-${rep.id}`,
    name: rep.name,
    lat: Math.round(rep.lat * 10000) / 10000,
    lng: Math.round(rep.lng * 10000) / 10000,
    routes: [], // GTFS stops.txt doesn't have route info directly; we'll leave empty
  };
});

// Deduplicate — remove new stops too close to other new stops (within 0.15 mi)
const deduped: BusStop[] = [];
for (const s of newStops) {
  const tooClose = deduped.some((d) => manhattanDist(d, s) < 0.15);
  if (!tooClose) deduped.push(s);
}

console.log(`New stops to add (after dedup): ${deduped.length}`);

// Merge and write
const merged = [...currentStops, ...deduped];
console.log(`Total stops after merge: ${merged.length}`);

// Show geographic distribution
const areas = {
  "Deep Brooklyn (Canarsie/ENY/Flatlands)": deduped.filter(
    (s) => s.lat >= 40.58 && s.lat <= 40.67 && s.lng >= -73.93 && s.lng <= -73.85
  ),
  "South Brooklyn (Marine Park/Sheepshead)": deduped.filter(
    (s) => s.lat >= 40.57 && s.lat <= 40.61 && s.lng >= -73.97 && s.lng <= -73.90
  ),
  "Southeast Queens": deduped.filter(
    (s) => s.lat >= 40.65 && s.lat <= 40.72 && s.lng >= -73.85 && s.lng <= -73.75
  ),
  "Upper Manhattan / Bronx": deduped.filter(
    (s) => s.lat >= 40.82 && s.lat <= 40.90
  ),
};

console.log("\nNew stops by area:");
for (const [area, stops] of Object.entries(areas)) {
  console.log(`  ${area}: ${stops.length}`);
  stops.slice(0, 3).forEach((s) => console.log(`    ${s.name} (${s.lat}, ${s.lng})`));
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ stops: merged }, null, 2));
console.log(`\nWritten to ${OUTPUT_FILE}`);
