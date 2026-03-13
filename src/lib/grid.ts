import type { BoundingBox, Destination, TransportMode, CompositeGridPoint, GridPoint, StationGraph, StationMatrix, CitiBikeStation, LatLng } from "./types";

export interface GridResult {
  compositeGrid: CompositeGridPoint[];
  destGrids: Record<string, GridPoint[]>;
}

let activeWorker: Worker | null = null;

export function computeGrid(
  bounds: BoundingBox,
  origin: LatLng,
  destinations: Destination[],
  modes: TransportMode[],
  stationGraph: StationGraph,
  stationMatrix: StationMatrix,
  citiBikeStations: CitiBikeStation[]
): Promise<GridResult> {
  // Cancel any in-flight worker
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/grid-worker.ts", import.meta.url));
    activeWorker = worker;

    worker.onmessage = (e: MessageEvent<GridResult>) => {
      resolve(e.data);
      activeWorker = null;
      worker.terminate();
    };

    worker.onerror = (e) => {
      reject(new Error(e.message));
      activeWorker = null;
      worker.terminate();
    };

    worker.postMessage({
      bounds,
      origin,
      destinations,
      modes,
      stationGraph,
      stationMatrix,
      citiBikeStations,
    });
  });
}
