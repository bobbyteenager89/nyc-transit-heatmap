import { describe, it, expect, vi, beforeEach } from "vitest";
import { reverseGeocodeNeighborhood } from "../geocode";

const FAKE_TOKEN = "pk.test-token";

describe("reverseGeocodeNeighborhood", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns neighborhood name from mapbox response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { text: "Williamsburg", place_name: "Williamsburg, Brooklyn, New York" },
        ],
      }),
    } as Response);

    const result = await reverseGeocodeNeighborhood(
      { lat: 40.7128, lng: -73.9575 },
      FAKE_TOKEN
    );

    expect(result).toBe("Williamsburg");
  });

  it("falls back to place_name when text is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { text: "", place_name: "Brooklyn, New York" },
        ],
      }),
    } as Response);

    const result = await reverseGeocodeNeighborhood(
      { lat: 40.6892, lng: -73.9857 },
      FAKE_TOKEN
    );

    expect(result).toBe("Brooklyn, New York");
  });

  it("returns coordinates when no features found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    } as Response);

    const result = await reverseGeocodeNeighborhood(
      { lat: 40.7128, lng: -73.9575 },
      FAKE_TOKEN
    );

    expect(result).toBe("40.7128, -73.9575");
  });

  it("returns coordinates on fetch error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await reverseGeocodeNeighborhood(
      { lat: 40.7128, lng: -73.9575 },
      FAKE_TOKEN
    );

    expect(result).toBe("40.7128, -73.9575");
  });

  it("uses neighborhood/locality/place types in the API URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [{ text: "SoHo" }] }),
    } as Response);

    await reverseGeocodeNeighborhood({ lat: 40.723, lng: -74.0 }, FAKE_TOKEN);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("types=neighborhood,locality,place");
  });
});
