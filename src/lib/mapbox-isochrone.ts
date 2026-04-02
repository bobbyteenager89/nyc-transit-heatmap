import type { LatLng, TransportMode } from "./types";

/** Mapbox profile for each transport mode */
const MODE_TO_PROFILE: Partial<Record<TransportMode, string>> = {
  walk: "mapbox/walking",
  bike: "mapbox/cycling",
  car: "mapbox/driving",
};

/** Modes that use the Mapbox Isochrone API (smooth street-following shapes) */
export const API_MODES: TransportMode[] = ["walk", "bike", "car"];

/** Modes that use our hex grid compute (subway/bus/ferry routing) */
export const HEX_MODES: TransportMode[] = ["subway", "bus", "ferry"];

export interface IsochroneContour {
  mode: TransportMode;
  minutes: number;
  personId: "a" | "b";
  polygon: GeoJSON.Feature;
}

/**
 * Fetch isochrone contour polygons from Mapbox Isochrone API.
 * Returns up to 4 contour bands per mode.
 * Only works for walk, bike, car (Mapbox profiles).
 */
export async function fetchIsochrone(
  origin: LatLng,
  mode: TransportMode,
  maxMinutes: number,
  token: string,
  personId: "a" | "b" = "a"
): Promise<IsochroneContour[]> {
  const profile = MODE_TO_PROFILE[mode];
  if (!profile) return [];

  // Build up to 4 evenly-spaced contour bands
  const numContours = Math.min(4, Math.max(1, Math.floor(maxMinutes / 5)));
  const contourMinutes: number[] = [];
  for (let i = 1; i <= numContours; i++) {
    contourMinutes.push(Math.round((maxMinutes * i) / numContours));
  }

  const params = new URLSearchParams({
    contours_minutes: contourMinutes.join(","),
    polygons: "true",
    denoise: "1",
    generalize: "0",
    access_token: token,
  });

  const url = `https://api.mapbox.com/isochrone/v1/${profile}/${origin.lng},${origin.lat}?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Isochrone API error for ${mode}:`, res.status);
      return [];
    }
    const data: GeoJSON.FeatureCollection = await res.json();

    return data.features.map((feature) => ({
      mode,
      minutes: feature.properties?.contour ?? 0,
      personId,
      polygon: {
        ...feature,
        properties: {
          ...feature.properties,
          mode,
          personId,
          minutes: feature.properties?.contour ?? 0,
        },
      },
    }));
  } catch (err) {
    console.warn(`Isochrone API failed for ${mode}:`, err);
    return [];
  }
}

/**
 * Fetch isochrones for all API-supported modes in parallel.
 */
export async function fetchAllIsochrones(
  origin: LatLng,
  modes: TransportMode[],
  maxMinutes: number,
  token: string,
  personId: "a" | "b" = "a"
): Promise<IsochroneContour[]> {
  const apiModes = modes.filter((m) => API_MODES.includes(m));
  if (apiModes.length === 0) return [];

  const results = await Promise.all(
    apiModes.map((mode) => fetchIsochrone(origin, mode, maxMinutes, token, personId))
  );

  return results.flat();
}
