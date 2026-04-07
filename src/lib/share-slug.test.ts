import { describe, it, expect } from "vitest";
import { encodeShareSlug, decodeShareSlug, type ShareParams } from "./share-slug";

describe("share-slug", () => {
  const sample: ShareParams = {
    lat: 40.7128,
    lng: -74.006,
    t: 30,
    m: ["subway", "walk"],
    address: "Lower Manhattan",
  };

  it("round-trips a typical share", () => {
    const slug = encodeShareSlug(sample);
    expect(decodeShareSlug(slug)).toEqual(sample);
  });

  it("produces a URL-safe slug under 60 chars for typical input", () => {
    const slug = encodeShareSlug(sample);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(slug.length).toBeLessThan(60);
  });

  it("clamps lat/lng/t to valid ranges", () => {
    const decoded = decodeShareSlug(
      encodeShareSlug({ lat: 999, lng: -999, t: 999, m: ["subway"] }),
    );
    expect(decoded!.lat).toBeLessThanOrEqual(90);
    expect(decoded!.lng).toBeGreaterThanOrEqual(-180);
    expect(decoded!.t).toBeLessThanOrEqual(60);
  });

  it("filters invalid mode names", () => {
    const decoded = decodeShareSlug(
      encodeShareSlug({ lat: 40.7, lng: -74, t: 15, m: ["subway", "spaceship" as never] }),
    );
    expect(decoded!.m).toEqual(["subway"]);
  });

  it("returns null for malformed slug", () => {
    expect(decodeShareSlug("not-a-real-slug-!!!")).toBeNull();
  });

  it("truncates long addresses", () => {
    const long = "x".repeat(200);
    const decoded = decodeShareSlug(encodeShareSlug({ ...sample, address: long }));
    expect(decoded?.address?.length).toBeLessThanOrEqual(60);
  });
});
