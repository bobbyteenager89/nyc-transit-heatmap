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
  ferryTerminals?: { id: string; name: string; lat: number; lng: number; routes: string[] }[];
  ferryAdjacency?: Record<string, Record<string, number>>;
  busStops?: { id: string; name: string; lat: number; lng: number; routes: string[] }[];
}

export function computeHexGrid(
  input: HexWorkerInput,
  onProgress?: (percent: number) => void
): Promise<HexGridResult> {
  // Cancel any in-flight worker
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/grid-worker.ts", import.meta.url));
    activeWorker = worker;

    // 60s timeout (increased for res 10 with ~150k cells)
    const timeout = setTimeout(() => {
      worker.terminate();
      activeWorker = null;
      reject(new Error("Grid computation timed out after 60s"));
    }, 60000);

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;
      if (data.type === 'progress') {
        onProgress?.(data.percent);
      } else if (data.type === 'result') {
        clearTimeout(timeout);
        resolve({ cells: data.cells });
        activeWorker = null;
        worker.terminate();
      } else if (data.cells) {
        // Legacy format fallback
        clearTimeout(timeout);
        resolve(data as HexGridResult);
        activeWorker = null;
        worker.terminate();
      }
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
