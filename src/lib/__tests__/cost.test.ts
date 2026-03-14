import { describe, it, expect } from "vitest";
import { computeMonthlyCost, computeCostComparison } from "../cost";
import type { Destination, TransportMode } from "../types";
import {
  COST_SUBWAY_RIDE,
  COST_METROCARD_UNLIMITED,
  COST_CITIBIKE_MONTHLY,
  COST_OMNY_WEEKLY_CAP,
  COST_CAR_RIDE,
  WEEKS_PER_MONTH,
} from "../constants";

const workDest: Destination = {
  id: "1",
  name: "Work",
  address: "Midtown",
  location: { lat: 40.755, lng: -73.98 },
  category: "work",
  frequency: 5,
};

const gymDest: Destination = {
  id: "2",
  name: "Gym",
  address: "LES",
  location: { lat: 40.72, lng: -73.99 },
  category: "fitness",
  frequency: 3,
};

describe("computeMonthlyCost", () => {
  it("caps subway at unlimited MetroCard price", () => {
    // 5x/week * 2 roundtrips * 4.3 = 43 trips -> under 45, so per-ride
    // 43 * $2.90 = $124.70
    const cost = computeMonthlyCost(
      [workDest],
      [{ destId: "1", mode: "subway" as TransportMode }]
    );
    expect(cost).toBeCloseTo(124.7, 0);
  });

  it("adds Citi Bike flat fee when bike mode is used", () => {
    const cost = computeMonthlyCost(
      [workDest],
      [{ destId: "1", mode: "bike" as TransportMode }]
    );
    expect(cost).toBeCloseTo(17.99, 1);
  });

  it("sums costs across multiple destinations", () => {
    const cost = computeMonthlyCost(
      [workDest, gymDest],
      [
        { destId: "1", mode: "subway" as TransportMode },
        { destId: "2", mode: "car" as TransportMode },
      ]
    );
    // Subway: 5*2*4.3 = 43 trips * $2.90 = $124.70
    // Car: 3*2*4.3 = 25.8 trips * $15 = $387
    expect(cost).toBeCloseTo(124.7 + 387, 0);
  });
});

describe("computeCostComparison", () => {
  it("returns 3 subway options for subway commuters", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "subway" as TransportMode }]
    );

    expect(result.options).toHaveLength(3);
    expect(result.options[0].label).toBe("Pay-Per-Ride");
    expect(result.options[1].label).toBe("OMNY Cap");
    expect(result.options[2].label).toBe("Unlimited");
  });

  it("computes correct pay-per-ride cost", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "subway" as TransportMode }]
    );

    const expectedTrips = workDest.frequency * 2 * WEEKS_PER_MONTH; // 43
    const expectedCost = expectedTrips * COST_SUBWAY_RIDE;
    expect(result.options[0].monthlyCost).toBeCloseTo(expectedCost, 1);
  });

  it("computes correct OMNY cap cost", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "subway" as TransportMode }]
    );

    const expectedCost = Math.ceil(WEEKS_PER_MONTH) * COST_OMNY_WEEKLY_CAP; // 5 * $34 = $170
    expect(result.options[1].monthlyCost).toBeCloseTo(expectedCost, 1);
  });

  it("computes correct unlimited cost", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "subway" as TransportMode }]
    );

    expect(result.options[2].monthlyCost).toBe(COST_METROCARD_UNLIMITED);
  });

  it("highlights cheapest option", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "subway" as TransportMode }]
    );

    // For 5x/week commuter: pay-per-ride ~$124.70, OMNY ~$170, unlimited $132
    // Pay-per-ride is cheapest
    const cheapest = result.options[result.cheapestIndex];
    expect(cheapest.label).toBe("Pay-Per-Ride");
    expect(cheapest.monthlyCost).toBeLessThan(COST_METROCARD_UNLIMITED);
  });

  it("unlimited becomes cheapest with high frequency", () => {
    const heavyCommuter: Destination = {
      ...workDest,
      frequency: 7, // daily
    };
    const gym: Destination = {
      ...gymDest,
      frequency: 5,
    };

    const result = computeCostComparison(
      [heavyCommuter, gym],
      [
        { destId: "1", mode: "subway" as TransportMode },
        { destId: "2", mode: "subway" as TransportMode },
      ]
    );

    // (7+5)*2*4.3 = 103.2 trips * $2.90 = $299.28 per-ride
    // OMNY: 5 * $34 = $170
    // Unlimited: $132
    const cheapest = result.options[result.cheapestIndex];
    expect(cheapest.label).toBe("Unlimited");
  });

  it("adds bike cost to all options when bikeSubway is used", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "bikeSubway" as TransportMode }]
    );

    // All options should include COST_CITIBIKE_MONTHLY
    expect(result.options[0].monthlyCost).toBeGreaterThan(
      workDest.frequency * 2 * WEEKS_PER_MONTH * COST_SUBWAY_RIDE
    );
    expect(result.options[2].monthlyCost).toBe(
      COST_METROCARD_UNLIMITED + COST_CITIBIKE_MONTHLY
    );
  });

  it("returns bike-only option for bike mode", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "bike" as TransportMode }]
    );

    expect(result.options).toHaveLength(1);
    expect(result.options[0].label).toBe("Citi Bike");
    expect(result.options[0].monthlyCost).toBe(COST_CITIBIKE_MONTHLY);
  });

  it("returns free for walk-only", () => {
    const result = computeCostComparison(
      [workDest],
      [{ destId: "1", mode: "walk" as TransportMode }]
    );

    expect(result.options).toHaveLength(1);
    expect(result.options[0].label).toBe("Walking");
    expect(result.options[0].monthlyCost).toBe(0);
  });

  it("tracks trips per week correctly", () => {
    const result = computeCostComparison(
      [workDest, gymDest],
      [
        { destId: "1", mode: "subway" as TransportMode },
        { destId: "2", mode: "subway" as TransportMode },
      ]
    );

    // Work: 5*2=10, Gym: 3*2=6 => 16 trips/week
    expect(result.tripsPerWeek).toBe(16);
  });

  it("adds car cost to all options", () => {
    const result = computeCostComparison(
      [workDest, gymDest],
      [
        { destId: "1", mode: "subway" as TransportMode },
        { destId: "2", mode: "car" as TransportMode },
      ]
    );

    const expectedCarCost = gymDest.frequency * 2 * WEEKS_PER_MONTH * COST_CAR_RIDE;
    expect(result.carCost).toBeCloseTo(expectedCarCost, 1);
    // Car cost is added to all options
    expect(result.options[2].monthlyCost).toBeCloseTo(
      COST_METROCARD_UNLIMITED + expectedCarCost,
      1
    );
  });
});
