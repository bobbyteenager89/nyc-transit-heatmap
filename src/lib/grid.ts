import type { Destination, TransportMode, HexCell, HexGridResult, StationGraph, StationMatrix, CitiBikeStation, LatLng } from "./types";

export type { HexGridResult };

let activeWorker: Worker | null = null;

export interface HexWorkerInput {
  hexCenters: { h3Index: string; lat: number; lng: number }[];
  origin: LatLng | null; // null for wizard mode (no single origin)
  destinations: Destination[];
  modes: TransportMode[];
  stationGraph: StationGraph;
  stationMatrix: StationMatrix;
  citiBikeStations: CitiBikeStation[];
}

export function computeHexGrid(input: HexWorkerInput): Promise<HexGridResult> {
  // Cancel any in-flight worker
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/grid-worker.ts", import.meta.url));
    activeWorker = worker;

    // 30s timeout
    const timeout = setTimeout(() => {
      worker.terminate();
      activeWorker = null;
      reject(new Error("Grid computation timed out after 30s"));
    }, 30000);

    worker.onmessage = (e: MessageEvent<HexGridResult>) => {
      clearTimeout(timeout);
      resolve(e.data);
      activeWorker = null;
      worker.terminate();
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      reject(new Error(e.message));
      activeWorker = null;
      worker.terminate();
    };

    worker.postMessage(input);
  });
}
