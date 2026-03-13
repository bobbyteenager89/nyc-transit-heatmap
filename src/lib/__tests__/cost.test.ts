import { describe, it, expect } from "vitest";
import { computeMonthlyCost } from "../cost";
import type { Destination, TransportMode } from "../types";

const workDest: Destination = {
  id: "1",
  name: "Work",
  address: "Midtown",
  location: { lat: 40.755, lng: -73.98 },
  category: "work",
  frequency: 5,
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
    // $17.99 membership
    expect(cost).toBeCloseTo(17.99, 1);
  });

  it("sums costs across multiple destinations", () => {
    const gymDest: Destination = {
      id: "2", name: "Gym", address: "LES",
      location: { lat: 40.72, lng: -73.99 },
      category: "fitness", frequency: 3,
    };
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
