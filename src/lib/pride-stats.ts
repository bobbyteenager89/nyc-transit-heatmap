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
 * Precompute each cell's res-9 parent once, parallel to `cells`. The h3
 * `cellToParent` call is a WASM-boundary hop (~0.5µs each, ~75ms over a 150k
 * grid) — far too expensive to run on every slider tick. Memoize this on
 * `cells` alone and feed it to computePrideStats so per-tick work is just Set
 * adds + table lookups (~7ms vs ~71ms). See bench in the S39 perf fix.
 */
export function precomputeCellParents(cells: HexCell[]): string[] {
  const out = new Array<string>(cells.length);
  for (let i = 0; i < cells.length; i++) {
    out[i] = cellToParent(cells[i].h3Index, PRIDE_RES);
  }
  return out;
}

/**
 * Aggregate pride stats over the union-reachable area (any active mode within
 * maxMinutes), summing res-9 tables and unioning subway lines from reachable
 * stations.
 *
 * @param stationLineIndex res-10 h3 of a station -> its line ids
 * @param cellParents optional precomputed res-9 parents (parallel to `cells`).
 *   When provided, skips the per-tick `cellToParent` calls — pass this on the
 *   hot path. Falls back to computing inline when omitted (e.g. in tests).
 */
const WALK_LINES_CUTOFF = 15;

export function computePrideStats(
  cells: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number,
  tables: PrideTables,
  stationLineIndex: Map<string, string[]>,
  cellParents?: string[],
): PrideStats {
  const reachableParents = new Set<string>();
  const walkReachableRes10 = new Set<string>();

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    let reachable = false;
    for (const m of activeModes) {
      if (isReachable(c.times[m], maxMinutes)) {
        reachable = true;
        break;
      }
    }
    if (reachable) {
      reachableParents.add(cellParents ? cellParents[i] : cellToParent(c.h3Index, PRIDE_RES));
    }
    // Walk-reachable lines: always computed, independent of active modes + slider
    if (isReachable(c.times.walk, WALK_LINES_CUTOFF)) {
      walkReachableRes10.add(c.h3Index);
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
  for (const h3 of walkReachableRes10) {
    const ls = stationLineIndex.get(h3);
    if (ls) lines.push(...ls);
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
