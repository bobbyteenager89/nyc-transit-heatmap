export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

export interface BusData {
  stops: BusStop[];
}

/**
 * Two bus stops are "connected" only if they share at least one route.
 * Without this check, any stop-pair was modeled as a direct bus ride,
 * which falsely inflated bus reach across disconnected corridors.
 * Stops with empty routes[] return false — callers should ensure
 * populate-bus-routes.ts has been run.
 */
export function stopsShareRoute(a: BusStop, b: BusStop): boolean {
  if (a.routes.length === 0 || b.routes.length === 0) return false;
  for (const r of a.routes) {
    if (b.routes.includes(r)) return true;
  }
  return false;
}

let cached: BusData | null = null;

export async function loadBusData(): Promise<BusData> {
  if (cached) return cached;
  const res = await fetch("/data/bus-stops.json");
  if (!res.ok) {
    console.warn(`Failed to load bus data: ${res.status}`);
    return { stops: [] };
  }
  cached = await res.json();
  return cached!;
}
