import type { CitiBikeStation, LatLng } from "./types";
import { manhattanDistanceMi } from "./travel-time";
import { CITIBIKE_STATION_INFO_URL, BIKE_DOCK_RANGE_MI } from "./constants";

export class CitiBikeData {
  private stations: CitiBikeStation[];

  constructor(stations: CitiBikeStation[]) {
    this.stations = stations;
  }

  static async fetch(): Promise<CitiBikeData> {
    const res = await fetch(CITIBIKE_STATION_INFO_URL);
    const json = await res.json();
    const stations: CitiBikeStation[] = json.data.stations.map((s: any) => ({
      id: s.station_id,
      name: s.name,
      lat: s.lat,
      lng: s.lon,
      capacity: s.capacity,
    }));
    return new CitiBikeData(stations);
  }

  findNearestDock(point: LatLng, maxDistMi: number = BIKE_DOCK_RANGE_MI): CitiBikeStation | null {
    let best: CitiBikeStation | null = null;
    let bestDist = maxDistMi;

    for (const s of this.stations) {
      const d = manhattanDistanceMi(point, { lat: s.lat, lng: s.lng });
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  hasDockNearby(point: LatLng, maxDistMi: number = BIKE_DOCK_RANGE_MI): boolean {
    return this.findNearestDock(point, maxDistMi) !== null;
  }

  getAllStations(): CitiBikeStation[] {
    return this.stations;
  }
}
