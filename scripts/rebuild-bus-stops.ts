/**
 * Rebuild bus-stops.json from all GTFS bus stops (Brooklyn + Queens + Manhattan).
 *
 * Steps:
 * 1. Read routes, trips, stop_times from each feed directory
 * 2. Build stop_id → [route_short_name] mapping
 * 3. Read stops, filter to NYC bounds, emit with routes
 * 4. Deduplicate across feeds, write to public/data/bus-stops.json
 *
 * Usage: npx tsx scripts/rebuild-bus-stops.ts
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT = path.resolve(__dirname, "..");
const OUTPUT = path.join(PROJECT, "public/data/bus-stops.json");
const NYC = { minLat: 40.49, maxLat: 40.92, minLng: -74.26, maxLng: -73.68 };

// Feed directories
const FEEDS = [
  path.join(PROJECT, "data/gtfs-bus/extracted"),
  path.join(PROJECT, "data/gtfs-bus/queens/extracted"),
].filter((p) => fs.existsSync(p));

// Manhattan feed (downloaded this session as manhattan.zip)
const MANHATTAN_ZIP = path.join(PROJECT, "data/gtfs-bus/manhattan.zip");
const MANHATTAN_DIR = path.join(PROJECT, "data/gtfs-bus/manhattan_extracted");

interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseHeaderIndexes(headerLine: string, cols: string[]): Record<string, number> {
  const parts = parseCsvLine(headerLine);
  const idx: Record<string, number> = {};
  for (const col of cols) {
    const i = parts.indexOf(col);
    if (i === -1) throw new Error(`Column '${col}' not found in: ${headerLine}`);
    idx[col] = i;
  }
  return idx;
}

function buildStopRoutesMap(feedDir: string): Map<string, Set<string>> {
  console.log(`  Processing feed: ${path.basename(feedDir)}`);

  // routes.txt: route_id → route_short_name
  const routesRaw = fs.readFileSync(path.join(feedDir, "routes.txt"), "utf8").trim().split("\n");
  const routeIdx = parseHeaderIndexes(routesRaw[0], ["route_id", "route_short_name"]);
  const routeMap = new Map<string, string>();
  for (const line of routesRaw.slice(1)) {
    const parts = parseCsvLine(line);
    const id = parts[routeIdx.route_id];
    const name = parts[routeIdx.route_short_name] || id;
    if (id) routeMap.set(id, name);
  }
  console.log(`    Routes: ${routeMap.size}`);

  // trips.txt: trip_id → route_id
  const tripsRaw = fs.readFileSync(path.join(feedDir, "trips.txt"), "utf8").trim().split("\n");
  const tripIdx = parseHeaderIndexes(tripsRaw[0], ["route_id", "trip_id"]);
  const tripMap = new Map<string, string>(); // trip_id → route_id
  for (const line of tripsRaw.slice(1)) {
    const parts = parseCsvLine(line);
    const tripId = parts[tripIdx.trip_id];
    const routeId = parts[tripIdx.route_id];
    if (tripId && routeId) tripMap.set(tripId, routeId);
  }
  console.log(`    Trips: ${tripMap.size}`);

  // stop_times.txt: build stop_id → Set<route_name>
  // Process line by line to avoid loading 400MB into memory
  const stopRoutes = new Map<string, Set<string>>();
  const stopTimesPath = path.join(feedDir, "stop_times.txt");
  const stopTimesRaw = fs.readFileSync(stopTimesPath, "utf8").trim().split("\n");
  const stIdx = parseHeaderIndexes(stopTimesRaw[0], ["trip_id", "stop_id"]);
  let processed = 0;
  for (const line of stopTimesRaw.slice(1)) {
    const parts = parseCsvLine(line);
    const tripId = parts[stIdx.trip_id];
    const stopId = parts[stIdx.stop_id];
    const routeId = tripMap.get(tripId);
    if (routeId) {
      const routeName = routeMap.get(routeId);
      if (routeName) {
        if (!stopRoutes.has(stopId)) stopRoutes.set(stopId, new Set());
        stopRoutes.get(stopId)!.add(routeName);
      }
    }
    processed++;
    if (processed % 500000 === 0) process.stdout.write(`.`);
  }
  console.log(`\n    Stop-time rows: ${stopTimesRaw.length - 1}, stops with routes: ${stopRoutes.size}`);
  return stopRoutes;
}

function loadStops(feedDir: string, stopRoutes: Map<string, Set<string>>): BusStop[] {
  const stopsRaw = fs.readFileSync(path.join(feedDir, "stops.txt"), "utf8").trim().split("\n");
  const hdr = parseCsvLine(stopsRaw[0]);
  const idCol = hdr.indexOf("stop_id");
  const nameCol = hdr.indexOf("stop_name");
  const latCol = hdr.indexOf("stop_lat");
  const lngCol = hdr.indexOf("stop_lon");

  const stops: BusStop[] = [];
  for (const line of stopsRaw.slice(1)) {
    const parts = parseCsvLine(line);
    const id = parts[idCol];
    const name = parts[nameCol];
    const lat = parseFloat(parts[latCol]);
    const lng = parseFloat(parts[lngCol]);
    if (isNaN(lat) || isNaN(lng)) continue;
    if (lat < NYC.minLat || lat > NYC.maxLat || lng < NYC.minLng || lng > NYC.maxLng) continue;
    const routes = stopRoutes.has(id) ? [...stopRoutes.get(id)!].sort() : [];
    if (routes.length === 0) continue; // only include stops with known routes
    stops.push({ id, name, lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000, routes });
  }
  return stops;
}

// Process each feed
const allStops = new Map<string, BusStop>(); // id → stop (deduplicate)

// Also check if manhattan_extracted exists and add it
if (fs.existsSync(MANHATTAN_DIR)) {
  FEEDS.push(MANHATTAN_DIR);
}

for (const feedDir of FEEDS) {
  try {
    const stopRoutes = buildStopRoutesMap(feedDir);
    const stops = loadStops(feedDir, stopRoutes);
    console.log(`  Stops loaded: ${stops.length}`);
    for (const s of stops) {
      if (!allStops.has(s.id)) {
        allStops.set(s.id, s);
      } else {
        // Merge routes if same stop appears in multiple feeds
        const existing = allStops.get(s.id)!;
        const merged = Array.from(new Set([...existing.routes, ...s.routes])).sort();
        existing.routes = merged;
      }
    }
  } catch (err) {
    console.warn(`  Feed ${feedDir} failed:`, (err as Error).message);
  }
}

const finalStops = [...allStops.values()];
console.log(`\nTotal unique bus stops with routes: ${finalStops.length}`);

// Show geographic distribution
const areas: Record<string, number> = {
  "Manhattan": finalStops.filter(s => s.lat >= 40.70 && s.lat <= 40.88 && s.lng >= -74.02 && s.lng <= -73.92).length,
  "Brooklyn": finalStops.filter(s => s.lat >= 40.57 && s.lat <= 40.74 && s.lng >= -74.04 && s.lng <= -73.83).length,
  "Queens": finalStops.filter(s => s.lat >= 40.60 && s.lat <= 40.80 && s.lng >= -73.95 && s.lng <= -73.68).length,
};
for (const [area, count] of Object.entries(areas)) {
  console.log(`  ${area}: ${count}`);
}

fs.writeFileSync(OUTPUT, JSON.stringify({ stops: finalStops }, null, 2));
console.log(`\nWritten ${finalStops.length} stops to ${OUTPUT}`);
