import type { LatLng, TransportMode, CitiBikeStation, Destination, StationGraph, StationMatrix } from "../lib/types";
import { WALK_SPEED, BIKE_SPEED, DRIVE_SPEED_MANHATTAN, DRIVE_SPEED_OUTER, MANHATTAN_BOUNDARY_LAT, BIKE_DOCK_TIME_MIN, BIKE_DOCK_RANGE_MI, SUBWAY_MAX_WALK_MI, SUBWAY_WAIT_MIN, WEEKS_PER_MONTH, FERRY_MAX_WALK_MI, BUS_SPEED_MPH, BUS_MAX_WALK_MI, BUS_WAIT_MIN } from "../lib/constants";

// Ferry types (inlined — can't import from lib in worker)
interface FerryTerminalData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}
/** Pre-computed all-pairs shortest ferry times: terminalId → { terminalId → minutes } */
type FerryAdjacencyData = Record<string, Record<string, number>>;

// Bus types (inlined — can't import from lib in worker)
interface BusStopData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

// --- Inline distance/travel calculations (can't import lib in worker) ---

const DEG_LAT_MI = 69.0;
const DEG_LNG_MI = 52.3;

function manhattanDist(a: LatLng, b: LatLng): number {
  return Math.abs(a.lat - b.lat) * DEG_LAT_MI + Math.abs(a.lng - b.lng) * DEG_LNG_MI;
}

function walkMin(from: LatLng, to: LatLng): number {
  return (manhattanDist(from, to) / WALK_SPEED) * 60;
}

function bikeRideMin(from: LatLng, to: LatLng): number {
  return (manhattanDist(from, to) / BIKE_SPEED) * 60;
}

/** Realistic Citi Bike commute: walk to nearest dock, undock, ride dock→dock,
 *  dock, walk to destination. Returns null if either end has no dock in range. */
function computeBikeTime(
  from: LatLng,
  to: LatLng,
  dockGrid: SpatialGrid<CitiBikeStation>
): number | null {
  const fromDock = findNearestDockWithDist(from, dockGrid, BIKE_DOCK_RANGE_MI);
  if (!fromDock) return null;
  const toDock = findNearestDockWithDist(to, dockGrid, BIKE_DOCK_RANGE_MI);
  if (!toDock) return null;
  const walkToDock = (fromDock.dist / WALK_SPEED) * 60;
  const walkFromDock = (toDock.dist / WALK_SPEED) * 60;
  const ride = bikeRideMin(fromDock.station, toDock.station);
  return Math.round((walkToDock + BIKE_DOCK_TIME_MIN + ride + BIKE_DOCK_TIME_MIN + walkFromDock) * 10) / 10;
}

function driveMin(from: LatLng, to: LatLng): number {
  const inManhattan = from.lat <= MANHATTAN_BOUNDARY_LAT && from.lng >= -74.02 && from.lng <= -73.9 &&
    to.lat <= MANHATTAN_BOUNDARY_LAT && to.lng >= -74.02 && to.lng <= -73.9;
  const speed = inManhattan ? DRIVE_SPEED_MANHATTAN : DRIVE_SPEED_OUTER;
  return (manhattanDist(from, to) / speed) * 60;
}

// --- Spatial grid index for fast nearest-neighbor lookups ---
// Turns O(n) scans into ~O(1) by bucketing items into 0.01° grid cells

const GRID_CELL_SIZE = 0.01; // ~0.7 mi lat, ~0.5 mi lng

interface SpatialGrid<T> {
  cells: Map<string, T[]>;
}

function gridKey(lat: number, lng: number): string {
  return `${Math.floor(lat / GRID_CELL_SIZE)},${Math.floor(lng / GRID_CELL_SIZE)}`;
}

function buildSpatialGrid<T extends { lat: number; lng: number }>(items: T[]): SpatialGrid<T> {
  const cells = new Map<string, T[]>();
  for (const item of items) {
    const key = gridKey(item.lat, item.lng);
    let bucket = cells.get(key);
    if (!bucket) { bucket = []; cells.set(key, bucket); }
    bucket.push(item);
  }
  return { cells };
}

function buildStationSpatialGrid(stations: Record<string, { lat: number; lng: number }>): SpatialGrid<{ id: string; lat: number; lng: number }> {
  const items: { id: string; lat: number; lng: number }[] = [];
  for (const [id, s] of Object.entries(stations)) {
    items.push({ id, lat: s.lat, lng: s.lng });
  }
  return buildSpatialGrid(items);
}

function searchGrid<T extends { lat: number; lng: number }>(
  point: LatLng, grid: SpatialGrid<T>, maxDist: number
): { item: T; dist: number }[] {
  const latRange = Math.ceil(maxDist / (DEG_LAT_MI * GRID_CELL_SIZE));
  const lngRange = Math.ceil(maxDist / (DEG_LNG_MI * GRID_CELL_SIZE));
  const cLat = Math.floor(point.lat / GRID_CELL_SIZE);
  const cLng = Math.floor(point.lng / GRID_CELL_SIZE);
  const results: { item: T; dist: number }[] = [];
  for (let dLat = -latRange; dLat <= latRange; dLat++) {
    for (let dLng = -lngRange; dLng <= lngRange; dLng++) {
      const key = `${cLat + dLat},${cLng + dLng}`;
      const bucket = grid.cells.get(key);
      if (!bucket) continue;
      for (const item of bucket) {
        const dist = manhattanDist(point, item);
        if (dist <= maxDist) results.push({ item, dist });
      }
    }
  }
  return results;
}

// --- Station helpers ---

function buildStationIdxMap(ids: string[]): Map<string, number> {
  return new Map(ids.map((id, i) => [id, i]));
}

function findNearestStationsIndexed(
  point: LatLng, grid: SpatialGrid<{ id: string; lat: number; lng: number }>, maxDist: number, count: number
) {
  const results = searchGrid(point, grid, maxDist).map(({ item, dist }) => ({ id: item.id, dist }));
  results.sort((a, b) => a.dist - b.dist);
  return results.slice(0, count);
}

function findNearestDockWithDist(
  point: LatLng,
  grid: SpatialGrid<CitiBikeStation>,
  maxDist: number
): { station: CitiBikeStation; dist: number } | null {
  let bestStation: CitiBikeStation | null = null;
  let bestDist = maxDist;
  for (const { item, dist } of searchGrid(point, grid, maxDist)) {
    if (dist < bestDist) { bestDist = dist; bestStation = item; }
  }
  return bestStation ? { station: bestStation, dist: bestDist } : null;
}

function findNearestTerminalsIndexed(
  point: LatLng, grid: SpatialGrid<FerryTerminalData>, maxDist: number, count: number
) {
  const results = searchGrid(point, grid, maxDist).map(({ item, dist }) => ({ id: item.id, lat: item.lat, lng: item.lng, dist }));
  results.sort((a, b) => a.dist - b.dist);
  return results.slice(0, count);
}

// --- Station-pair travel time cache ---

const subwayTimeCache = new Map<number, number>();

function cachedMatrixLookup(matrix: number[][], fi: number, ti: number): number {
  const key = fi * 100000 + ti;
  const cached = subwayTimeCache.get(key);
  if (cached !== undefined) return cached;
  const val = matrix[fi][ti];
  subwayTimeCache.set(key, val);
  return val;
}

/**
 * Builds the access-leg candidate set for a subway query from one side.
 * Default access = walking. If `busStopGrid` is supplied, we also consider
 * walking to a nearby bus stop, waiting, and bus-riding to any station
 * within ~1 mi of that stop. This is a single-leg bus approximation (no
 * transfers, no bus routing graph) — enough to catch the common case of
 * "bus to the subway" without a full bus network.
 *
 * Returns a map of stationId → best access time (minutes) to reach that
 * station from the point. Callers use this instead of the raw walking
 * candidates when bus-assist is enabled.
 */
function buildStationAccess(
  point: LatLng,
  stationGrid: SpatialGrid<{ id: string; lat: number; lng: number }>,
  busStopGrid: SpatialGrid<BusStopData> | null
): Map<string, number> {
  const access = new Map<string, number>();
  // Walking access (existing behavior).
  for (const s of findNearestStationsIndexed(point, stationGrid, SUBWAY_MAX_WALK_MI, 8)) {
    access.set(s.id, (s.dist / WALK_SPEED) * 60);
  }
  if (!busStopGrid) return access;
  // Bus-assisted access: walk to a nearby stop, wait, ride ≤1 mi to a station.
  const nearStops = searchGrid(point, busStopGrid, BUS_MAX_WALK_MI);
  nearStops.sort((a, b) => a.dist - b.dist);
  for (const { item: stop, dist: walkDist } of nearStops.slice(0, 3)) {
    const walkToStop = (walkDist / WALK_SPEED) * 60;
    const reachable = findNearestStationsIndexed(
      { lat: stop.lat, lng: stop.lng }, stationGrid, 1.0, 5
    );
    for (const s of reachable) {
      const busRide = (s.dist / BUS_SPEED_MPH) * 60;
      const accessMin = walkToStop + BUS_WAIT_MIN + busRide;
      const prev = access.get(s.id);
      if (prev === undefined || accessMin < prev) access.set(s.id, accessMin);
    }
  }
  return access;
}

function computeSubwayTime(
  from: LatLng, to: LatLng,
  stationGrid: SpatialGrid<{ id: string; lat: number; lng: number }>,
  matrix: number[][], idxMap: Map<string, number>,
  busStopGrid: SpatialGrid<BusStopData> | null = null
): number | null {
  // Consider top 8 stations at each end. Widening the candidate pool lets the
  // matrix pick the best end-to-end route even if one side's best line is the
  // 4th-nearest station. If `busStopGrid` is provided, BOTH sides get
  // bus-to-station legs: "walk → bus → subway station" on access and
  // "subway station → bus → walk" on egress. Distances are symmetric
  // (manhattan), so buildStationAccess works identically in both directions.
  const fromAccess = buildStationAccess(from, stationGrid, busStopGrid);
  const toAccess = buildStationAccess(to, stationGrid, busStopGrid);
  if (fromAccess.size === 0 || toAccess.size === 0) return null;
  let best = Infinity;
  for (const [fromId, accessMin] of fromAccess) {
    const fi = idxMap.get(fromId);
    if (fi === undefined) continue;
    for (const [toId, egressMin] of toAccess) {
      const ti = idxMap.get(toId);
      if (ti === undefined) continue;
      const stationTime = cachedMatrixLookup(matrix, fi, ti);
      if (stationTime >= 999) continue;
      // Add average boarding wait — the GTFS matrix is pure ride time.
      const total = accessMin + SUBWAY_WAIT_MIN + stationTime + egressMin;
      if (total < best) best = total;
    }
  }
  return best === Infinity ? null : Math.round(best * 10) / 10;
}

// --- Ferry helpers ---

function computeFerryTime(
  from: LatLng, to: LatLng,
  terminalGrid: SpatialGrid<FerryTerminalData>,
  adjacency: FerryAdjacencyData
): number | null {
  const nearFrom = findNearestTerminalsIndexed(from, terminalGrid, FERRY_MAX_WALK_MI, 3);
  const nearTo = findNearestTerminalsIndexed(to, terminalGrid, FERRY_MAX_WALK_MI, 3);
  if (nearFrom.length === 0 || nearTo.length === 0) return null;

  let best = Infinity;
  for (const f of nearFrom) {
    const walkToTerminal = (f.dist / WALK_SPEED) * 60;
    const adj = adjacency[f.id];
    if (!adj) continue;
    for (const t of nearTo) {
      if (f.id === t.id) continue;
      const ferryTime = adj[t.id];
      if (ferryTime === undefined) continue;
      const walkFromTerminal = (t.dist / WALK_SPEED) * 60;
      // Add average wait time of ~10 min for ferry service
      const total = walkToTerminal + 10 + ferryTime + walkFromTerminal;
      if (total < best) best = total;
    }
  }
  return best === Infinity ? null : Math.round(best * 10) / 10;
}

// --- Bus helpers ---

function computeBusTime(
  from: LatLng, to: LatLng,
  busGrid: SpatialGrid<BusStopData>
): number | null {
  // Find nearest bus stop to origin
  const nearFrom = searchGrid(from, busGrid, BUS_MAX_WALK_MI);
  if (nearFrom.length === 0) return null;
  nearFrom.sort((a, b) => a.dist - b.dist);
  const stopFrom = nearFrom[0];

  // Find nearest bus stop to destination
  const nearTo = searchGrid(to, busGrid, BUS_MAX_WALK_MI);
  if (nearTo.length === 0) return null;
  nearTo.sort((a, b) => a.dist - b.dist);
  const stopTo = nearTo[0];

  // If same stop, just walk
  if (stopFrom.item.id === stopTo.item.id) return null;

  const walkToStop = (stopFrom.dist / WALK_SPEED) * 60;
  const busRideDist = manhattanDist(stopFrom.item, stopTo.item);
  const busRideTime = (busRideDist / BUS_SPEED_MPH) * 60;
  const walkFromStop = (stopTo.dist / WALK_SPEED) * 60;

  return Math.round((walkToStop + BUS_WAIT_MIN + busRideTime + walkFromStop) * 10) / 10;
}

// --- Compute travel times from a point to a destination ---

function computeTimesForLocation(
  point: LatLng, destLoc: LatLng, modes: TransportMode[],
  stationGrid: SpatialGrid<{ id: string; lat: number; lng: number }>,
  stationGraph: StationGraph, stationMatrix: { times: number[][] },
  idxMap: Map<string, number>,
  dockGrid: SpatialGrid<CitiBikeStation>,
  terminalGrid: SpatialGrid<FerryTerminalData>,
  ferryAdjacency: FerryAdjacencyData,
  busStopGrid: SpatialGrid<BusStopData>
): Record<TransportMode, number | null> {
  const times: Record<TransportMode, number | null> = {
    walk: modes.includes("walk") ? walkMin(point, destLoc) : null,
    car: modes.includes("car") ? driveMin(point, destLoc) : null,
    bike: null, ownbike: null, subway: null, bus: null, ferry: null,
  };
  if (modes.includes("bike")) {
    times.bike = computeBikeTime(point, destLoc, dockGrid);
  }
  if (modes.includes("ownbike")) {
    // Door-to-door own bike: pure ride, no dock walk/undock overhead.
    times.ownbike = Math.round(bikeRideMin(point, destLoc) * 10) / 10;
  }
  if (modes.includes("subway")) {
    // When bus is also active, pass the bus stop grid so both access and
    // egress legs can use "walk → bus → subway station" instead of a
    // straight walk. Both sides are bus-assisted.
    const busAssist = modes.includes("bus") ? busStopGrid : null;
    times.subway = computeSubwayTime(point, destLoc, stationGrid, stationMatrix.times, idxMap, busAssist);
  }
  if (modes.includes("bus")) {
    times.bus = computeBusTime(point, destLoc, busStopGrid);
  }
  if (modes.includes("ferry")) {
    times.ferry = computeFerryTime(point, destLoc, terminalGrid, ferryAdjacency);
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
  ferryTerminals: FerryTerminalData[];
  ferryAdjacency: FerryAdjacencyData;
  busStops: BusStopData[];
}

const CHUNK_SIZE = 5000;

type CellResult = {
  h3Index: string;
  times: Record<TransportMode, number | null>;
  fastest: TransportMode;
  compositeScore: number;
  destBreakdown: Record<string, number>;
};

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { hexCenters, origin, destinations, modes, stationGraph, stationMatrix, citiBikeStations, ferryTerminals, ferryAdjacency, busStops } = e.data;
  const idxMap = buildStationIdxMap(stationMatrix.stationIds);
  const fTerminals = ferryTerminals ?? [];
  const fAdjacency = ferryAdjacency ?? {};
  const bStops = busStops ?? [];

  // Clear caches for fresh computation
  subwayTimeCache.clear();

  // Build spatial indexes (one-time cost, pays off over ~150k cells)
  const stationGrid = buildStationSpatialGrid(stationGraph.stations);
  const dockGrid = buildSpatialGrid(citiBikeStations);
  const terminalGrid = buildSpatialGrid(fTerminals);
  const busStopGrid = buildSpatialGrid(bStops);

  const total = hexCenters.length;
  const cells: CellResult[] = new Array(total);
  let processed = 0;

  function processChunk() {
    const end = Math.min(processed + CHUNK_SIZE, total);

    if (destinations.length === 0 && origin) {
      // Explore mode: accessibility from origin
      for (let i = processed; i < end; i++) {
        const hex = hexCenters[i];
        const point: LatLng = { lat: hex.lat, lng: hex.lng };
        const times = computeTimesForLocation(point, origin, modes, stationGrid, stationGraph, stationMatrix, idxMap, dockGrid, terminalGrid, fAdjacency, busStopGrid);
        const { fastest, time } = getFastestTime(times);
        cells[i] = {
          h3Index: hex.h3Index,
          times,
          fastest,
          compositeScore: time === Infinity ? 999 : Math.round(time * 10) / 10,
          destBreakdown: {} as Record<string, number>,
        };
      }
    } else {
      // Score mode: total monthly minutes per hex cell
      for (let i = processed; i < end; i++) {
        const hex = hexCenters[i];
        const point: LatLng = { lat: hex.lat, lng: hex.lng };
        let totalMonthlyMinutes = 0;
        const aggTimes: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, ownbike: null, subway: null, bus: null, ferry: null };
        const destBreakdown: Record<string, number> = {};

        for (const dest of destinations) {
          const destLocations = dest.locations && dest.locations.length > 0 ? dest.locations : [dest.location];
          let bestTime = Infinity;
          let bestTimes: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, ownbike: null, subway: null, bus: null, ferry: null };

          for (const destLoc of destLocations) {
            const locTimes = computeTimesForLocation(point, destLoc, modes, stationGrid, stationGraph, stationMatrix, idxMap, dockGrid, terminalGrid, fAdjacency, busStopGrid);
            const { time } = getFastestTime(locTimes);
            if (time < bestTime) { bestTime = time; bestTimes = locTimes; }
          }

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

        cells[i] = {
          h3Index: hex.h3Index,
          times: aggTimes,
          fastest,
          compositeScore: totalMonthlyMinutes > 0 ? Math.round(totalMonthlyMinutes * 10) / 10 : 999,
          destBreakdown,
        };
      }
    }

    processed = end;

    // Post progress update
    self.postMessage({ type: 'progress', percent: Math.round((processed / total) * 100) });

    if (processed < total) {
      // Yield to avoid blocking the worker thread, then continue
      setTimeout(processChunk, 0);
    } else {
      // Done — send final result
      self.postMessage({ type: 'result', cells });
    }
  }

  // Start chunked processing
  processChunk();
};
