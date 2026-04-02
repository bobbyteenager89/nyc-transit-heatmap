import { describe, it, expect } from "vitest";
import { groupCellsByModeBand, generateIsochroneLayers, TIME_BANDS, MODE_COLORS } from "../isochrone";
import type { HexCell, TransportMode } from "../types";

function makeCell(h3Index: string, times: Partial<Record<TransportMode, number | null>>): HexCell {
  const full: Record<TransportMode, number | null> = {
    walk: null, bike: null, subway: null, car: null, ferry: null,
    ...times,
  };
  return {
    h3Index,
    center: { lat: 40.73, lng: -73.99 },
    boundary: [[-73.99, 40.73], [-73.989, 40.73], [-73.989, 40.731], [-73.99, 40.731]],
    times: full,
    fastest: "walk",
    compositeScore: 10,
    destBreakdown: {},
  };
}

describe("groupCellsByModeBand", () => {
  it("groups cells into correct time bands per mode", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 3, subway: 12 }),
      makeCell("8a2a1072b5bffff", { walk: 8, subway: 7 }),
      makeCell("8a2a1072b5dffff", { walk: 18, subway: 25 }),
    ];

    const groups = groupCellsByModeBand(cells, ["walk", "subway"]);

    expect(groups.get("walk:0-5")).toEqual(["8a2a1072b59ffff"]);
    expect(groups.get("walk:5-10")).toEqual(["8a2a1072b5bffff"]);
    expect(groups.get("walk:15-20")).toEqual(["8a2a1072b5dffff"]);

    expect(groups.get("subway:10-15")).toEqual(["8a2a1072b59ffff"]);
    expect(groups.get("subway:5-10")).toEqual(["8a2a1072b5bffff"]);
    expect(groups.get("subway:20-30")).toEqual(["8a2a1072b5dffff"]);
  });

  it("skips cells with null time for a mode", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 5, subway: null }),
    ];
    const groups = groupCellsByModeBand(cells, ["walk", "subway"]);
    expect(groups.has("subway:0-5")).toBe(false);
    expect(groups.get("walk:5-10")).toEqual(["8a2a1072b59ffff"]);
  });

  it("handles cells beyond 60 min by not placing them", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 75 }),
    ];
    const groups = groupCellsByModeBand(cells, ["walk"]);
    expect(groups.size).toBe(0);
  });
});

describe("generateIsochroneLayers", () => {
  it("produces layers with correct mode colors", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 3 }),
    ];
    const layers = generateIsochroneLayers(cells, ["walk"], 30);
    expect(layers).toHaveLength(1);
    expect(layers[0].mode).toBe("walk");
    expect(layers[0].color).toBe(MODE_COLORS.walk);
    expect(layers[0].bands.length).toBeGreaterThan(0);
  });

  it("filters bands by maxMinutes", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: 3 }),
      makeCell("8a2a1072b5bffff", { walk: 25 }),
    ];
    const layers10 = generateIsochroneLayers(cells, ["walk"], 10);
    const layers30 = generateIsochroneLayers(cells, ["walk"], 30);
    const totalBands10 = layers10[0].bands.length;
    const totalBands30 = layers30[0].bands.length;
    expect(totalBands30).toBeGreaterThan(totalBands10);
  });

  it("returns empty bands for modes with no reachable cells", () => {
    const cells: HexCell[] = [
      makeCell("8a2a1072b59ffff", { walk: null }),
    ];
    const layers = generateIsochroneLayers(cells, ["walk"], 30);
    expect(layers[0].bands).toHaveLength(0);
  });
});

describe("TIME_BANDS", () => {
  it("has contiguous non-overlapping ranges", () => {
    for (let i = 1; i < TIME_BANDS.length; i++) {
      expect(TIME_BANDS[i][0]).toBe(TIME_BANDS[i - 1][1]);
    }
  });

  it("starts at 0 and ends at 60", () => {
    expect(TIME_BANDS[0][0]).toBe(0);
    expect(TIME_BANDS[TIME_BANDS.length - 1][1]).toBe(60);
  });
});
