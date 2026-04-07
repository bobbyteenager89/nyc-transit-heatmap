import { describe, it, expect } from "vitest";
import { countOverlapCells } from "../meetup-overlap";
import type { HexCell, TransportMode } from "../types";

function makeCell(h3Index: string, times: Partial<Record<TransportMode, number | null>>): HexCell {
  return {
    h3Index,
    center: { lat: 40.73, lng: -73.99 },
    boundary: [[-73.99, 40.73], [-73.989, 40.73], [-73.989, 40.731], [-73.99, 40.731]],
    times: {
      walk: null,
      bike: null,
      subway: null,
      car: null,
      ferry: null,
      bus: null,
      ...times,
    } as Record<TransportMode, number | null>,
    fastest: "walk",
    compositeScore: 0,
    destBreakdown: {},
  };
}

describe("countOverlapCells", () => {
  it("returns 0 when either cell set is empty", () => {
    const cells = [makeCell("abc", { walk: 5 })];
    expect(countOverlapCells([], cells, ["walk"], 30)).toBe(0);
    expect(countOverlapCells(cells, [], ["walk"], 30)).toBe(0);
  });

  it("counts cells reachable by both within maxMinutes", () => {
    const cellsA = [
      makeCell("hex1", { walk: 5 }),
      makeCell("hex2", { walk: 10 }),
      makeCell("hex3", { walk: 40 }), // A can't reach within 30 min
    ];
    const cellsB = [
      makeCell("hex1", { walk: 8 }),
      makeCell("hex2", { walk: 35 }), // B can't reach within 30 min
      makeCell("hex4", { walk: 6 }),  // A doesn't have this cell
    ];
    expect(countOverlapCells(cellsA, cellsB, ["walk"], 30)).toBe(1); // only hex1
  });

  it("uses fastest mode across active modes", () => {
    const cellsA = [makeCell("hex1", { walk: 40, subway: 10 })];
    const cellsB = [makeCell("hex1", { walk: 40, subway: 15 })];
    // Both reachable by subway within 30 min
    expect(countOverlapCells(cellsA, cellsB, ["walk", "subway"], 30)).toBe(1);
    // Only walk active — neither reaches within 30 min
    expect(countOverlapCells(cellsA, cellsB, ["walk"], 30)).toBe(0);
  });

  it("returns 0 when no shared cells exist", () => {
    const cellsA = [makeCell("hexA", { walk: 5 })];
    const cellsB = [makeCell("hexB", { walk: 5 })];
    expect(countOverlapCells(cellsA, cellsB, ["walk"], 30)).toBe(0);
  });

  it("handles null times gracefully", () => {
    const cellsA = [makeCell("hex1", { walk: null, subway: 15 })];
    const cellsB = [makeCell("hex1", { walk: null, subway: 20 })];
    expect(countOverlapCells(cellsA, cellsB, ["subway"], 30)).toBe(1);
  });
});
