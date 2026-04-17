import { describe, it, expect } from "vitest";
import { stopsShareRoute, type BusStop } from "../bus";

const stop = (id: string, routes: string[]): BusStop => ({
  id, name: id, lat: 40.7, lng: -74.0, routes,
});

describe("stopsShareRoute", () => {
  it("returns true when stops share at least one route", () => {
    expect(stopsShareRoute(stop("a", ["M15"]), stop("b", ["M15", "M101"]))).toBe(true);
  });

  it("returns true when multiple routes overlap", () => {
    expect(stopsShareRoute(
      stop("a", ["M1", "M2", "M3"]),
      stop("b", ["M2", "M3", "M4"])
    )).toBe(true);
  });

  it("returns false when routes are disjoint", () => {
    expect(stopsShareRoute(stop("a", ["M15"]), stop("b", ["B38"]))).toBe(false);
  });

  it("returns false when either stop has empty routes", () => {
    expect(stopsShareRoute(stop("a", []), stop("b", ["M15"]))).toBe(false);
    expect(stopsShareRoute(stop("a", ["M15"]), stop("b", []))).toBe(false);
    expect(stopsShareRoute(stop("a", []), stop("b", []))).toBe(false);
  });

  it("is symmetric", () => {
    const a = stop("a", ["M15", "M2"]);
    const b = stop("b", ["M2"]);
    expect(stopsShareRoute(a, b)).toBe(stopsShareRoute(b, a));
  });
});
