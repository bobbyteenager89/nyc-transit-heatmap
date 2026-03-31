export interface Neighborhood {
  name: string;
  borough: string;
  center: { lat: number; lng: number };
}

export const NYC_NEIGHBORHOODS: Neighborhood[] = [
  { name: "Williamsburg", borough: "Brooklyn", center: { lat: 40.7081, lng: -73.9571 } },
  { name: "East Village", borough: "Manhattan", center: { lat: 40.7265, lng: -73.9815 } },
  { name: "Upper West Side", borough: "Manhattan", center: { lat: 40.7870, lng: -73.9754 } },
  { name: "Park Slope", borough: "Brooklyn", center: { lat: 40.6710, lng: -73.9777 } },
  { name: "Astoria", borough: "Queens", center: { lat: 40.7723, lng: -73.9301 } },
  { name: "Chelsea", borough: "Manhattan", center: { lat: 40.7465, lng: -74.0014 } },
  { name: "Lower East Side", borough: "Manhattan", center: { lat: 40.7150, lng: -73.9843 } },
  { name: "Greenpoint", borough: "Brooklyn", center: { lat: 40.7274, lng: -73.9510 } },
  { name: "Harlem", borough: "Manhattan", center: { lat: 40.8116, lng: -73.9465 } },
  { name: "DUMBO", borough: "Brooklyn", center: { lat: 40.7033, lng: -73.9890 } },
  { name: "West Village", borough: "Manhattan", center: { lat: 40.7336, lng: -74.0027 } },
  { name: "Bushwick", borough: "Brooklyn", center: { lat: 40.6942, lng: -73.9215 } },
  { name: "Long Island City", borough: "Queens", center: { lat: 40.7440, lng: -73.9560 } },
  { name: "SoHo", borough: "Manhattan", center: { lat: 40.7233, lng: -73.9985 } },
  { name: "Financial District", borough: "Manhattan", center: { lat: 40.7075, lng: -74.0089 } },
  { name: "Prospect Heights", borough: "Brooklyn", center: { lat: 40.6775, lng: -73.9692 } },
  { name: "Midtown", borough: "Manhattan", center: { lat: 40.7549, lng: -73.9840 } },
  { name: "Bed-Stuy", borough: "Brooklyn", center: { lat: 40.6872, lng: -73.9418 } },
  { name: "Crown Heights", borough: "Brooklyn", center: { lat: 40.6694, lng: -73.9422 } },
  { name: "Murray Hill", borough: "Manhattan", center: { lat: 40.7488, lng: -73.9757 } },
  { name: "Cobble Hill", borough: "Brooklyn", center: { lat: 40.6860, lng: -73.9969 } },
  { name: "Hell's Kitchen", borough: "Manhattan", center: { lat: 40.7638, lng: -73.9918 } },
  { name: "Tribeca", borough: "Manhattan", center: { lat: 40.7163, lng: -74.0086 } },
  { name: "Fort Greene", borough: "Brooklyn", center: { lat: 40.6892, lng: -73.9747 } },
  { name: "Gramercy", borough: "Manhattan", center: { lat: 40.7368, lng: -73.9845 } },
];

export const LANDMARKS = [
  { name: "Times Square", lat: 40.7580, lng: -73.9855 },
  { name: "Union Square", lat: 40.7359, lng: -73.9911 },
  { name: "Grand Central", lat: 40.7527, lng: -73.9772 },
  { name: "Atlantic Ave", lat: 40.6862, lng: -73.9776 },
  { name: "Penn Station", lat: 40.7506, lng: -73.9935 },
];
