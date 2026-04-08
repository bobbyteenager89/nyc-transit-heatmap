import type { HexCell, TransportMode } from "./types";

/**
 * Count hex cells reachable by BOTH person A and person B within maxMinutes
 * using the fastest of the active modes for each person.
 */
export function countOverlapCells(
  cellsA: HexCell[],
  cellsB: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number
): number {
  if (cellsA.length === 0 || cellsB.length === 0) return 0;

  const bSet = new Set<string>();
  for (const cell of cellsB) {
    let fastest = Infinity;
    for (const mode of activeModes) {
      const t = cell.times[mode];
      if (t !== null && t !== undefined && t < fastest) fastest = t;
    }
    if (fastest <= maxMinutes) bSet.add(cell.h3Index);
  }

  let count = 0;
  for (const cell of cellsA) {
    if (!bSet.has(cell.h3Index)) continue;
    let fastest = Infinity;
    for (const mode of activeModes) {
      const t = cell.times[mode];
      if (t !== null && t !== undefined && t < fastest) fastest = t;
    }
    if (fastest <= maxMinutes) count++;
  }

  return count;
}
