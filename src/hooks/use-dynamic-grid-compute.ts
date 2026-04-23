"use client";

import { useCallback, useState } from "react";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import type { IsochroneContour } from "@/lib/mapbox-isochrone";
import {
  CORE_NYC_BOUNDS,
  H3_RESOLUTION,
  BOUNDS_EXPANSION_STEP,
  MAX_NYC_BOUNDS,
} from "@/lib/constants";
import type {
  LatLng,
  TransportMode,
  HexCell,
  StationGraph,
  StationMatrix,
  Destination,
  BoundingBox,
} from "@/lib/types";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import type { BusData } from "@/lib/bus";

const ALL_MODES: TransportMode[] = ["subway", "bus", "walk", "car", "bike", "ownbike", "ferry"];

/**
 * Detect whether the reach envelope hit a border of the current grid and,
 * if so, return expanded bounds. Returns null if the envelope is entirely
 * inside the grid or if expansion would exceed MAX_NYC_BOUNDS.
 *
 * "Border hit" = at least one cell within ~one-hex-edge of an outer edge
 * has a fastestTime <= maxMinutes. We then grow the hit side(s) by
 * BOUNDS_EXPANSION_STEP, clamped to MAX_NYC_BOUNDS.
 */
export function expandBoundsIfHit(
  bounds: BoundingBox,
  cells: HexCell[],
  maxMinutes: number
): BoundingBox | null {
  if (cells.length === 0) return null;
  const EDGE_PAD = 0.005; // ~500m — roughly one res-10 hex ring worth
  let hitN = false, hitS = false, hitE = false, hitW = false;
  for (const cell of cells) {
    if (cell.compositeScore >= 999 || cell.compositeScore > maxMinutes) continue;
    const { lat, lng } = cell.center;
    if (lat >= bounds.ne.lat - EDGE_PAD) hitN = true;
    if (lat <= bounds.sw.lat + EDGE_PAD) hitS = true;
    if (lng >= bounds.ne.lng - EDGE_PAD) hitE = true;
    if (lng <= bounds.sw.lng + EDGE_PAD) hitW = true;
    if (hitN && hitS && hitE && hitW) break;
  }
  if (!hitN && !hitS && !hitE && !hitW) return null;

  const expanded: BoundingBox = {
    sw: {
      lat: hitS ? Math.max(bounds.sw.lat - BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.sw.lat) : bounds.sw.lat,
      lng: hitW ? Math.max(bounds.sw.lng - BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.sw.lng) : bounds.sw.lng,
    },
    ne: {
      lat: hitN ? Math.min(bounds.ne.lat + BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.ne.lat) : bounds.ne.lat,
      lng: hitE ? Math.min(bounds.ne.lng + BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.ne.lng) : bounds.ne.lng,
    },
  };
  if (
    expanded.sw.lat === bounds.sw.lat && expanded.sw.lng === bounds.sw.lng &&
    expanded.ne.lat === bounds.ne.lat && expanded.ne.lng === bounds.ne.lng
  ) {
    return null;
  }
  return expanded;
}

interface UseDynamicGridComputeArgs {
  stationGraph: StationGraph | null;
  stationMatrix: StationMatrix | null;
  citiBikeData: CitiBikeData | null;
  ferryData: { data: FerryData; adjacency: FerryAdjacency } | null;
  busData: BusData | null;
  destinations: Destination[];
  maxMinutes: number;
}

export interface DynamicGridCompute {
  cells: HexCell[];
  setCells: (cells: HexCell[]) => void;
  apiContours: IsochroneContour[];
  setApiContours: (contours: IsochroneContour[]) => void;
  gridBounds: BoundingBox;
  setGridBounds: (bounds: BoundingBox) => void;
  computing: boolean;
  expanding: boolean;
  computeProgress: number;
  runCompute: (loc: LatLng) => Promise<void>;
}

/**
 * Owns the hex-grid compute pipeline for the primary origin:
 *   1. Compute hexes for current bounds + API isochrones in parallel.
 *   2. If the reach envelope touches the grid border, expand the bounds
 *      and recompute (max 2 extra passes per origin).
 *
 * Returns the state (cells, contours, bounds, progress) plus the runCompute
 * callback. Setters are exposed for tests and flows like friend compute.
 */
export function useDynamicGridCompute(args: UseDynamicGridComputeArgs): DynamicGridCompute {
  const {
    stationGraph,
    stationMatrix,
    citiBikeData,
    ferryData,
    busData,
    destinations,
    maxMinutes,
  } = args;

  const [cells, setCells] = useState<HexCell[]>([]);
  const [apiContours, setApiContours] = useState<IsochroneContour[]>([]);
  const [gridBounds, setGridBounds] = useState<BoundingBox>(CORE_NYC_BOUNDS);
  const [computing, setComputing] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);

  const runCompute = useCallback(
    async (loc: LatLng) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData || !busData) return;

      setComputing(true);
      setComputeProgress(0);
      setGridBounds(CORE_NYC_BOUNDS);
      try {
        const computeForBounds = async (
          bounds: BoundingBox,
          onProgress?: (n: number) => void
        ) => {
          const rawCenters = generateHexCenters(bounds, H3_RESOLUTION);
          const hexCenters = rawCenters.map((c) => ({
            h3Index: c.h3Index,
            lat: c.center.lat,
            lng: c.center.lng,
          }));
          const result = await computeHexGrid(
            {
              hexCenters,
              origin: loc,
              destinations,
              modes: ALL_MODES,
              stationGraph,
              stationMatrix,
              citiBikeStations: citiBikeData.getAllStations(),
              ferryTerminals: ferryData.data.terminals,
              ferryAdjacency: ferryData.adjacency,
              busStops: busData.stops,
            },
            onProgress ?? (() => {})
          );
          const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
          return result.cells.map((cell) => {
            const geo = geoLookup.get(cell.h3Index)!;
            return { ...cell, center: geo.center, boundary: geo.boundary };
          });
        };

        const currentBounds = CORE_NYC_BOUNDS;
        const hexResult = await computeForBounds(currentBounds, (p) => setComputeProgress(p));
        setCells(hexResult);
        setApiContours([]);

        // Border-hit detection + auto-expansion. Limited to 2 extra passes.
        let attempts = 0;
        let workingCells = hexResult;
        let workingBounds = currentBounds;
        while (attempts < 2) {
          const expanded = expandBoundsIfHit(workingBounds, workingCells, maxMinutes);
          if (!expanded) break;
          attempts++;
          setExpanding(true);
          try {
            workingCells = await computeForBounds(expanded, (p) => setComputeProgress(p));
            workingBounds = expanded;
            setCells(workingCells);
            setGridBounds(expanded);
          } finally {
            setExpanding(false);
          }
        }
      } catch (err) {
        console.error("Compute failed:", err);
      } finally {
        setComputing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stationGraph, stationMatrix, citiBikeData, ferryData, busData, destinations, maxMinutes]
  );

  return {
    cells,
    setCells,
    apiContours,
    setApiContours,
    gridBounds,
    setGridBounds,
    computing,
    expanding,
    computeProgress,
    runCompute,
  };
}
