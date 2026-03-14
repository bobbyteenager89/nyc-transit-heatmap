import type { LatLng, TransportMode, CitiBikeStation, Destination, StationGraph, StationMatrix } from "../lib/types";
import { WALK_SPEED, BIKE_SPEED, DRIVE_SPEED_MANHATTAN, DRIVE_SPEED_OUTER, MANHATTAN_BOUNDARY_LAT, BIKE_DOCK_TIME_MIN, BIKE_DOCK_RANGE_MI, SUBWAY_MAX_WALK_MI, BIKE_SUBWAY_DOCK_RANGE_MI, BIKE_SAVINGS_PERCENT, BIKE_SAVINGS_MIN, WEEKS_PER_MONTH } from "../lib/constants";

// --- Inline distance/travel calculations (can't import lib in worker) ---

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

// --- Station helpers ---

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
  const plainSubway = computeSubwayTime(from, to, stations, matrix, idxMap);
  if (plainSubway === null) return null;
  let best = plainSubway;
  for (const f of nearFrom) {
    const fi = idxMap.get(f.id);
    if (fi === undefined) continue;
    const stationLoc = stations[f.id];
    const dockNearStation = findNearestDock(stationLoc, docks, BIKE_SUBWAY_DOCK_RANGE_MI);
    if (!dockNearStation) continue;
    const bikeToStation = bikeMin(from, { lat: dockNearStation.lat, lng: dockNearStation.lng });
    const walkToStation = walkMin(from, stationLoc);
    const useBikeIn = (walkToStation - bikeToStation) >= BIKE_SAVINGS_MIN ||
      (walkToStation > 0 && (walkToStation - bikeToStation) / walkToStation >= BIKE_SAVINGS_PERCENT);
    const legIn = useBikeIn ? bikeToStation : walkToStation;
    for (const t of nearTo) {
      const ti = idxMap.get(t.id);
      if (ti === undefined) continue;
      const stationTime = matrix[fi][ti];
      if (stationTime >= 999) continue;
      const destStationLoc = stations[t.id];
      const walkOut = (t.dist / WALK_SPEED) * 60;
      const v1 = legIn + stationTime + walkOut;
      if (v1 < best) best = v1;
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

// --- Compute travel times from a point to a destination ---

function computeTimesForLocation(
  point: LatLng, destLoc: LatLng, modes: TransportMode[],
  stationGraph: StationGraph, stationMatrix: { times: number[][] },
  idxMap: Map<string, number>, citiBikeStations: CitiBikeStation[]
): Record<TransportMode, number | null> {
  const times: Record<TransportMode, number | null> = {
    walk: modes.includes("walk") ? walkMin(point, destLoc) : null,
    car: modes.includes("car") ? driveMin(point, destLoc) : null,
    bike: null, subway: null, bikeSubway: null,
  };
  if (modes.includes("bike")) {
    const hasDockOrigin = findNearestDock(point, citiBikeStations, BIKE_DOCK_RANGE_MI);
    const hasDockDest = findNearestDock(destLoc, citiBikeStations, BIKE_DOCK_RANGE_MI);
    if (hasDockOrigin && hasDockDest) times.bike = bikeMin(point, destLoc);
  }
  if (modes.includes("subway")) {
    times.subway = computeSubwayTime(point, destLoc, stationGraph.stations, stationMatrix.times, idxMap);
  }
  if (modes.includes("bikeSubway")) {
    times.bikeSubway = computeBikeSubwayTime(point, destLoc, stationGraph.stations, stationMatrix.times, idxMap, citiBikeStations);
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
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { hexCenters, origin, destinations, modes, stationGraph, stationMatrix, citiBikeStations } = e.data;
  const idxMap = buildStationIdxMap(stationMatrix.stationIds);

  // Explore mode (no destinations, has origin): accessibility from origin
  if (destinations.length === 0 && origin) {
    const cells = hexCenters.map((hex) => {
      const point: LatLng = { lat: hex.lat, lng: hex.lng };
      const times = computeTimesForLocation(point, origin, modes, stationGraph, stationMatrix, idxMap, citiBikeStations);
      const { fastest, time } = getFastestTime(times);
      return {
        h3Index: hex.h3Index,
        times,
        fastest,
        compositeScore: time === Infinity ? 999 : Math.round(time * 10) / 10,
        destBreakdown: {} as Record<string, number>,
      };
    });
    self.postMessage({ cells });
    return;
  }

  // Score mode (with destinations): total monthly minutes per hex cell
  const cells = hexCenters.map((hex) => {
    const point: LatLng = { lat: hex.lat, lng: hex.lng };
    let totalMonthlyMinutes = 0;
    const aggTimes: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, subway: null, bikeSubway: null };
    const destBreakdown: Record<string, number> = {};

    for (const dest of destinations) {
      const destLocations = dest.locations && dest.locations.length > 0 ? dest.locations : [dest.location];
      let bestTime = Infinity;
      let bestTimes: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, subway: null, bikeSubway: null };

      for (const destLoc of destLocations) {
        const locTimes = computeTimesForLocation(point, destLoc, modes, stationGraph, stationMatrix, idxMap, citiBikeStations);
        const { time } = getFastestTime(locTimes);
        if (time < bestTime) { bestTime = time; bestTimes = locTimes; }
      }

      // Aggregate times (keep shortest per mode across all destinations)
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

    return {
      h3Index: hex.h3Index,
      times: aggTimes,
      fastest,
      compositeScore: totalMonthlyMinutes > 0 ? Math.round(totalMonthlyMinutes * 10) / 10 : 999,
      destBreakdown,
    };
  });

  self.postMessage({ cells });
};
