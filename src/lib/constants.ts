import type { BoundingBox, DestinationCategory } from "./types";

// Speeds in mph
export const WALK_SPEED = 3;
export const BIKE_SPEED = 9;
export const DRIVE_SPEED_MANHATTAN = 12;
export const DRIVE_SPEED_OUTER = 20;

export const FERRY_SPEED_MPH = 15;
export const FERRY_MAX_WALK_MI = 1.0; // max walk to/from terminal

// Thresholds
export const BIKE_DOCK_RANGE_MI = 0.25; // 5-min walk
export const SUBWAY_MAX_WALK_MI = 1.5;
export const BIKE_SUBWAY_DOCK_RANGE_MI = 0.5;
export const BIKE_DOCK_TIME_MIN = 2; // dock/undock time
export const BIKE_SAVINGS_PERCENT = 0.2; // 20% threshold
export const BIKE_SAVINGS_MIN = 5; // 5-min threshold

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

// H3 hex grid
export const H3_RESOLUTION = 10; // ~66m edge length, ~150k cells over core NYC

// Core NYC bounds (Manhattan + Brooklyn + nearby Queens)
export const CORE_NYC_BOUNDS: BoundingBox = {
  sw: { lat: 40.63, lng: -74.04 },
  ne: { lat: 40.83, lng: -73.87 },
};
