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
