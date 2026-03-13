export type TransportMode = "subway" | "car" | "bike" | "bikeSubway" | "walk";

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
  compositeScore: number; // weighted avg minutes
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

export interface SetupState {
  origin: LatLng | null;
  originAddress: string;
  modes: TransportMode[];
  destinations: Destination[];
  bounds: BoundingBox;
}
