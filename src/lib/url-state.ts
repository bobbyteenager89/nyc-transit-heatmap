import type { Destination, TransportMode, ShareableState } from "./types";

/**
 * Encode destinations + modes into a URL query string.
 * Format: v=1&d=<base64-encoded JSON>
 */
export function encodeShareableState(
  destinations: Destination[],
  modes: TransportMode[]
): string {
  const state: ShareableState = {
    v: 1,
    destinations: destinations.map((d) => ({
      n: d.name,
      a: d.address,
      lat: Math.round(d.location.lat * 10000) / 10000,
      lng: Math.round(d.location.lng * 10000) / 10000,
      c: d.category,
      f: d.frequency,
    })),
    modes,
  };

  const json = JSON.stringify(state);
  const base64 = btoa(json);
  return `v=1&d=${encodeURIComponent(base64)}`;
}

/**
 * Decode a URL query string back into destinations + modes.
 * Returns null if the string is malformed or wrong version.
 */
export function decodeShareableState(
  queryString: string
): { destinations: Destination[]; modes: TransportMode[] } | null {
  try {
    const params = new URLSearchParams(queryString);
    const version = params.get("v");
    if (version !== "1") return null;

    const encoded = params.get("d");
    if (!encoded) return null;

    const json = atob(decodeURIComponent(encoded));
    const state: ShareableState = JSON.parse(json);

    if (!state.destinations || !state.modes) return null;

    const destinations: Destination[] = state.destinations.map((d) => ({
      id: crypto.randomUUID(),
      name: d.n,
      address: d.a,
      location: { lat: d.lat, lng: d.lng },
      category: d.c,
      frequency: d.f,
    }));

    return { destinations, modes: state.modes };
  } catch {
    return null;
  }
}
