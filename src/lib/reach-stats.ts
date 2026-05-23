import { getHexagonAreaAvg } from "h3-js";
import type { HexCell, LatLng, TransportMode, CitiBikeStation } from "./types";
import type { BusStop } from "./bus";
import type { FerryTerminal } from "./ferry";
import { walkTime } from "./travel-time";
import { H3_RESOLUTION } from "./constants";

const KM2_TO_MI2 = 0.3861021585424458;

export const CELL_AREA_MI2 = getHexagonAreaAvg(H3_RESOLUTION, "km2") * KM2_TO_MI2;

export interface PerModeReach {
  mode: TransportMode;
  count: number;
  areaMi2: number;
  pctOfGrid: number;
}

export interface UnionReach {
  count: number;
  areaMi2: number;
  pctOfGrid: number;
}

function isReachable(t: number | null | undefined, maxMinutes: number): boolean {
  return t !== null && t !== undefined && t <= maxMinutes;
}

export function reachableCellCount(
  cells: HexCell[],
  mode: TransportMode,
  maxMinutes: number,
): number {
  let count = 0;
  for (const c of cells) {
    if (isReachable(c.times[mode], maxMinutes)) count++;
  }
  return count;
}

export function unionReach(
  cells: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number,
): UnionReach {
  if (activeModes.length === 0) {
    return { count: 0, areaMi2: 0, pctOfGrid: 0 };
  }
  let count = 0;
  for (const c of cells) {
    for (const mode of activeModes) {
      if (isReachable(c.times[mode], maxMinutes)) {
        count++;
        break;
      }
    }
  }
  const totalCells = cells.length;
  return {
    count,
    areaMi2: count * CELL_AREA_MI2,
    pctOfGrid: totalCells > 0 ? (count / totalCells) * 100 : 0,
  };
}

export function perModeReach(
  cells: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number,
): PerModeReach[] {
  const totalCells = cells.length;
  const result: PerModeReach[] = [];
  for (const mode of activeModes) {
    const count = reachableCellCount(cells, mode, maxMinutes);
    if (count === 0) continue;
    result.push({
      mode,
      count,
      areaMi2: count * CELL_AREA_MI2,
      pctOfGrid: totalCells > 0 ? (count / totalCells) * 100 : 0,
    });
  }
  result.sort((a, b) => b.count - a.count);
  return result;
}

export type NearestStopMode = "subway" | "bus" | "ferry" | "bike";

export type NearestStops = Record<NearestStopMode, number | null>;

interface NearestStopsInput {
  subwayStations: { lat: number; lng: number }[];
  busStops: BusStop[];
  ferryTerminals: FerryTerminal[];
  citiBikeStations: CitiBikeStation[];
}

export function nearestStopWalkMinutes(
  origin: LatLng,
  stations: { lat: number; lng: number }[],
): number | null {
  if (stations.length === 0) return null;
  let min = Infinity;
  for (const s of stations) {
    const t = walkTime(origin, { lat: s.lat, lng: s.lng });
    if (t < min) min = t;
  }
  return Number.isFinite(min) ? min : null;
}

export function nearestStopsForAllModes(
  origin: LatLng,
  data: NearestStopsInput,
): NearestStops {
  return {
    subway: nearestStopWalkMinutes(origin, data.subwayStations),
    bus: nearestStopWalkMinutes(origin, data.busStops),
    ferry: nearestStopWalkMinutes(origin, data.ferryTerminals),
    bike: nearestStopWalkMinutes(origin, data.citiBikeStations),
  };
}
