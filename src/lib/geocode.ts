import type { LatLng } from "./types";

const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export async function geocodeAddress(
  address: string,
  token: string
): Promise<{ location: LatLng; displayName: string } | null> {
  const query = encodeURIComponent(`${address}, New York, NY`);
  const url = `${MAPBOX_GEOCODE_URL}/${query}.json?access_token=${token}&limit=1&bbox=-74.3,40.47,-73.6,40.95`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  if (!data.features || data.features.length === 0) return null;

  const feature = data.features[0];
  const [lng, lat] = feature.center;

  return {
    location: { lat, lng },
    displayName: feature.place_name,
  };
}

export async function reverseGeocode(
  point: LatLng,
  token: string
): Promise<string> {
  const url = `${MAPBOX_GEOCODE_URL}/${point.lng},${point.lat}.json?access_token=${token}&types=address&limit=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.[0]) {
      return data.features[0].text || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
    }
  } catch {
    // fall through
  }

  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

export async function reverseGeocodeNeighborhood(
  point: LatLng,
  token: string
): Promise<string> {
  const url = `${MAPBOX_GEOCODE_URL}/${point.lng},${point.lat}.json?access_token=${token}&types=neighborhood,locality,place&limit=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.[0]) {
      return data.features[0].text || data.features[0].place_name || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
    }
  } catch {
    // fall through
  }

  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}
