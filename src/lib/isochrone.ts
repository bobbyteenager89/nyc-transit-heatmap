import { cellsToMultiPolygon } from "h3-js";
import type { TransportMode, HexCell, IsochroneBand, IsochroneLayer } from "./types";

/** Time band breakpoints in minutes: [min, max) */
export const TIME_BANDS: [number, number][] = [
  [0, 5],
  [5, 10],
  [10, 15],
  [15, 20],
  [20, 30],
  [30, 45],
  [45, 60],
];

/** Per-mode colors for dark map rendering */
export const MODE_COLORS: Record<TransportMode, string> = {
  walk: "#ffbe0b",
  bike: "#06d6a0",
  subway: "#118ab2",
  car: "#9b5de5",
  bikeSubway: "#0ead69",
  ferry: "#00b4d8",
};

/**
 * Group hex cell H3 indexes by "mode:min-max" keys.
 * Each cell is placed in the band matching its travel time for that mode.
 */
export function groupCellsByModeBand(
  cells: HexCell[],
  modes: TransportMode[]
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const cell of cells) {
    for (const mode of modes) {
      const time = cell.times[mode];
      if (time === null || time === undefined) continue;

      for (const [min, max] of TIME_BANDS) {
        if (time >= min && time < max) {
          const key = `${mode}:${min}-${max}`;
          let arr = groups.get(key);
          if (!arr) {
            arr = [];
            groups.set(key, arr);
          }
          arr.push(cell.h3Index);
          break;
        }
      }
    }
  }

  return groups;
}

/**
 * Generate dissolved contour polygon layers for each mode.
 * Each layer contains cumulative bands up to maxMinutes.
 * Bands are cumulative: the 10-min band includes all cells reachable in 0-10 min.
 */
export function generateIsochroneLayers(
  cells: HexCell[],
  modes: TransportMode[],
  maxMinutes: number
): IsochroneLayer[] {
  const groups = groupCellsByModeBand(cells, modes);

  return modes.map((mode) => {
    const bands: IsochroneBand[] = [];
    let cumulativeCells: string[] = [];

    for (const [min, max] of TIME_BANDS) {
      if (max > maxMinutes) break;

      const bandKey = `${mode}:${min}-${max}`;
      const bandCells = groups.get(bandKey) ?? [];
      cumulativeCells = [...cumulativeCells, ...bandCells];

      if (cumulativeCells.length === 0) continue;

      const multiPoly = cellsToMultiPolygon(cumulativeCells, true);

      const feature: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: multiPoly,
        },
        properties: {
          mode,
          minMinutes: 0,
          maxMinutes: max,
        },
      };

      bands.push({
        mode,
        minMinutes: 0,
        maxMinutes: max,
        polygon: feature,
      });
    }

    return {
      mode,
      color: MODE_COLORS[mode],
      bands,
    };
  });
}
