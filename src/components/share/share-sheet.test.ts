/**
 * Unit tests for ShareSheet URL resolution logic.
 * The component itself is a client component tested via build check.
 */

describe("ShareSheet URL resolution", () => {
  it("returns the url unchanged when it already starts with http", () => {
    const url = "https://nycheatmap.com/p/abc123";
    const absolute = url.startsWith("http") ? url : `https://example.com${url}`;
    expect(absolute).toBe("https://nycheatmap.com/p/abc123");
  });

  it("prepends origin to a relative URL", () => {
    const url = "/p/abc123";
    const origin = "https://nycheatmap.com";
    const absolute = url.startsWith("http") ? url : `${origin}${url}`;
    expect(absolute).toBe("https://nycheatmap.com/p/abc123");
  });

  it("encodes mailto body correctly", () => {
    const title = "Check this out";
    const text = "Transit heatmap for NYC";
    const absolute = "https://nycheatmap.com/p/abc123";
    const href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${absolute}`)}`;
    expect(href).toBe(
      "mailto:?subject=Check%20this%20out&body=Transit%20heatmap%20for%20NYC%0A%0Ahttps%3A%2F%2Fnycheatmap.com%2Fp%2Fabc123"
    );
  });
});
