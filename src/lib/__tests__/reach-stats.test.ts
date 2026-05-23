import { describe, it, expect } from "vitest";
import {
  CELL_AREA_MI2,
  reachableCellCount,
  unionReach,
  perModeReach,
  nearestStopWalkMinutes,
  nearestStopsForAllModes,
} from "../reach-stats";
import type { HexCell, TransportMode } from "../types";

const ALL_NULL: HexCell["times"] = {
  walk: null,
  subway: null,
  bus: null,
  ferry: null,
  bike: null,
  ownbike: null,
  car: null,
};

function makeCell(times: Partial<HexCell["times"]>): HexCell {
  return {
    h3Index: "x",
    center: { lat: 0, lng: 0 },
    boundary: [],
    times: { ...ALL_NULL, ...times },
    fastest: "walk",
    compositeScore: 0,
    destBreakdown: {},
  };
}

describe("CELL_AREA_MI2", () => {
  it("is derived from H3 res 10 (~0.0058 mi²)", () => {
    expect(CELL_AREA_MI2).toBeGreaterThan(0.005);
    expect(CELL_AREA_MI2).toBeLessThan(0.007);
  });
});

describe("reachableCellCount", () => {
  it("returns 0 for empty cells", () => {
    expect(reachableCellCount([], "subway", 30)).toBe(0);
  });

  it("counts cells where time <= maxMinutes", () => {
    const cells = [
      makeCell({ subway: 10 }),
      makeCell({ subway: 30 }),
      makeCell({ subway: 31 }),
      makeCell({ subway: null }),
    ];
    expect(reachableCellCount(cells, "subway", 30)).toBe(2);
  });

  it("ignores cells with null time for the mode", () => {
    const cells = [makeCell({ subway: null }), makeCell({ subway: undefined as unknown as null })];
    expect(reachableCellCount(cells, "subway", 60)).toBe(0);
  });

  it("does not bleed across modes", () => {
    const cells = [makeCell({ subway: 5, bus: 999 })];
    expect(reachableCellCount(cells, "subway", 30)).toBe(1);
    expect(reachableCellCount(cells, "bus", 30)).toBe(0);
  });
});

describe("unionReach", () => {
  it("dedupes cells reachable by multiple modes", () => {
    const cells = [
      makeCell({ subway: 10, bus: 15 }),
      makeCell({ subway: 10 }),
      makeCell({ bus: 15 }),
      makeCell({ subway: null, bus: null }),
    ];
    const u = unionReach(cells, ["subway", "bus"], 30);
    expect(u.count).toBe(3);
  });

  it("returns 0 when no modes are active", () => {
    const cells = [makeCell({ subway: 5 })];
    expect(unionReach(cells, [], 30)).toEqual({ count: 0, areaMi2: 0, pctOfGrid: 0 });
  });

  it("computes pctOfGrid relative to cells.length", () => {
    const cells = [
      makeCell({ subway: 5 }),
      makeCell({ subway: 5 }),
      makeCell({ subway: null }),
      makeCell({ subway: null }),
    ];
    const u = unionReach(cells, ["subway"], 30);
    expect(u.count).toBe(2);
    expect(u.pctOfGrid).toBe(50);
  });

  it("areaMi2 = count × CELL_AREA_MI2", () => {
    const cells = [makeCell({ subway: 5 }), makeCell({ subway: 5 })];
    const u = unionReach(cells, ["subway"], 30);
    expect(u.areaMi2).toBeCloseTo(2 * CELL_AREA_MI2, 6);
  });

  it("count is never greater than cells.length even with overlap", () => {
    const cells = [
      makeCell({ subway: 5, bus: 5, walk: 5 }),
      makeCell({ subway: 5, bus: 5, walk: 5 }),
    ];
    const u = unionReach(cells, ["subway", "bus", "walk"], 30);
    expect(u.count).toBe(2);
  });
});

describe("perModeReach", () => {
  it("excludes modes with zero reach", () => {
    const cells = [makeCell({ subway: 5, bus: null })];
    const result = perModeReach(cells, ["subway", "bus"], 30);
    expect(result.map((r) => r.mode)).toEqual(["subway"]);
  });

  it("sorts by count desc", () => {
    const cells = [
      makeCell({ subway: 5, bus: 5 }),
      makeCell({ subway: 5 }),
      makeCell({ subway: 5 }),
    ];
    const result = perModeReach(cells, ["bus", "subway"], 30);
    expect(result[0].mode).toBe("subway");
    expect(result[0].count).toBe(3);
    expect(result[1].mode).toBe("bus");
    expect(result[1].count).toBe(1);
  });

  it("pctOfGrid uses total cells, not just reachable", () => {
    const cells = [
      makeCell({ subway: 5 }),
      makeCell({ subway: 5 }),
      makeCell({ subway: null }),
      makeCell({ subway: null }),
    ];
    const [s] = perModeReach(cells, ["subway"], 30);
    expect(s.pctOfGrid).toBe(50);
  });

  it("handles empty cells without divide-by-zero", () => {
    expect(perModeReach([], ["subway"], 30)).toEqual([]);
  });

  it("handles empty active modes", () => {
    const cells = [makeCell({ subway: 5 })];
    expect(perModeReach(cells, [] as TransportMode[], 30)).toEqual([]);
  });
});

describe("nearestStopWalkMinutes", () => {
  const origin = { lat: 40.758, lng: -73.985 };

  it("returns null when no stations", () => {
    expect(nearestStopWalkMinutes(origin, [])).toBeNull();
  });

  it("picks the closest station", () => {
    const stations = [
      { lat: 40.758, lng: -73.99 },
      { lat: 40.758, lng: -73.985 },
      { lat: 40.8, lng: -73.985 },
    ];
    const t = nearestStopWalkMinutes(origin, stations);
    expect(t).not.toBeNull();
    expect(t!).toBeLessThan(0.5);
  });

  it("returns positive minutes for a single far station", () => {
    const t = nearestStopWalkMinutes(origin, [{ lat: 40.8, lng: -73.985 }]);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThan(10);
  });
});

describe("nearestStopsForAllModes", () => {
  it("returns null for modes with no stations", () => {
    const result = nearestStopsForAllModes(
      { lat: 40.758, lng: -73.985 },
      { subwayStations: [], busStops: [], ferryTerminals: [], citiBikeStations: [] },
    );
    expect(result).toEqual({ subway: null, bus: null, ferry: null, bike: null });
  });

  it("returns walk times for modes that have stations", () => {
    const origin = { lat: 40.758, lng: -73.985 };
    const result = nearestStopsForAllModes(origin, {
      subwayStations: [{ lat: 40.758, lng: -73.99 }],
      busStops: [],
      ferryTerminals: [{ id: "f", name: "F", lat: 40.7, lng: -74.0, routes: [] }],
      citiBikeStations: [{ id: "c", name: "C", lat: 40.759, lng: -73.985, capacity: 20 }],
    });
    expect(result.subway).not.toBeNull();
    expect(result.bus).toBeNull();
    expect(result.ferry).not.toBeNull();
    expect(result.bike).not.toBeNull();
  });
});
