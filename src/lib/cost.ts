import type { Destination, TransportMode } from "./types";
import {
  COST_SUBWAY_RIDE,
  COST_METROCARD_UNLIMITED,
  COST_METROCARD_THRESHOLD,
  COST_CITIBIKE_MONTHLY,
  COST_CAR_RIDE,
  WEEKS_PER_MONTH,
} from "./constants";

interface DestinationMode {
  destId: string;
  mode: TransportMode;
}

export function computeMonthlyCost(
  destinations: Destination[],
  destinationModes: DestinationMode[]
): number {
  let totalCost = 0;
  let totalSubwayTrips = 0;
  let usesBike = false;

  const destMap = new Map(destinations.map((d) => [d.id, d]));

  for (const { destId, mode } of destinationModes) {
    const dest = destMap.get(destId);
    if (!dest) continue;

    const monthlyTrips = dest.frequency * 2 * WEEKS_PER_MONTH;

    switch (mode) {
      case "subway":
      case "bikeSubway":
        totalSubwayTrips += monthlyTrips;
        if (mode === "bikeSubway") usesBike = true;
        break;
      case "car":
        totalCost += monthlyTrips * COST_CAR_RIDE;
        break;
      case "bike":
        usesBike = true;
        break;
      case "walk":
        break;
    }
  }

  // Subway cost: per-ride or unlimited
  if (totalSubwayTrips > 0) {
    const perRideCost = totalSubwayTrips * COST_SUBWAY_RIDE;
    totalCost += totalSubwayTrips > COST_METROCARD_THRESHOLD
      ? COST_METROCARD_UNLIMITED
      : perRideCost;
  }

  if (usesBike) {
    totalCost += COST_CITIBIKE_MONTHLY;
  }

  return totalCost;
}
