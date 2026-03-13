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

interface WorkerBatchInput {
  bounds: BoundingBox;
  destinations: Destination[];
  modes: TransportMode[];
  stationGraph: StationGraph;
  stationMatrix: StationMatrix;
  citiBikeStations: CitiBikeStation[];
}

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

self.onmessage = (e: MessageEvent<WorkerBatchInput>) => {
  const { bounds, destinations, modes, stationGraph, stationMatrix, citiBikeStations } = e.data;

  const idxMap = buildStationIdxMap(stationMatrix.stationIds);

  const points: LatLng[] = [];
  const latSteps = Math.round((bounds.ne.lat - bounds.sw.lat) / GRID_SPACING_DEG);
  const lngSteps = Math.round((bounds.ne.lng - bounds.sw.lng) / GRID_SPACING_DEG);
  for (let i = 0; i <= latSteps; i++) {
    for (let j = 0; j <= lngSteps; j++) {
      points.push({
        lat: Math.round((bounds.sw.lat + i * GRID_SPACING_DEG) * 10000) / 10000,
        lng: Math.round((bounds.sw.lng + j * GRID_SPACING_DEG) * 10000) / 10000,
      });
    }
  }

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

  const compositeGrid: CompositeGridPoint[] = points.map((point, i) => {
    let weightedSum = 0;
    let freqSum = 0;
    const times: Record<TransportMode, number | null> = { walk: null, car: null, bike: null, subway: null, bikeSubway: null };

    for (const dest of destinations) {
      const destGrid = destGrids.get(dest.id)!;
      const gp = destGrid[i];

      let bestTime = Infinity;
      for (const [mode, t] of Object.entries(gp.times)) {
        if (t !== null && t < bestTime) bestTime = t;
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
