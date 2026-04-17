/**
 * Populate `routes[]` on every stop in public/data/bus-stops.json by joining
 * GTFS bus data (stops → stop_times → trips → routes). The S19 gap-fill
 * left gap-fill stops with routes=[], which defeats the route-membership
 * filter added to computeBusTime. This script fills them in from the
 * extracted bus-gtfs.zip so the filter actually does something.
 *
 * Usage: npx tsx scripts/populate-bus-routes.ts
 *
 * Reads:
 *   data/gtfs-bus/extracted/{routes,trips,stop_times}.txt  (main bus feed)
 *   data/gtfs-bus/queens/extracted/{routes,trips,stop_times}.txt  (Queens)
 *   public/data/bus-stops.json
 * Writes:
 *   public/data/bus-stops.json  (in-place, routes populated)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const PROJECT = path.resolve(__dirname, "..");
const FEEDS = [
  path.join(PROJECT, "data/gtfs-bus/extracted"),
  path.join(PROJECT, "data/gtfs-bus/queens/extracted"),
].filter((p) => fs.existsSync(p));
const OUTPUT = path.join(PROJECT, "public/data/bus-stops.json");

interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

/** Map<route_id → route_short_name> for one feed. */
function loadRoutes(feedDir: string): Map<string, string> {
  const csv = fs.readFileSync(path.join(feedDir, "routes.txt"), "utf8");
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",");
  const idCol = header.indexOf("route_id");
  const nameCol = header.indexOf("route_short_name");
  const map = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const parts = parseCsvRow(line);
    const id = parts[idCol];
    const name = parts[nameCol] || id;
    if (id) map.set(id, name);
  }
  return map;
}

/** Map<trip_id → route_id> for one feed. */
function loadTrips(feedDir: string): Map<string, string> {
  const csv = fs.readFileSync(path.join(feedDir, "trips.txt"), "utf8");
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",");
  const tripCol = header.indexOf("trip_id");
  const routeCol = header.indexOf("route_id");
  const map = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const parts = parseCsvRow(line);
    const tid = parts[tripCol];
    const rid = parts[routeCol];
    if (tid && rid) map.set(tid, rid);
  }
  return map;
}

/** Minimal CSV row parser — handles quoted fields with commas. */
function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === "," && !inQuotes) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Stream stop_times.txt (potentially 100MB+) and accumulate
 * Map<stop_id → Set<route_short_name>> using pre-loaded trip/route maps.
 */
async function accumulateStopRoutes(
  feedDir: string,
  trips: Map<string, string>,
  routes: Map<string, string>,
  accum: Map<string, Set<string>>
): Promise<void> {
  const file = path.join(feedDir, "stop_times.txt");
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });

  let header: string[] | null = null;
  let tripCol = -1, stopCol = -1;
  let rows = 0;

  for await (const line of rl) {
    if (!header) {
      header = line.split(",");
      tripCol = header.indexOf("trip_id");
      stopCol = header.indexOf("stop_id");
      continue;
    }
    if (!line) continue;
    const parts = parseCsvRow(line);
    const tid = parts[tripCol];
    const sid = parts[stopCol];
    if (!tid || !sid) continue;
    const rid = trips.get(tid);
    if (!rid) continue;
    const routeName = routes.get(rid);
    if (!routeName) continue;
    let set = accum.get(sid);
    if (!set) { set = new Set(); accum.set(sid, set); }
    set.add(routeName);
    rows++;
    if (rows % 1_000_000 === 0) {
      process.stdout.write(`  ...${(rows / 1_000_000).toFixed(1)}M rows\n`);
    }
  }
  console.log(`  total ${rows.toLocaleString()} stop_times rows from ${path.basename(feedDir)}`);
}

async function main() {
  console.log(`Feeds: ${FEEDS.length}`);
  const stopToRoutes = new Map<string, Set<string>>();

  for (const feed of FEEDS) {
    console.log(`\nProcessing ${feed}`);
    const routes = loadRoutes(feed);
    const trips = loadTrips(feed);
    console.log(`  ${routes.size} routes, ${trips.size} trips`);
    await accumulateStopRoutes(feed, trips, routes, stopToRoutes);
  }

  console.log(`\nStop → routes map: ${stopToRoutes.size} stops covered`);

  // Load existing bus stops
  const existing: { stops: BusStop[] } = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
  console.log(`Existing bus stops: ${existing.stops.length}`);

  let populated = 0, alreadyHad = 0, stillEmpty = 0;
  const merged: BusStop[] = existing.stops.map((stop) => {
    // S19 gap-fill stops are prefixed with "bus-" — strip to get raw GTFS stop_id
    const gtfsId = stop.id.startsWith("bus-") ? stop.id.slice(4) : stop.id;
    const fromGtfs = stopToRoutes.get(gtfsId);
    const existingRoutes = new Set(stop.routes);
    const hadAny = existingRoutes.size > 0;

    if (fromGtfs) {
      for (const r of fromGtfs) existingRoutes.add(r);
    }

    const merged = Array.from(existingRoutes).sort();
    if (merged.length > 0 && !hadAny) populated++;
    else if (hadAny) alreadyHad++;
    else stillEmpty++;

    return { ...stop, routes: merged };
  });

  console.log(`\nResult:`);
  console.log(`  Newly populated:  ${populated}`);
  console.log(`  Already had:      ${alreadyHad}`);
  console.log(`  Still empty:      ${stillEmpty}`);
  console.log(`  Total:            ${merged.length}`);

  fs.writeFileSync(OUTPUT, JSON.stringify({ stops: merged }, null, 2));
  console.log(`\nWritten to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
