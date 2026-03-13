import type { BoundingBox, Destination, TransportMode, CompositeGridPoint, GridPoint, StationGraph, StationMatrix, CitiBikeStation } from "./types";

export interface GridResult {
  compositeGrid: CompositeGridPoint[];
  destGrids: Record<string, GridPoint[]>;
}

export function computeGrid(
  bounds: BoundingBox,
  destinations: Destination[],
  modes: TransportMode[],
  stationGraph: StationGraph,
  stationMatrix: StationMatrix,
  citiBikeStations: CitiBikeStation[]
): Promise<GridResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/grid-worker.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<GridResult>) => {
      resolve(e.data);
      worker.terminate();
    };

    worker.onerror = (e) => {
      reject(new Error(e.message));
      worker.terminate();
    };

    worker.postMessage({
      bounds,
      destinations,
      modes,
      stationGraph,
      stationMatrix,
      citiBikeStations,
    });
  });
}
