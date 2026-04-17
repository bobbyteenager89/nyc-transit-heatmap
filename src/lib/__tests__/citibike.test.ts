import { describe, it, expect } from "vitest";
import { CitiBikeData } from "../citibike";
import type { CitiBikeStation } from "../types";

const makeStation = (id: string, lat: number, lng: number): CitiBikeStation => ({
  id,
  name: `Station ${id}`,
  lat,
  lng,
  capacity: 20,
});

describe("CitiBikeData.findNearestDock", () => {
  it("returns the closest station within range", () => {
    const data = new CitiBikeData([
      makeStation("far", 40.75, -73.95),
      makeStation("close", 40.7005, -74.0),
      makeStation("medium", 40.71, -74.0),
    ]);
    const near = data.findNearestDock({ lat: 40.7, lng: -74.0 }, 0.5);
    expect(near?.id).toBe("close");
  });

  it("returns null when nothing is within range", () => {
    const data = new CitiBikeData([makeStation("far", 40.8, -73.9)]);
    const near = data.findNearestDock({ lat: 40.7, lng: -74.0 }, 0.25);
    expect(near).toBeNull();
  });

  it("returns null for empty station list", () => {
    const data = new CitiBikeData([]);
    expect(data.findNearestDock({ lat: 40.7, lng: -74.0 })).toBeNull();
  });

  it("respects custom max distance", () => {
    const data = new CitiBikeData([makeStation("a", 40.705, -74.0)]);
    expect(data.findNearestDock({ lat: 40.7, lng: -74.0 })).toBeNull();
    expect(data.findNearestDock({ lat: 40.7, lng: -74.0 }, 0.5)?.id).toBe("a");
  });
});

describe("CitiBikeData.hasDockNearby", () => {
  it("returns true when a dock is within range", () => {
    const data = new CitiBikeData([makeStation("a", 40.7005, -74.0)]);
    expect(data.hasDockNearby({ lat: 40.7, lng: -74.0 })).toBe(true);
  });

  it("returns false when no dock is within range", () => {
    const data = new CitiBikeData([makeStation("a", 40.8, -73.9)]);
    expect(data.hasDockNearby({ lat: 40.7, lng: -74.0 })).toBe(false);
  });

  it("returns false for empty station list", () => {
    expect(new CitiBikeData([]).hasDockNearby({ lat: 40.7, lng: -74.0 })).toBe(false);
  });
});

describe("CitiBikeData.getAllStations", () => {
  it("returns all stations in constructor order", () => {
    const stations = [
      makeStation("a", 40.7, -74.0),
      makeStation("b", 40.71, -74.01),
    ];
    expect(new CitiBikeData(stations).getAllStations()).toEqual(stations);
  });
});
