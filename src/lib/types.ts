export type TransportMode = "subway" | "car" | "bike" | "bikeSubway" | "walk" | "ferry";

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
