import { cellToParent } from "h3-js";
import type { HexCell, TransportMode } from "./types";
import { sortLines } from "./subway-lines";

// Tables are keyed at res-9; cell.h3Index is res-10. Station index is res-10.
const PRIDE_RES = 9;

export interface PrideTables {
  population: Record<string, number>;
  pois: Record<string, [number, number, number]>; // [restaurants, cafes, bars]
  parks: Record<string, number[]>; // parkId lists per cell
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

/**
 * Aggregate pride stats over the union-reachable area (any active mode within
 * maxMinutes), summing res-9 tables and unioning subway lines from reachable
 * stations. Pure + cheap so it can run in a useMemo on every slider tick.
 *
 * @param stationLineIndex res-10 h3 of a station -> its line ids
 */
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
      if (isReachable(c.times[m], maxMinutes)) {
        reachable = true;
        break;
      }
    }
    if (!reachable) continue;
    reachableParents.add(cellToParent(c.h3Index, PRIDE_RES));
    if (subwayActive && isReachable(c.times.subway, maxMinutes)) {
      subwayReachableRes10.add(c.h3Index);
    }
  }

  let population = 0;
  let restaurants = 0;
  let cafes = 0;
  let bars = 0;
  const parkIds = new Set<number>();
  for (const p of reachableParents) {
    population += tables.population[p] ?? 0;
    const poi = tables.pois[p];
    if (poi) {
      restaurants += poi[0];
      cafes += poi[1];
      bars += poi[2];
    }
    const pk = tables.parks[p];
    if (pk) for (const id of pk) parkIds.add(id);
  }

  const lines: string[] = [];
  if (subwayActive) {
    for (const h3 of subwayReachableRes10) {
      const ls = stationLineIndex.get(h3);
      if (ls) lines.push(...ls);
    }
  }

  return {
    population,
    restaurants,
    cafes,
    bars,
    parks: parkIds.size,
    lines: sortLines(lines),
  };
}
