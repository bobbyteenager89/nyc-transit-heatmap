export type TransportMode = "subway" | "bus" | "car" | "bike" | "walk" | "ferry";

export type DestinationCategory = "work" | "social" | "fitness" | "errands" | "other";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  category: DestinationCategory;
  frequency: number; // visits per week
  locations?: LatLng[]; // multiple locations (e.g., gym chains). If set, closest used per grid point
}

export interface GridPoint {
  lat: number;
  lng: number;
  times: Record<TransportMode, number | null>;
  fastest: TransportMode;
}

export interface CompositeGridPoint extends GridPoint {
  compositeScore: number; // total monthly minutes
}

/** H3 hex cell with computed travel data */
export interface HexCell {
  h3Index: string;
  center: LatLng;
  boundary: [number, number][]; // [lng, lat] pairs for GeoJSON polygon
  times: Record<TransportMode, number | null>;
  fastest: TransportMode;
  compositeScore: number; // total monthly minutes (0 = no destinations)
  /** Per-destination breakdown: destId → best travel time in minutes */
  destBreakdown: Record<string, number>;
  /** Walk time in minutes from this cell to the nearest subway station.
   *  Populated client-side after compute when the "subway stops" view is available. */
  subwayWalkMin?: number;
}

export interface HexGridResult {
  cells: HexCell[];
}

export interface StationGraph {
  stations: Record<string, {
    name: string;
    lat: number;
    lng: number;
    lines: string[];
  }>;
  edges: Record<string, Record<string, number>>;
  transfers: Record<string, Record<string, number>>;
}

export interface StationMatrix {
  stationIds: string[];
  times: number[][]; // times[i][j] = minutes from stationIds[i] to stationIds[j]
}

export interface CitiBikeStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
}

export interface BoundingBox {
  sw: LatLng;
  ne: LatLng;
}

/** A single time-band contour polygon for one mode */
export interface IsochroneBand {
  mode: TransportMode;
  minMinutes: number;
  maxMinutes: number;
  polygon: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon>;
}

/** All contour bands for a single mode */
export interface IsochroneLayer {
  mode: TransportMode;
  color: string;
  bands: IsochroneBand[];
}

/** Shareable URL state — everything needed to reconstruct a heatmap */
export interface ShareableState {
  v: 1; // version for forward compat
  destinations: {
    n: string; // name
    a: string; // address
    lat: number;
    lng: number;
    c: DestinationCategory;
    f: number; // frequency
  }[];
  modes: TransportMode[];
}
