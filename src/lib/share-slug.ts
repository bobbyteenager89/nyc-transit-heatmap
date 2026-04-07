/**
 * Stateless share slug encoder/decoder.
 *
 * Binary layout (little-endian):
 *   Bytes 0-3  : lat  × 10_000 as Int32 (range −90 to 90 → −900_000 to 900_000)
 *   Bytes 4-7  : lng  × 10_000 as Int32 (range −180 to 180 → −1_800_000 to 1_800_000)
 *   Byte  8    : t (minutes, 1–60) as Uint8
 *   Byte  9    : modes bitmask (bit per mode, ordered by VALID_MODES)
 *   Bytes 10+  : UTF-8 address (0–40 bytes), omitted when undefined
 *
 * This keeps typical slugs well under 60 URL-safe base64url characters.
 */

const VALID_MODES = ["subway", "bus", "walk", "bike", "car", "ferry"] as const;
type Mode = (typeof VALID_MODES)[number];

export type ShareParams = {
  lat: number;
  lng: number;
  t: number;
  m: string[];
  address?: string;
};

// --- clamping / sanitisation -------------------------------------------------

const clampLat = (n: number) => Math.max(-90, Math.min(90, n));
const clampLng = (n: number) => Math.max(-180, Math.min(180, n));
const clampT = (n: number) => Math.max(1, Math.min(60, Math.round(n)));
const sanitizeModes = (m: string[]) =>
  m.filter((x): x is Mode => (VALID_MODES as readonly string[]).includes(x));
/** Address is capped at 40 bytes so the total slug stays compact. */
const sanitizeAddress = (a?: string): string | undefined => {
  if (!a) return undefined;
  // Truncate to 40 characters (all ASCII for NYC addresses; safe for UTF-8).
  return a.slice(0, 40) || undefined;
};

// --- base64url helpers -------------------------------------------------------

function base64UrlEncode(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array | null {
  try {
    const padded =
      s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    const bin = atob(padded);
    return new Uint8Array(bin.split("").map((c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

// --- encode / decode ---------------------------------------------------------

export function encodeShareSlug(p: ShareParams): string {
  const lat = clampLat(p.lat);
  const lng = clampLng(p.lng);
  const t = clampT(p.t);
  const modes = sanitizeModes(p.m);
  const address = sanitizeAddress(p.address);

  // Encode lat/lng as fixed-point Int32 (4 decimal places).
  const latFixed = Math.round(lat * 10_000);
  const lngFixed = Math.round(lng * 10_000);

  // Modes bitmask.
  let modeBits = 0;
  for (const mode of modes) {
    modeBits |= 1 << VALID_MODES.indexOf(mode);
  }

  const addrBytes = address ? new TextEncoder().encode(address) : new Uint8Array(0);
  const buf = new ArrayBuffer(10 + addrBytes.length);
  const view = new DataView(buf);
  view.setInt32(0, latFixed, true);
  view.setInt32(4, lngFixed, true);
  view.setUint8(8, t);
  view.setUint8(9, modeBits);
  const out = new Uint8Array(buf);
  out.set(addrBytes, 10);

  return base64UrlEncode(out);
}

export function decodeShareSlug(slug: string): ShareParams | null {
  const bytes = base64UrlDecode(slug);
  if (!bytes || bytes.length < 10) return null;
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const latFixed = view.getInt32(0, true);
    const lngFixed = view.getInt32(4, true);
    const t = view.getUint8(8);
    const modeBits = view.getUint8(9);

    const lat = clampLat(Number((latFixed / 10_000).toFixed(4)));
    const lng = clampLng(Number((lngFixed / 10_000).toFixed(4)));

    const m: Mode[] = [];
    for (let i = 0; i < VALID_MODES.length; i++) {
      if (modeBits & (1 << i)) m.push(VALID_MODES[i]);
    }

    const addrBytes = bytes.slice(10);
    const address = addrBytes.length > 0 ? new TextDecoder().decode(addrBytes) : undefined;

    return {
      lat,
      lng,
      t: clampT(t),
      m,
      address: sanitizeAddress(address),
    };
  } catch {
    return null;
  }
}
