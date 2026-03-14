import { describe, it, expect } from "vitest";
import { GYM_CHAINS, searchGymChains, getGymChainById } from "../gym-chains";

describe("GYM_CHAINS", () => {
  it("contains at least 5 gym chains", () => {
    expect(GYM_CHAINS.length).toBeGreaterThanOrEqual(5);
  });

  it("every chain has a unique id", () => {
    const ids = GYM_CHAINS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every chain has at least one location", () => {
    for (const chain of GYM_CHAINS) {
      expect(chain.locations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every location has valid lat/lng within NYC area", () => {
    for (const chain of GYM_CHAINS) {
      for (const loc of chain.locations) {
        expect(loc.latlng.lat).toBeGreaterThan(40.4);
        expect(loc.latlng.lat).toBeLessThan(41.0);
        expect(loc.latlng.lng).toBeGreaterThan(-74.3);
        expect(loc.latlng.lng).toBeLessThan(-73.7);
      }
    }
  });
});

describe("searchGymChains", () => {
  it("returns empty array for empty query", () => {
    expect(searchGymChains("")).toEqual([]);
    expect(searchGymChains("   ")).toEqual([]);
  });

  it("finds Equinox by exact name", () => {
    const results = searchGymChains("Equinox");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("equinox");
  });

  it("is case-insensitive", () => {
    const results = searchGymChains("equinox");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("equinox");
  });

  it("finds by partial match", () => {
    const results = searchGymChains("planet");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("planet-fitness");
  });

  it("returns multiple matches when applicable", () => {
    const results = searchGymChains("fitness");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("planet-fitness");
    expect(ids).toContain("blink-fitness");
  });

  it("returns empty for unmatched query", () => {
    expect(searchGymChains("xyznonexistent")).toEqual([]);
  });
});

describe("getGymChainById", () => {
  it("returns chain by id", () => {
    const chain = getGymChainById("equinox");
    expect(chain).toBeDefined();
    expect(chain!.name).toBe("Equinox");
  });

  it("returns undefined for unknown id", () => {
    expect(getGymChainById("nonexistent")).toBeUndefined();
  });
});

describe("multi-location destination format", () => {
  it("chain locations can be mapped to Destination locations[] array", () => {
    const chain = getGymChainById("equinox")!;
    const locations = chain.locations.map((l) => l.latlng);
    expect(locations.length).toBeGreaterThan(1);
    expect(locations[0]).toHaveProperty("lat");
    expect(locations[0]).toHaveProperty("lng");
  });
});
