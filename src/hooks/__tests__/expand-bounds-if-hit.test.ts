import { describe, it, expect } from "vitest";
import { expandBoundsIfHit } from "../use-dynamic-grid-compute";
import { CORE_NYC_BOUNDS, BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS } from "@/lib/constants";
import type { HexCell, BoundingBox } from "@/lib/types";

function cell(lat: number, lng: number, compositeScore: number): HexCell {
  return {
    h3Index: `${lat},${lng}`,
    center: { lat, lng },
    boundary: [],
    times: { subway: null, bus: null, walk: null, car: null, bike: null, ferry: null },
    fastest: "walk",
    compositeScore,
    destBreakdown: {},
  };
}

const BOUNDS: BoundingBox = CORE_NYC_BOUNDS;

describe("expandBoundsIfHit", () => {
  it("returns null for empty cell list", () => {
    expect(expandBoundsIfHit(BOUNDS, [], 30)).toBeNull();
  });

  it("returns null when no reachable cell touches an edge", () => {
    // Middle of bounds, well reachable
    const midLat = (BOUNDS.sw.lat + BOUNDS.ne.lat) / 2;
    const midLng = (BOUNDS.sw.lng + BOUNDS.ne.lng) / 2;
    expect(expandBoundsIfHit(BOUNDS, [cell(midLat, midLng, 10)], 30)).toBeNull();
  });

  it("ignores unreachable cells (compositeScore >= 999)", () => {
    // Cell is on the north edge but unreachable sentinel
    const c = cell(BOUNDS.ne.lat, BOUNDS.sw.lng + 0.05, 999);
    expect(expandBoundsIfHit(BOUNDS, [c], 30)).toBeNull();
  });

  it("ignores cells over the maxMinutes budget", () => {
    const c = cell(BOUNDS.ne.lat, BOUNDS.sw.lng + 0.05, 45);
    expect(expandBoundsIfHit(BOUNDS, [c], 30)).toBeNull();
  });

  it("expands north when a reachable cell hits the north edge", () => {
    const c = cell(BOUNDS.ne.lat - 0.001, BOUNDS.sw.lng + 0.05, 10);
    const result = expandBoundsIfHit(BOUNDS, [c], 30);
    expect(result).not.toBeNull();
    expect(result!.ne.lat).toBeCloseTo(BOUNDS.ne.lat + BOUNDS_EXPANSION_STEP, 5);
    expect(result!.sw.lat).toBe(BOUNDS.sw.lat);
    expect(result!.ne.lng).toBe(BOUNDS.ne.lng);
    expect(result!.sw.lng).toBe(BOUNDS.sw.lng);
  });

  it("expands south when a reachable cell hits the south edge", () => {
    const c = cell(BOUNDS.sw.lat + 0.001, BOUNDS.sw.lng + 0.05, 10);
    const result = expandBoundsIfHit(BOUNDS, [c], 30);
    expect(result!.sw.lat).toBeCloseTo(BOUNDS.sw.lat - BOUNDS_EXPANSION_STEP, 5);
    expect(result!.ne.lat).toBe(BOUNDS.ne.lat);
  });

  it("expands east when a reachable cell hits the east edge", () => {
    const c = cell(BOUNDS.sw.lat + 0.05, BOUNDS.ne.lng - 0.001, 10);
    const result = expandBoundsIfHit(BOUNDS, [c], 30);
    expect(result!.ne.lng).toBeCloseTo(BOUNDS.ne.lng + BOUNDS_EXPANSION_STEP, 5);
    expect(result!.sw.lng).toBe(BOUNDS.sw.lng);
  });

  it("expands west when a reachable cell hits the west edge", () => {
    const c = cell(BOUNDS.sw.lat + 0.05, BOUNDS.sw.lng + 0.001, 10);
    const result = expandBoundsIfHit(BOUNDS, [c], 30);
    // CORE west edge (-74.03) - step (0.04) = -74.07, but MAX clamps to -74.06
    expect(result!.sw.lng).toBe(MAX_NYC_BOUNDS.sw.lng);
    expect(result!.ne.lng).toBe(BOUNDS.ne.lng);
  });

  it("expands multiple sides when several edges are hit", () => {
    const cells = [
      cell(BOUNDS.ne.lat - 0.001, BOUNDS.sw.lng + 0.05, 10), // N
      cell(BOUNDS.sw.lat + 0.05, BOUNDS.ne.lng - 0.001, 10), // E
    ];
    const result = expandBoundsIfHit(BOUNDS, cells, 30);
    expect(result!.ne.lat).toBeCloseTo(BOUNDS.ne.lat + BOUNDS_EXPANSION_STEP, 5);
    expect(result!.ne.lng).toBeCloseTo(BOUNDS.ne.lng + BOUNDS_EXPANSION_STEP, 5);
    expect(result!.sw.lat).toBe(BOUNDS.sw.lat);
    expect(result!.sw.lng).toBe(BOUNDS.sw.lng);
  });

  it("clamps expansion to MAX_NYC_BOUNDS", () => {
    // Start at max bounds — any hit should produce no change → null
    const atMax = MAX_NYC_BOUNDS;
    const cells = [
      cell(atMax.ne.lat - 0.001, atMax.sw.lng + 0.05, 10),
      cell(atMax.sw.lat + 0.001, atMax.sw.lng + 0.05, 10),
      cell(atMax.sw.lat + 0.05, atMax.ne.lng - 0.001, 10),
      cell(atMax.sw.lat + 0.05, atMax.sw.lng + 0.001, 10),
    ];
    expect(expandBoundsIfHit(atMax, cells, 30)).toBeNull();
  });

  it("clamps partially when expansion would overshoot max on one side", () => {
    // Bounds 0.01 inside max on the north — expansion should clamp to max exactly
    const nearMaxN: BoundingBox = {
      sw: BOUNDS.sw,
      ne: { lat: MAX_NYC_BOUNDS.ne.lat - 0.01, lng: BOUNDS.ne.lng },
    };
    const c = cell(nearMaxN.ne.lat - 0.001, nearMaxN.sw.lng + 0.05, 10);
    const result = expandBoundsIfHit(nearMaxN, [c], 30);
    expect(result).not.toBeNull();
    expect(result!.ne.lat).toBe(MAX_NYC_BOUNDS.ne.lat);
  });
});
