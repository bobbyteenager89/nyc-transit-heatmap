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
