import type { LatLng } from "./types";

export interface GymChain {
  id: string;
  name: string;
  locations: { name: string; latlng: LatLng }[];
}

/** Top NYC gym chains with their locations. Coordinates are approximate centroids. */
export const GYM_CHAINS: GymChain[] = [
  {
    id: "equinox",
    name: "Equinox",
    locations: [
      { name: "Equinox — E 63rd St", latlng: { lat: 40.7644, lng: -73.9681 } },
      { name: "Equinox — E 44th St", latlng: { lat: 40.7542, lng: -73.9747 } },
      { name: "Equinox — Greenwich Ave", latlng: { lat: 40.7370, lng: -73.9994 } },
      { name: "Equinox — Hudson Yards", latlng: { lat: 40.7536, lng: -74.0003 } },
      { name: "Equinox — Brookfield Place", latlng: { lat: 40.7133, lng: -74.0154 } },
      { name: "Equinox — E 85th St", latlng: { lat: 40.7792, lng: -73.9565 } },
      { name: "Equinox — W 92nd St", latlng: { lat: 40.7906, lng: -73.9729 } },
      { name: "Equinox — Williamsburg", latlng: { lat: 40.7141, lng: -73.9613 } },
      { name: "Equinox — DUMBO", latlng: { lat: 40.7033, lng: -73.9893 } },
      { name: "Equinox — Flatiron", latlng: { lat: 40.7395, lng: -73.9903 } },
      { name: "Equinox — SoHo", latlng: { lat: 40.7235, lng: -73.9997 } },
      { name: "Equinox — Wall Street", latlng: { lat: 40.7068, lng: -74.0090 } },
    ],
  },
  {
    id: "planet-fitness",
    name: "Planet Fitness",
    locations: [
      { name: "Planet Fitness — E 34th St", latlng: { lat: 40.7469, lng: -73.9789 } },
      { name: "Planet Fitness — W 42nd St", latlng: { lat: 40.7572, lng: -73.9914 } },
      { name: "Planet Fitness — W 125th St", latlng: { lat: 40.8087, lng: -73.9507 } },
      { name: "Planet Fitness — E 14th St", latlng: { lat: 40.7339, lng: -73.9902 } },
      { name: "Planet Fitness — Bronx Hub", latlng: { lat: 40.8215, lng: -73.9104 } },
      { name: "Planet Fitness — Flatbush", latlng: { lat: 40.6516, lng: -73.9569 } },
      { name: "Planet Fitness — Jamaica", latlng: { lat: 40.7029, lng: -73.7899 } },
      { name: "Planet Fitness — Astoria", latlng: { lat: 40.7707, lng: -73.9173 } },
      { name: "Planet Fitness — Fordham", latlng: { lat: 40.8603, lng: -73.8898 } },
    ],
  },
  {
    id: "blink-fitness",
    name: "Blink Fitness",
    locations: [
      { name: "Blink Fitness — E 14th St", latlng: { lat: 40.7341, lng: -73.9895 } },
      { name: "Blink Fitness — W 125th St", latlng: { lat: 40.8087, lng: -73.9483 } },
      { name: "Blink Fitness — E 116th St", latlng: { lat: 40.7969, lng: -73.9415 } },
      { name: "Blink Fitness — Grand Concourse", latlng: { lat: 40.8261, lng: -73.9226 } },
      { name: "Blink Fitness — Fulton St", latlng: { lat: 40.6876, lng: -73.9762 } },
      { name: "Blink Fitness — Bay Ridge", latlng: { lat: 40.6301, lng: -74.0285 } },
      { name: "Blink Fitness — Jackson Heights", latlng: { lat: 40.7477, lng: -73.8814 } },
      { name: "Blink Fitness — Fordham", latlng: { lat: 40.8614, lng: -73.8969 } },
    ],
  },
  {
    id: "crunch",
    name: "Crunch Fitness",
    locations: [
      { name: "Crunch — E 34th St", latlng: { lat: 40.7470, lng: -73.9793 } },
      { name: "Crunch — W 83rd St", latlng: { lat: 40.7856, lng: -73.9739 } },
      { name: "Crunch — E 13th St", latlng: { lat: 40.7329, lng: -73.9899 } },
      { name: "Crunch — Bushwick", latlng: { lat: 40.6991, lng: -73.9217 } },
      { name: "Crunch — Park Slope", latlng: { lat: 40.6728, lng: -73.9791 } },
      { name: "Crunch — Prospect Heights", latlng: { lat: 40.6799, lng: -73.9710 } },
      { name: "Crunch — Long Island City", latlng: { lat: 40.7456, lng: -73.9367 } },
    ],
  },
  {
    id: "nysc",
    name: "New York Sports Club",
    locations: [
      { name: "NYSC — W 76th St", latlng: { lat: 40.7800, lng: -73.9768 } },
      { name: "NYSC — E 41st St", latlng: { lat: 40.7519, lng: -73.9769 } },
      { name: "NYSC — E 86th St", latlng: { lat: 40.7793, lng: -73.9536 } },
      { name: "NYSC — W 23rd St", latlng: { lat: 40.7428, lng: -73.9956 } },
      { name: "NYSC — Murray Hill", latlng: { lat: 40.7460, lng: -73.9782 } },
    ],
  },
  {
    id: "ymca",
    name: "YMCA",
    locations: [
      { name: "YMCA — W 63rd St", latlng: { lat: 40.7717, lng: -73.9838 } },
      { name: "YMCA — E 47th St", latlng: { lat: 40.7545, lng: -73.9730 } },
      { name: "YMCA — Harlem", latlng: { lat: 40.8083, lng: -73.9464 } },
      { name: "YMCA — Prospect Park", latlng: { lat: 40.6618, lng: -73.9622 } },
      { name: "YMCA — Greenpoint", latlng: { lat: 40.7280, lng: -73.9524 } },
      { name: "YMCA — Long Island City", latlng: { lat: 40.7532, lng: -73.9389 } },
      { name: "YMCA — Flushing", latlng: { lat: 40.7625, lng: -73.8303 } },
      { name: "YMCA — Cross Island", latlng: { lat: 40.7738, lng: -73.7543 } },
    ],
  },
  {
    id: "chelsea-piers",
    name: "Chelsea Piers Fitness",
    locations: [
      { name: "Chelsea Piers — W 23rd St", latlng: { lat: 40.7462, lng: -74.0079 } },
    ],
  },
  {
    id: "lifetime",
    name: "Life Time",
    locations: [
      { name: "Life Time — Sky (W 33rd St)", latlng: { lat: 40.7502, lng: -73.9990 } },
    ],
  },
  {
    id: "orangetheory",
    name: "Orangetheory Fitness",
    locations: [
      { name: "OTF — Flatiron", latlng: { lat: 40.7393, lng: -73.9911 } },
      { name: "OTF — W 60th St", latlng: { lat: 40.7718, lng: -73.9870 } },
      { name: "OTF — E 85th St", latlng: { lat: 40.7791, lng: -73.9541 } },
      { name: "OTF — Williamsburg", latlng: { lat: 40.7146, lng: -73.9582 } },
      { name: "OTF — Park Slope", latlng: { lat: 40.6710, lng: -73.9818 } },
      { name: "OTF — Astoria", latlng: { lat: 40.7699, lng: -73.9134 } },
    ],
  },
  {
    id: "solidcore",
    name: "[solidcore]",
    locations: [
      { name: "[solidcore] — Flatiron", latlng: { lat: 40.7399, lng: -73.9903 } },
      { name: "[solidcore] — Tribeca", latlng: { lat: 40.7195, lng: -74.0089 } },
      { name: "[solidcore] — UWS", latlng: { lat: 40.7791, lng: -73.9808 } },
    ],
  },
];

/** Search gym chains by name. Case-insensitive partial match. */
export function searchGymChains(query: string): GymChain[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return GYM_CHAINS.filter((chain) => chain.name.toLowerCase().includes(q));
}

/** Get a gym chain by its ID */
export function getGymChainById(id: string): GymChain | undefined {
  return GYM_CHAINS.find((chain) => chain.id === id);
}
