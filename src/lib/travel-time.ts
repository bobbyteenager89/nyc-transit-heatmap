import type { LatLng } from "./types";
import {
  WALK_SPEED,
  BIKE_SPEED,
  DRIVE_SPEED_MANHATTAN,
  DRIVE_SPEED_OUTER,
  BIKE_DOCK_TIME_MIN,
  MANHATTAN_BOUNDARY_LAT,
} from "./constants";

const DEG_LAT_TO_MI = 69.0;
const DEG_LNG_TO_MI_AT_NYC = 52.3; // cos(40.7) * 69

export function manhattanDistanceMi(a: LatLng, b: LatLng): number {
  const dLat = Math.abs(a.lat - b.lat) * DEG_LAT_TO_MI;
  const dLng = Math.abs(a.lng - b.lng) * DEG_LNG_TO_MI_AT_NYC;
  return dLat + dLng;
}

export function walkTime(from: LatLng, to: LatLng): number {
  return (manhattanDistanceMi(from, to) / WALK_SPEED) * 60;
}

export function bikeTime(from: LatLng, to: LatLng): number {
  return (manhattanDistanceMi(from, to) / BIKE_SPEED) * 60 + BIKE_DOCK_TIME_MIN * 2;
}

function isInManhattan(point: LatLng): boolean {
  return (
    point.lat <= MANHATTAN_BOUNDARY_LAT &&
    point.lng >= -74.02 &&
    point.lng <= -73.9
  );
}

export function driveTime(from: LatLng, to: LatLng): number {
  const bothManhattan = isInManhattan(from) && isInManhattan(to);
  const speed = bothManhattan ? DRIVE_SPEED_MANHATTAN : DRIVE_SPEED_OUTER;
  return (manhattanDistanceMi(from, to) / speed) * 60;
}
