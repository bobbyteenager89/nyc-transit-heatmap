"use client";

import { useEffect } from "react";
import mapboxgl from "mapbox-gl";
import type { HexCell, TransportMode } from "@/lib/types";

/**
 * Build GeoJSON for the fairness zone — cells where both people can reach.
 * Includes ALL cells reachable by both (no fairnessRange filter here).
 * Visibility is controlled via GL setFilter on the slider side.
 * Colored by how "fair" the spot is: green = equal, fading as diff increases.
 */
function buildFairnessGeoJSON(
  cellsA: HexCell[],
  cellsB: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number
): GeoJSON.FeatureCollection {
  if (cellsA.length === 0 || cellsB.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const bLookup = new Map<string, HexCell>();
  for (const cell of cellsB) {
    bLookup.set(cell.h3Index, cell);
  }

  const features: GeoJSON.Feature[] = [];

  for (const cellA of cellsA) {
    const cellB = bLookup.get(cellA.h3Index);
    if (!cellB) continue;

    let fastA = Infinity;
    let fastB = Infinity;
    for (const mode of activeModes) {
      const tA = cellA.times[mode];
      const tB = cellB.times[mode];
      if (tA !== null && tA !== undefined && tA < fastA) fastA = tA;
      if (tB !== null && tB !== undefined && tB < fastB) fastB = tB;
    }

    if (fastA > maxMinutes || fastB > maxMinutes) continue;
    if (fastA === Infinity || fastB === Infinity) continue;

    const diff = Math.abs(fastA - fastB);
    const ratio = Math.min(diff / 60, 1);

    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...cellA.boundary, cellA.boundary[0]]],
      },
      properties: {
        diff: Math.round(diff * 10) / 10,
        ratio,
        timeA: Math.round(fastA),
        timeB: Math.round(fastB),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

interface UseFairnessLayerArgs {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  mapReady: boolean;
  cells: HexCell[];
  friendCells: HexCell[];
  activeModes: TransportMode[];
  maxMinutes: number;
  fairnessRange: number;
}

/**
 * Keeps the fairness-zone source in sync with the two origins' cells, and
 * filters it client-side (GL) by the fairness range slider. Layer setup
 * stays in the parent's map-init effect so fairness stays beneath iso-hexes.
 */
export function useFairnessLayer({
  mapRef,
  mapReady,
  cells,
  friendCells,
  activeModes,
  maxMinutes,
  fairnessRange,
}: UseFairnessLayerArgs) {
  // Rebuild fairness GeoJSON when inputs change.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    const source = m.getSource("fairness-zone") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    if (friendCells.length === 0 || cells.length === 0) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const geojson = buildFairnessGeoJSON(cells, friendCells, activeModes, maxMinutes);
    source.setData(geojson);
  }, [mapRef, mapReady, cells, friendCells, activeModes, maxMinutes]);

  // GL-side filter by fairness range — no JS iteration on slider tick.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    if (m.getLayer("fairness-fill")) {
      m.setFilter("fairness-fill", ["<=", ["get", "diff"], fairnessRange]);
    }
    if (m.getLayer("fairness-line")) {
      m.setFilter("fairness-line", ["<=", ["get", "diff"], fairnessRange]);
    }
  }, [mapRef, mapReady, fairnessRange]);
}
