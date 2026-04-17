import { describe, it, expect } from "vitest";
import { encodeShareableState, decodeShareableState } from "../url-state";
import type { Destination, TransportMode } from "../types";

const SAMPLE_DESTINATIONS: Destination[] = [
  {
    id: "1",
    name: "Office",
    address: "123 Broadway, New York",
    location: { lat: 40.7128, lng: -74.006 },
    category: "work",
    frequency: 5,
  },
  {
    id: "2",
    name: "Equinox",
    address: "100 Greenwich St",
    location: { lat: 40.7095, lng: -74.0131 },
    category: "fitness",
    frequency: 3,
  },
];

const SAMPLE_MODES: TransportMode[] = ["subway", "bike"];

describe("URL state round-trip", () => {
  it("encodes and decodes destinations + modes losslessly", () => {
    const encoded = encodeShareableState(SAMPLE_DESTINATIONS, SAMPLE_MODES);
    expect(encoded).toContain("v=1");

    const decoded = decodeShareableState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.destinations.length).toBe(2);
    expect(decoded!.destinations[0].name).toBe("Office");
    expect(decoded!.destinations[0].category).toBe("work");
    expect(decoded!.destinations[0].frequency).toBe(5);
    expect(decoded!.destinations[0].location.lat).toBeCloseTo(40.7128, 3);
    expect(decoded!.destinations[0].location.lng).toBeCloseTo(-74.006, 3);
    expect(decoded!.modes).toEqual(SAMPLE_MODES);
  });

  it("returns null for malformed input", () => {
    expect(decodeShareableState("v=1&d=INVALID_BASE64!!!")).toBeNull();
    expect(decodeShareableState("")).toBeNull();
    expect(decodeShareableState("v=2&d=abc")).toBeNull(); // wrong version
  });

  it("handles empty destinations", () => {
    const encoded = encodeShareableState([], SAMPLE_MODES);
    const decoded = decodeShareableState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.destinations.length).toBe(0);
  });

  it("produces URL-safe strings", () => {
    const encoded = encodeShareableState(SAMPLE_DESTINATIONS, SAMPLE_MODES);
    // Should not contain characters that need URL encoding
    expect(encoded).not.toMatch(/[^a-zA-Z0-9=&_\-.+%]/);
  });
});

describe("URL state validation", () => {
  function encodeRaw(state: unknown): string {
    return `v=1&d=${encodeURIComponent(btoa(JSON.stringify(state)))}`;
  }

  it("filters destinations with invalid lat/lng", () => {
    const payload = encodeRaw({
      v: 1,
      destinations: [
        { n: "Bad NaN", a: "", lat: NaN, lng: -74, c: "work", f: 1 },
        { n: "Bad Infinity", a: "", lat: Infinity, lng: -74, c: "work", f: 1 },
        { n: "Bad String", a: "", lat: "40.7", lng: -74, c: "work", f: 1 },
        { n: "Bad out-of-range", a: "", lat: 200, lng: -74, c: "work", f: 1 },
        { n: "Good", a: "", lat: 40.7, lng: -74, c: "work", f: 1 },
      ],
      modes: ["subway"],
    });
    const decoded = decodeShareableState(payload);
    expect(decoded).not.toBeNull();
    expect(decoded!.destinations.length).toBe(1);
    expect(decoded!.destinations[0].name).toBe("Good");
  });

  it("clamps frequency to [1, 14]", () => {
    const payload = encodeRaw({
      v: 1,
      destinations: [
        { n: "Zero", a: "", lat: 40.7, lng: -74, c: "work", f: 0 },
        { n: "High", a: "", lat: 40.7, lng: -74, c: "work", f: 999 },
        { n: "NaN", a: "", lat: 40.7, lng: -74, c: "work", f: NaN },
      ],
      modes: ["subway"],
    });
    const decoded = decodeShareableState(payload);
    expect(decoded!.destinations[0].frequency).toBe(1);
    expect(decoded!.destinations[1].frequency).toBe(14);
    expect(decoded!.destinations[2].frequency).toBe(1);
  });

  it("filters unknown modes and returns null if none remain valid", () => {
    const withSome = encodeRaw({
      v: 1,
      destinations: [],
      modes: ["subway", "jetpack", "teleport"],
    });
    expect(decodeShareableState(withSome)!.modes).toEqual(["subway"]);

    const withNone = encodeRaw({
      v: 1,
      destinations: [],
      modes: ["jetpack", "teleport"],
    });
    expect(decodeShareableState(withNone)).toBeNull();
  });

  it("rejects more than 20 destinations", () => {
    const dests = Array.from({ length: 21 }, (_, i) => ({
      n: `d${i}`, a: "", lat: 40.7, lng: -74, c: "work", f: 1,
    }));
    const payload = encodeRaw({ v: 1, destinations: dests, modes: ["subway"] });
    expect(decodeShareableState(payload)).toBeNull();
  });

  it("rejects oversized encoded payloads", () => {
    const longString = "x".repeat(10_001);
    expect(decodeShareableState(`v=1&d=${longString}`)).toBeNull();
  });

  it("rejects non-array destinations or modes", () => {
    const notArrayDests = encodeRaw({ v: 1, destinations: "not-array", modes: ["subway"] });
    expect(decodeShareableState(notArrayDests)).toBeNull();

    const notArrayModes = encodeRaw({ v: 1, destinations: [], modes: "subway" });
    expect(decodeShareableState(notArrayModes)).toBeNull();
  });

  it("truncates long strings and defaults unknown category", () => {
    const longName = "n".repeat(500);
    const payload = encodeRaw({
      v: 1,
      destinations: [
        { n: longName, a: "", lat: 40.7, lng: -74, c: "invalid-cat", f: 1 },
      ],
      modes: ["subway"],
    });
    const decoded = decodeShareableState(payload);
    const d = decoded!.destinations[0];
    expect(d.name.length).toBe(200);
    expect(d.category).toBe("other");
  });
});
