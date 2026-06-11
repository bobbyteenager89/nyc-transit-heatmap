import { describe, it, expect } from "vitest";
import { computePrideStats, precomputeCellParents, type PrideTables } from "./pride-stats";
import { cellToParent, cellToLatLng, latLngToCell } from "h3-js";
import type { HexCell, TransportMode } from "./types";

function cellAt(h3Index: string, subwayMin: number | null): HexCell {
  const [lat, lng] = cellToLatLng(h3Index);
  return {
    h3Index,
    center: { lat, lng },
    boundary: [],
    times: { walk: null, car: null, bike: null, ownbike: null, subway: subwayMin, bus: null, ferry: null },
    fastest: "subway",
    compositeScore: 0,
    destBreakdown: {},
  };
}

const emptyTables: PrideTables = { population: {}, pois: {}, parks: {} };

describe("computePrideStats", () => {
  it("sums population + pois and unions parks over reachable res-9 parents", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const res9 = cellToParent(res10, 9);
    const tables: PrideTables = {
      population: { [res9]: 5000 },
      pois: { [res9]: [40, 8, 6] },
      parks: { [res9]: [1, 2] },
    };
    const stats = computePrideStats([cellAt(res10, 10)], ["subway"], 30, tables, new Map());
    expect(stats.population).toBe(5000);
    expect(stats.restaurants).toBe(40);
    expect(stats.cafes).toBe(8);
    expect(stats.bars).toBe(6);
    expect(stats.parks).toBe(2);
  });

  it("excludes cells beyond maxMinutes", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const res9 = cellToParent(res10, 9);
    const tables: PrideTables = { population: { [res9]: 5000 }, pois: {}, parks: {} };
    expect(computePrideStats([cellAt(res10, 45)], ["subway"], 30, tables, new Map()).population).toBe(0);
  });

  it("dedupes res-9 parents so sibling cells count once", () => {
    const a = latLngToCell(40.73, -73.99, 10);
    const res9 = cellToParent(a, 9);
    const tables: PrideTables = { population: { [res9]: 5000 }, pois: {}, parks: {} };
    expect(computePrideStats([cellAt(a, 5), cellAt(a, 6)], ["subway"], 30, tables, new Map()).population).toBe(5000);
  });

  it("collects distinct, sorted subway lines from walk-reachable stations", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const stationLineIndex = new Map<string, string[]>([[res10, ["F", "M", "F"]]]);
    const cell = cellAt(res10, 12);
    cell.times.walk = 10; // within 15-min walk cutoff
    const stats = computePrideStats([cell], ["subway"], 30, emptyTables, stationLineIndex);
    expect(stats.lines).toEqual(["F", "M"]);
  });

  it("precomputed cellParents path matches the inline path exactly", () => {
    const a = latLngToCell(40.73, -73.99, 10);
    const b = latLngToCell(40.75, -73.97, 10);
    const tables: PrideTables = {
      population: { [cellToParent(a, 9)]: 5000, [cellToParent(b, 9)]: 1200 },
      pois: { [cellToParent(a, 9)]: [40, 8, 6] },
      parks: { [cellToParent(b, 9)]: [7] },
    };
    const cells = [cellAt(a, 10), cellAt(b, 25)];
    const inline = computePrideStats(cells, ["subway"], 30, tables, new Map());
    const parents = precomputeCellParents(cells);
    const fast = computePrideStats(cells, ["subway"], 30, tables, new Map(), parents);
    expect(parents).toEqual([cellToParent(a, 9), cellToParent(b, 9)]);
    expect(fast).toEqual(inline);
  });

  it("includes lines walkable in 15 min regardless of active modes", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const stationLineIndex = new Map<string, string[]>([[res10, ["F", "M"]]]);
    const cell = cellAt(res10, null);
    cell.times.walk = 5; // within 15-min walk cutoff
    const stats = computePrideStats([cell], ["walk"], 30, emptyTables, stationLineIndex);
    expect(stats.lines).toEqual(["F", "M"]);
  });

  it("omits lines when walk time exceeds 15-min cutoff", () => {
    const res10 = latLngToCell(40.73, -73.99, 10);
    const stationLineIndex = new Map<string, string[]>([[res10, ["F", "M"]]]);
    const cell = cellAt(res10, null);
    cell.times.walk = 20; // beyond 15-min walk cutoff
    const stats = computePrideStats([cell], ["walk"], 30, emptyTables, stationLineIndex);
    expect(stats.lines).toEqual([]);
  });
});
