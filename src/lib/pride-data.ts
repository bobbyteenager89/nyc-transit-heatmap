import { latLngToCell } from "h3-js";
import type { StationGraph } from "./types";
import type { PrideTables } from "./pride-stats";

export async function loadPrideTables(): Promise<PrideTables> {
  const [population, pois, parks] = await Promise.all([
    fetch("/data/pride-population.json").then((r) => r.json()),
    fetch("/data/pride-pois.json").then((r) => r.json()),
    fetch("/data/pride-parks.json").then((r) => r.json()),
  ]);
  return { population, pois, parks };
}

/**
 * Map each station's res-10 cell -> the union of its lines. Multiple stations
 * (e.g. a complex) can share a res-10 cell; their lines merge. Resolution must
 * match HexCell.h3Index (res-10) so reachability lookups line up.
 */
export function buildStationLineIndex(graph: StationGraph): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const s of Object.values(graph.stations)) {
    const cell = latLngToCell(s.lat, s.lng, 10);
    const existing = idx.get(cell);
    if (existing) existing.push(...s.lines);
    else idx.set(cell, [...s.lines]);
  }
  return idx;
}
