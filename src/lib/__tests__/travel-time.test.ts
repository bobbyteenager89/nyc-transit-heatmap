import { describe, it, expect } from "vitest";
import {
  manhattanDistanceMi,
  walkTime,
  bikeTime,
  driveTime,
} from "../travel-time";

describe("manhattanDistanceMi", () => {
  it("computes Manhattan distance between two points", () => {
    // ~0.5 mi apart
    const d = manhattanDistanceMi(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.735, lng: -73.985 }
    );
    expect(d).toBeGreaterThan(0.4);
    expect(d).toBeLessThan(0.7);
  });

  it("returns 0 for same point", () => {
    const d = manhattanDistanceMi(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.73, lng: -73.99 }
    );
    expect(d).toBe(0);
  });
});

describe("walkTime", () => {
  it("computes walk time in minutes", () => {
    // 1 mile at 3 mph = 20 min
    const t = walkTime(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.7445, lng: -73.99 } // ~1 mi north
    );
    expect(t).toBeGreaterThan(15);
    expect(t).toBeLessThan(25);
  });
});

describe("bikeTime", () => {
  it("computes bike time with dock overhead", () => {
    // 1 mile at 9 mph = ~6.7 min + 4 min dock = ~10.7
    const t = bikeTime(
      { lat: 40.73, lng: -73.99 },
      { lat: 40.7445, lng: -73.99 }
    );
    expect(t).toBeGreaterThan(8);
    expect(t).toBeLessThan(14);
  });
});

describe("driveTime", () => {
  it("uses Manhattan speed for points in Manhattan", () => {
    const t = driveTime(
      { lat: 40.75, lng: -73.99 }, // midtown
      { lat: 40.76, lng: -73.98 }
    );
    // Short distance, 12 mph
    expect(t).toBeGreaterThan(2);
    expect(t).toBeLessThan(10);
  });

  it("uses outer borough speed for points outside Manhattan", () => {
    const t = driveTime(
      { lat: 40.68, lng: -73.95 }, // Brooklyn
      { lat: 40.69, lng: -73.94 }
    );
    // Same distance but 20 mph = faster
    expect(t).toBeGreaterThan(1);
    expect(t).toBeLessThan(7);
  });
});
