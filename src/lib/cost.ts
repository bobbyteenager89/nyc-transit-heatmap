import type { Destination, TransportMode } from "./types";
import {
  COST_SUBWAY_RIDE,
  COST_METROCARD_UNLIMITED,
  COST_METROCARD_THRESHOLD,
  COST_CITIBIKE_MONTHLY,
  COST_CAR_RIDE,
  COST_OMNY_WEEKLY_CAP,
  WEEKS_PER_MONTH,
} from "./constants";

interface DestinationMode {
  destId: string;
  mode: TransportMode;
}

export interface CostOption {
  label: string;
  monthlyCost: number;
  description: string;
}

export interface CostComparison {
  options: CostOption[];
  cheapestIndex: number;
  tripsPerWeek: number;
  subwayTripsPerMonth: number;
  bikeTripsPerMonth: number;
  carCost: number;
}

/**
 * Compute cost comparison across transit pass options.
 * Returns pay-per-ride, unlimited MetroCard, OMNY cap, and Citi Bike options
 * so the user can see which is cheapest for their usage.
 */
export function computeCostComparison(
  destinations: Destination[],
  destinationModes: DestinationMode[]
): CostComparison {
  let subwayTripsPerMonth = 0;
  let bikeTripsPerMonth = 0;
  let carCost = 0;
  let totalTripsPerWeek = 0;
  let usesBike = false;

  const destMap = new Map(destinations.map((d) => [d.id, d]));

  for (const { destId, mode } of destinationModes) {
    const dest = destMap.get(destId);
    if (!dest) continue;

    const monthlyTrips = dest.frequency * 2 * WEEKS_PER_MONTH; // round trips
    totalTripsPerWeek += dest.frequency * 2; // round trips per week

    switch (mode) {
      case "subway":
      case "bus":
      case "ferry":
        subwayTripsPerMonth += monthlyTrips;
        break;
      case "car":
        carCost += monthlyTrips * COST_CAR_RIDE;
        break;
      case "bike":
        usesBike = true;
        bikeTripsPerMonth += monthlyTrips;
        break;
      case "ownbike":
      case "walk":
        break;
    }
  }

  const bikeCost = usesBike ? COST_CITIBIKE_MONTHLY : 0;
  const options: CostOption[] = [];

  if (subwayTripsPerMonth > 0) {
    // Option 1: Pay-per-ride (OMNY/MetroCard)
    const perRide = subwayTripsPerMonth * COST_SUBWAY_RIDE + bikeCost + carCost;
    options.push({
      label: "Pay-Per-Ride",
      monthlyCost: perRide,
      description: `${Math.round(subwayTripsPerMonth)} rides × $${COST_SUBWAY_RIDE.toFixed(2)}`,
    });

    // Option 2: OMNY weekly cap
    const omnyCost = Math.ceil(WEEKS_PER_MONTH) * COST_OMNY_WEEKLY_CAP + bikeCost + carCost;
    options.push({
      label: "OMNY Cap",
      monthlyCost: omnyCost,
      description: `$${COST_OMNY_WEEKLY_CAP}/wk cap × ${Math.ceil(WEEKS_PER_MONTH)} wks`,
    });

    // Option 3: Unlimited MetroCard
    const unlimited = COST_METROCARD_UNLIMITED + bikeCost + carCost;
    options.push({
      label: "Unlimited",
      monthlyCost: unlimited,
      description: `$${COST_METROCARD_UNLIMITED}/mo flat`,
    });
  } else if (usesBike) {
    // Bike-only trips
    options.push({
      label: "Citi Bike",
      monthlyCost: bikeCost + carCost,
      description: `$${COST_CITIBIKE_MONTHLY}/mo membership`,
    });
  }

  // If car-only, show that
  if (options.length === 0 && carCost > 0) {
    options.push({
      label: "Rideshare",
      monthlyCost: carCost,
      description: `Est. $${COST_CAR_RIDE}/ride`,
    });
  }

  // Walk-only: free
  if (options.length === 0) {
    options.push({
      label: "Walking",
      monthlyCost: 0,
      description: "Free!",
    });
  }

  // Find cheapest
  let cheapestIndex = 0;
  for (let i = 1; i < options.length; i++) {
    if (options[i].monthlyCost < options[cheapestIndex].monthlyCost) {
      cheapestIndex = i;
    }
  }

  return {
    options,
    cheapestIndex,
    tripsPerWeek: totalTripsPerWeek,
    subwayTripsPerMonth,
    bikeTripsPerMonth,
    carCost,
  };
}

/**
 * Simple total monthly cost (used by existing code).
 */
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
      case "bus":
      case "ferry":
        totalSubwayTrips += monthlyTrips;
        break;
      case "car":
        totalCost += monthlyTrips * COST_CAR_RIDE;
        break;
      case "bike":
        usesBike = true;
        break;
      case "ownbike":
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
