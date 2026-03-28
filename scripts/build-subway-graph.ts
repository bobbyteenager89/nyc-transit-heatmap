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

  // 3. Build parent station map (stop_id -> parent_station or self)
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
  const edgeSamples = new Map<string, number[]>(); // "stationA->stationB" -> [times]

  for (const [, stops] of tripStops) {
    const sorted = [...stops].sort((a, b) => a.time - b.time);

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      if (from.stationId === to.stationId) continue;

      const key = `${from.stationId}->${to.stationId}`;
      const travelTime = to.time - from.time;
      if (travelTime > 0 && travelTime < 30) { // Sanity: skip > 30 min edges
        if (!edgeSamples.has(key)) edgeSamples.set(key, []);
        edgeSamples.get(key)!.push(travelTime);
      }
    }
  }

  const edges: Record<string, Record<string, number>> = {};
  for (const [key, samples] of edgeSamples) {
    const [from, to] = key.split("->");
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
