import { describe, it, expect } from "vitest";
import { generateHexCenters, hexCellToGeoJSON } from "../hex";
import type { BoundingBox } from "../types";

const NYC_BOUNDS: BoundingBox = {
  sw: { lat: 40.7, lng: -74.0 },
  ne: { lat: 40.8, lng: -73.9 },
};

describe("generateHexCenters", () => {
  it("returns hex cell IDs within bounds", () => {
    const cells = generateHexCenters(NYC_BOUNDS, 8);
    expect(cells.length).toBeGreaterThan(100);
    expect(cells.length).toBeLessThan(5000);
    for (const cell of cells) {
      expect(cell.h3Index).toBeTruthy();
      expect(cell.center.lat).toBeGreaterThan(40.5);
      expect(cell.center.lat).toBeLessThan(41.0);
      expect(cell.center.lng).toBeGreaterThan(-74.2);
      expect(cell.center.lng).toBeLessThan(-73.5);
      expect(cell.boundary.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("returns no duplicates", () => {
    const cells = generateHexCenters(NYC_BOUNDS, 8);
    const ids = cells.map((c) => c.h3Index);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("hexCellToGeoJSON", () => {
  it("converts hex cells to a GeoJSON FeatureCollection with Polygon features", () => {
    const cells = generateHexCenters(NYC_BOUNDS, 8);
    const geojson = hexCellToGeoJSON(cells.slice(0, 5).map((c) => ({
      ...c,
      times: { walk: 10, car: 5, bike: 8, subway: 7, bikeSubway: 6 },
      fastest: "car" as const,
      compositeScore: 300,
      destBreakdown: {},
    })));
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(5);
    expect(geojson.features[0].geometry.type).toBe("Polygon");
    expect(geojson.features[0].properties.compositeScore).toBe(300);
    expect(geojson.features[0].properties.color).toBeTruthy();
  });
});
