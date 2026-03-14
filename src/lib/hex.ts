import { polygonToCells, cellToLatLng, cellToBoundary } from "h3-js";
import type { BoundingBox, HexCell } from "./types";

interface HexCenterInfo {
  h3Index: string;
  center: { lat: number; lng: number };
  boundary: [number, number][]; // [lng, lat] for GeoJSON
}

/**
 * Generate H3 hex cell centers within a bounding box.
 * Returns cell IDs, centers, and polygon boundaries ready for Mapbox.
 */
export function generateHexCenters(bounds: BoundingBox, resolution: number): HexCenterInfo[] {
  // H3 polygonToCells expects [lat, lng] pairs
  const polygon = [
    [bounds.sw.lat, bounds.sw.lng],
    [bounds.sw.lat, bounds.ne.lng],
    [bounds.ne.lat, bounds.ne.lng],
    [bounds.ne.lat, bounds.sw.lng],
  ];

  const cellIds = polygonToCells(polygon, resolution, false);

  return cellIds.map((h3Index) => {
    const [lat, lng] = cellToLatLng(h3Index);
    // cellToBoundary returns [lat, lng][] — convert to [lng, lat][] for GeoJSON
    const rawBoundary = cellToBoundary(h3Index);
    const boundary: [number, number][] = rawBoundary.map(([bLat, bLng]) => [bLng, bLat]);

    return { h3Index, center: { lat, lng }, boundary };
  });
}

/**
 * Score mode (with destinations): hours/month coloring
 * 5 hrs/mo (green) -> 25 hrs/mo (yellow) -> 50+ hrs/mo (red)
 */
function hoursToColor(monthlyMinutes: number): string {
  const hours = monthlyMinutes / 60;
  const t = Math.min(Math.max(hours, 5), 50);
  const ratio = (t - 5) / 45;
  if (ratio < 0.4) {
    const r = Math.round((ratio / 0.4) * 255);
    return `rgba(${r}, 200, 50, 0.85)`;
  } else {
    const g = Math.round((1 - (ratio - 0.4) / 0.6) * 200);
    return `rgba(230, ${g}, 30, 0.85)`;
  }
}

/**
 * Accessibility mode (no destinations): time-based coloring
 * 5 min (green) -> 17 min (yellow) -> 40+ min (red)
 */
function timeToColor(minutes: number): string {
  const t = Math.min(Math.max(minutes, 5), 40);
  const ratio = (t - 5) / 35;
  if (ratio < 0.35) {
    const r = Math.round((ratio / 0.35) * 255);
    return `rgba(${r}, 200, 50, 0.85)`;
  } else {
    const g = Math.round((1 - (ratio - 0.35) / 0.65) * 200);
    return `rgba(230, ${g}, 30, 0.85)`;
  }
}

/**
 * Convert HexCells to a GeoJSON FeatureCollection for Mapbox fill layer.
 */
export function hexCellToGeoJSON(
  cells: HexCell[],
  hasDestinations: boolean = false
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = cells.map((cell) => {
    const color = hasDestinations
      ? hoursToColor(cell.compositeScore)
      : timeToColor(cell.compositeScore);

    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...cell.boundary, cell.boundary[0]]], // close the ring
      },
      properties: {
        h3Index: cell.h3Index,
        compositeScore: cell.compositeScore,
        color,
        fastest: cell.fastest,
        ...cell.times,
        destBreakdown: JSON.stringify(cell.destBreakdown),
      },
    };
  });

  return { type: "FeatureCollection", features };
}
