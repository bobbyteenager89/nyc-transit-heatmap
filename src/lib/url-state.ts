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
const VALID_MODES: TransportMode[] = ["subway", "bus", "car", "bike", "ownbike", "walk", "ferry"];
const MAX_DESTINATIONS = 20;
const MAX_STRING_LEN = 200;

function isValidLat(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= -90 && n <= 90;
}

function isValidLng(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= -180 && n <= 180;
}

function sanitizeString(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.slice(0, MAX_STRING_LEN);
}

export function decodeShareableState(
  queryString: string
): { destinations: Destination[]; modes: TransportMode[] } | null {
  try {
    const params = new URLSearchParams(queryString);
    const version = params.get("v");
    if (version !== "1") return null;

    const encoded = params.get("d");
    if (!encoded || encoded.length > 10_000) return null;

    const json = atob(decodeURIComponent(encoded));
    const state: ShareableState = JSON.parse(json);

    if (!Array.isArray(state.destinations) || !Array.isArray(state.modes)) return null;
    if (state.destinations.length > MAX_DESTINATIONS) return null;

    // Validate modes
    const validModes = state.modes.filter(
      (m): m is TransportMode => VALID_MODES.includes(m as TransportMode)
    );
    if (validModes.length === 0) return null;

    // Validate + sanitize destinations
    const destinations: Destination[] = [];
    for (const d of state.destinations) {
      if (!isValidLat(d.lat) || !isValidLng(d.lng)) continue;
      const freq = typeof d.f === "number" && Number.isFinite(d.f) ? Math.max(1, Math.min(d.f, 14)) : 1;
      destinations.push({
        id: crypto.randomUUID(),
        name: sanitizeString(d.n) || "Unknown",
        address: sanitizeString(d.a),
        location: { lat: d.lat, lng: d.lng },
        category: (["work", "social", "fitness", "errands", "other"] as const).includes(d.c as any) ? d.c : "other",
        frequency: freq,
      });
    }

    return { destinations, modes: validModes };
  } catch {
    return null;
  }
}
