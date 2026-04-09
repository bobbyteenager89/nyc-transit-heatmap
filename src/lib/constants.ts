import type { BoundingBox, DestinationCategory } from "./types";

// Speeds in mph
export const WALK_SPEED = 3;
export const BIKE_SPEED = 9;
export const DRIVE_SPEED_MANHATTAN = 12;
export const DRIVE_SPEED_OUTER = 20;

export const FERRY_SPEED_MPH = 15;
export const FERRY_MAX_WALK_MI = 1.0; // max walk to/from terminal

export const BUS_SPEED_MPH = 8; // NYC average bus speed
export const BUS_MAX_WALK_MI = 0.3; // max walk to bus stop (~6 min)
export const BUS_WAIT_MIN = 7; // average wait time

// Thresholds
export const BIKE_DOCK_RANGE_MI = 0.25; // 5-min walk
export const SUBWAY_MAX_WALK_MI = 1.5;
export const BIKE_DOCK_TIME_MIN = 2; // dock/undock time
export const SUBWAY_WAIT_MIN = 5; // average wait for next train (off-peak realistic default)

// Manhattan boundary (approx 96th St)
export const MANHATTAN_BOUNDARY_LAT = 40.7831;

// Cost per trip
export const COST_SUBWAY_RIDE = 2.9;
export const COST_METROCARD_UNLIMITED = 132;
export const COST_METROCARD_THRESHOLD = 45; // trips/month
export const COST_CITIBIKE_MONTHLY = 17.99;
export const COST_CITIBIKE_DAY_PASS = 19.69;
export const COST_CAR_RIDE = 15;
export const COST_OMNY_WEEKLY_CAP = 34;
export const WEEKS_PER_MONTH = 4.3;

// Default frequencies by category
export const DEFAULT_FREQUENCY: Record<DestinationCategory, number> = {
  work: 5,
  social: 1,
  fitness: 3,
  errands: 2,
  other: 1,
};

// Citi Bike GBFS
export const CITIBIKE_STATION_INFO_URL =
  "https://gbfs.citibikenyc.com/gbfs/en/station_information.json";

// H3 hex grid resolution — 10 = ~66m edge length. Crisp visual detail.
export const H3_RESOLUTION = 10;

// Initial NYC bounds — Manhattan + inner Brooklyn + inner Queens at res 10.
// Kept tight so the initial compute is fast. If a reach envelope hits the
// border (any edge cell reachable within the time budget), the explore page
// dynamically expands the bounds and recomputes with a loading state. See
// EXPANSION_STEP / MAX_BOUNDS for the expansion bookkeeping.
export const CORE_NYC_BOUNDS: BoundingBox = {
  sw: { lat: 40.63, lng: -74.03 },
  ne: { lat: 40.82, lng: -73.87 },
};

// Expansion — when the reach envelope hits a border, grow the bounds by this
// much lat/lng in the direction(s) that hit and recompute. Bounded by
// MAX_NYC_BOUNDS so we never wander into the ocean forever.
export const BOUNDS_EXPANSION_STEP = 0.04; // ~3 miles
export const MAX_NYC_BOUNDS: BoundingBox = {
  sw: { lat: 40.55, lng: -74.06 },
  ne: { lat: 40.90, lng: -73.72 },
};
