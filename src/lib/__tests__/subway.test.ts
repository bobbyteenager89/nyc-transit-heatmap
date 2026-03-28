import { describe, it, expect } from "vitest";
import { SubwayData, computeSubwayTime } from "../subway";
import type { StationGraph, StationMatrix } from "../types";

// Minimal mock data
const mockGraph: StationGraph = {
  stations: {
    "S1": { name: "14th St", lat: 40.7368, lng: -73.9927, lines: ["1", "2", "3"] },
    "S2": { name: "23rd St", lat: 40.7418, lng: -73.9895, lines: ["1"] },
    "S3": { name: "Times Sq", lat: 40.7559, lng: -73.9870, lines: ["1", "2", "7", "N", "Q"] },
  },
  edges: { "S1": { "S2": 2 }, "S2": { "S3": 3 } },
  transfers: {},
};

const mockMatrix: StationMatrix = {
  stationIds: ["S1", "S2", "S3"],
  times: [
    [0, 2, 5],
    [2, 0, 3],
    [5, 3, 0],
  ],
};

describe("findNearestStations", () => {
  it("returns stations sorted by distance", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const nearest = data.findNearest({ lat: 40.737, lng: -73.993 }, 3);
    expect(nearest[0].stationId).toBe("S1"); // closest
    expect(nearest.length).toBeLessThanOrEqual(3);
  });

  it("limits results to count", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const nearest = data.findNearest({ lat: 40.737, lng: -73.993 }, 1);
    expect(nearest.length).toBe(1);
  });

  it("returns empty array when no stations within walking distance", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    // Point far from all stations
    const nearest = data.findNearest({ lat: 41.0, lng: -74.5 }, 3);
    expect(nearest.length).toBe(0);
  });
});

describe("SubwayData.stationToStationTime", () => {
  it("looks up precomputed station-to-station time", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const time = data.stationToStationTime("S1", "S3");
    expect(time).toBe(5);
  });

  it("returns null for unknown station", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const time = data.stationToStationTime("S1", "UNKNOWN");
    expect(time).toBeNull();
  });

  it("returns 0 for same station", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const time = data.stationToStationTime("S1", "S1");
    expect(time).toBe(0);
  });
});

describe("SubwayData.getStation", () => {
  it("returns station info by id", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const station = data.getStation("S1");
    expect(station).not.toBeNull();
    expect(station!.name).toBe("14th St");
  });

  it("returns null for unknown station", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    expect(data.getStation("NOPE")).toBeNull();
  });
});

describe("computeSubwayTime", () => {
  it("computes total time including walk to/from stations", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    // Point near S1, destination near S3
    const time = computeSubwayTime(
      data,
      { lat: 40.737, lng: -73.993 },
      { lat: 40.756, lng: -73.987 }
    );
    expect(time).not.toBeNull();
    // Should be walk to S1 + subway S1->S3 (5 min) + walk from S3
    expect(time!).toBeGreaterThan(5);
    expect(time!).toBeLessThan(20);
  });

  it("returns null when origin is too far from any station", () => {
    const data = new SubwayData(mockGraph, mockMatrix);
    const time = computeSubwayTime(
      data,
      { lat: 41.0, lng: -74.5 },
      { lat: 40.756, lng: -73.987 }
    );
    expect(time).toBeNull();
  });
});
