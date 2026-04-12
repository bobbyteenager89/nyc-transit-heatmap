import type { LatLng, StationGraph, StationMatrix } from "./types";
import { manhattanDistanceMi } from "./travel-time";
import { SUBWAY_MAX_WALK_MI, SUBWAY_WAIT_MIN, WALK_SPEED } from "./constants";

interface NearestStation {
  stationId: string;
  walkMinutes: number;
  distanceMi: number;
}

export class SubwayData {
  private graph: StationGraph;
  private matrix: StationMatrix;
  private idxMap: Map<string, number>;

  constructor(graph: StationGraph, matrix: StationMatrix) {
    this.graph = graph;
    this.matrix = matrix;
    this.idxMap = new Map(matrix.stationIds.map((id, i) => [id, i]));
  }

  findNearest(point: LatLng, count: number): NearestStation[] {
    const stations = Object.entries(this.graph.stations)
      .map(([id, s]) => ({
        stationId: id,
        distanceMi: manhattanDistanceMi(point, { lat: s.lat, lng: s.lng }),
      }))
      .filter((s) => s.distanceMi <= SUBWAY_MAX_WALK_MI)
      .sort((a, b) => a.distanceMi - b.distanceMi)
      .slice(0, count);

    return stations.map((s) => ({
      ...s,
      walkMinutes: (s.distanceMi / WALK_SPEED) * 60,
    }));
  }

  stationToStationTime(fromId: string, toId: string): number | null {
    const i = this.idxMap.get(fromId);
    const j = this.idxMap.get(toId);
    if (i === undefined || j === undefined) return null;
    const time = this.matrix.times[i][j];
    return time >= 999 ? null : time;
  }

  getStation(id: string) {
    return this.graph.stations[id] ?? null;
  }

  get allStations() {
    return this.graph.stations;
  }
}

export function computeSubwayTime(
  subway: SubwayData,
  from: LatLng,
  to: LatLng
): number | null {
  const nearOrigin = subway.findNearest(from, 3);
  const nearDest = subway.findNearest(to, 3);

  if (nearOrigin.length === 0 || nearDest.length === 0) return null;

  let best = Infinity;

  for (const origin of nearOrigin) {
    for (const dest of nearDest) {
      const stationTime = subway.stationToStationTime(origin.stationId, dest.stationId);
      if (stationTime === null) continue;

      const total = origin.walkMinutes + SUBWAY_WAIT_MIN + stationTime + dest.walkMinutes;
      if (total < best) best = total;
    }
  }

  return best === Infinity ? null : Math.round(best * 10) / 10;
}
