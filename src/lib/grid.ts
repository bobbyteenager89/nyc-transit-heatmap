import type { Destination, TransportMode, HexCell, HexGridResult, StationGraph, StationMatrix, CitiBikeStation, LatLng } from "./types";

export type { HexGridResult };

let persistentWorker: Worker | null = null;
let dataLoaded = false;
let pendingReject: ((err: Error) => void) | null = null;

/** Signature of the transit data that was last loaded into the worker. */
let loadedDataSignature = "";

export interface HexWorkerInput {
  hexCenters: { h3Index: string; lat: number; lng: number }[];
  origin: LatLng | null;
  destinations: Destination[];
  modes: TransportMode[];
  stationGraph: StationGraph;
  stationMatrix: StationMatrix;
  citiBikeStations: CitiBikeStation[];
  ferryTerminals?: { id: string; name: string; lat: number; lng: number; routes: string[] }[];
  ferryAdjacency?: Record<string, Record<string, number>>;
  busStops?: { id: string; name: string; lat: number; lng: number; routes: string[] }[];
}

function getOrCreateWorker(): Worker {
  if (!persistentWorker) {
    persistentWorker = new Worker(new URL("../workers/grid-worker.ts", import.meta.url));
    dataLoaded = false;
    loadedDataSignature = "";
  }
  return persistentWorker;
}

/** Build a lightweight fingerprint from transit data to detect when LOAD_DATA needs to be re-sent. */
function dataSignature(input: { stationGraph: StationGraph; stationMatrix: StationMatrix; citiBikeStations: CitiBikeStation[]; ferryTerminals?: { id: string; name: string; lat: number; lng: number; routes: string[] }[]; busStops?: { id: string; name: string; lat: number; lng: number; routes: string[] }[] }): string {
  return `${Object.keys(input.stationGraph.stations).length}:${input.stationMatrix.stationIds.length}:${input.citiBikeStations.length}:${input.ferryTerminals?.length ?? 0}:${input.busStops?.length ?? 0}`;
}

export type WarmupInput = Pick<HexWorkerInput,
  "stationGraph" | "stationMatrix" | "citiBikeStations" | "ferryTerminals" | "ferryAdjacency" | "busStops"
>;

/**
 * Pre-spin the grid worker and send LOAD_DATA before the user clicks anything.
 * Removes the worker-bootstrap + structured-clone serialization component of
 * the first-interaction stall: by the time the user clicks a quick-pick, the
 * worker is initialized and the transit data is loaded, so the click only
 * triggers COMPUTE (a small message).
 *
 * Safe to call multiple times — short-circuits if the worker already holds
 * matching data. If the user clicks during the warm-up window, computeHexGrid
 * will overwrite worker.onmessage and proceed normally (the warmup listener
 * simply never fires, no state is corrupted).
 */
export function warmGridWorker(input: WarmupInput): void {
  const sig = dataSignature(input);
  if (dataLoaded && sig === loadedDataSignature) return;

  const worker = getOrCreateWorker();
  const handler = (e: MessageEvent) => {
    if (e.data?.type === "data_loaded") {
      dataLoaded = true;
      loadedDataSignature = sig;
      if (worker.onmessage === handler) worker.onmessage = null;
    }
  };
  worker.onmessage = handler;

  worker.postMessage({
    type: "LOAD_DATA",
    stationGraph: input.stationGraph,
    stationMatrix: input.stationMatrix,
    citiBikeStations: input.citiBikeStations,
    ferryTerminals: input.ferryTerminals ?? [],
    ferryAdjacency: input.ferryAdjacency ?? {},
    busStops: input.busStops ?? [],
  });
}

export function computeHexGrid(
  input: HexWorkerInput,
  onProgress?: (percent: number) => void
): Promise<HexGridResult> {
  // Cancel any in-flight computation (reject pending promise)
  if (pendingReject) {
    pendingReject(new Error("Computation cancelled — new compute started"));
    pendingReject = null;
  }

  const worker = getOrCreateWorker();
  const sig = dataSignature(input);
  const needsLoad = !dataLoaded || sig !== loadedDataSignature;

  return new Promise((resolve, reject) => {
    pendingReject = reject;

    // 60s timeout
    const timeout = setTimeout(() => {
      pendingReject = null;
      // Kill the worker on timeout so next call starts fresh
      persistentWorker?.terminate();
      persistentWorker = null;
      dataLoaded = false;
      loadedDataSignature = "";
      reject(new Error("Grid computation timed out after 60s"));
    }, 60000);

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;

      if (data.type === "data_loaded") {
        dataLoaded = true;
        loadedDataSignature = sig;
        // Data loaded — now send the COMPUTE message
        worker.postMessage({
          type: "COMPUTE",
          hexCenters: input.hexCenters,
          origin: input.origin,
          destinations: input.destinations,
          modes: input.modes,
        });
        return;
      }

      if (data.type === "progress") {
        onProgress?.(data.percent);
        return;
      }

      if (data.type === "result") {
        clearTimeout(timeout);
        pendingReject = null;
        resolve({ cells: data.cells });
        return;
      }

      if (data.type === "error") {
        clearTimeout(timeout);
        pendingReject = null;
        reject(new Error(data.message));
        return;
      }

      // Legacy fallback
      if (data.cells) {
        clearTimeout(timeout);
        pendingReject = null;
        resolve(data as HexGridResult);
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      pendingReject = null;
      reject(new Error(e.message));
      // Kill on error so next call starts fresh
      persistentWorker?.terminate();
      persistentWorker = null;
      dataLoaded = false;
      loadedDataSignature = "";
    };

    if (needsLoad) {
      // Send LOAD_DATA first — worker will build spatial indexes
      worker.postMessage({
        type: "LOAD_DATA",
        stationGraph: input.stationGraph,
        stationMatrix: input.stationMatrix,
        citiBikeStations: input.citiBikeStations,
        ferryTerminals: input.ferryTerminals ?? [],
        ferryAdjacency: input.ferryAdjacency ?? {},
        busStops: input.busStops ?? [],
      });
    } else {
      // Data already loaded — send COMPUTE directly
      worker.postMessage({
        type: "COMPUTE",
        hexCenters: input.hexCenters,
        origin: input.origin,
        destinations: input.destinations,
        modes: input.modes,
      });
    }
  });
}
