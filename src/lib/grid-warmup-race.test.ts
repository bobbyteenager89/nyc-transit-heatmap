// Regression test for the S37 warmup race: warmGridWorker runs via
// requestIdleCallback, so it can fire AFTER computeHexGrid has installed its
// onmessage handler. Before the fix it overwrote that handler, swallowed the
// worker's data_loaded ack, and COMPUTE was never dispatched — the UI hung at
// "Computing… 0%" until the 60s watchdog killed the worker. Hit on every
// share-link load and any quick-start click inside the warmup window.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture worker instances created by grid.ts
class FakeWorker {
  static instances: FakeWorker[] = [];
  posted: { type: string }[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(msg: { type: string }) {
    this.posted.push(msg);
  }
  terminate() {}
  // Test helper: emit a message from the "worker"
  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

vi.stubGlobal("Worker", FakeWorker);

// Import AFTER stubbing so grid.ts constructs FakeWorker
const { computeHexGrid, warmGridWorker } = await import("./grid");

function makeInput() {
  return {
    hexCenters: [{ h3Index: "a", lat: 40.7, lng: -73.99 }],
    origin: { lat: 40.7, lng: -73.99 },
    destinations: [],
    modes: ["walk" as const],
    stationGraph: { stations: { s1: { id: "s1", name: "x", lat: 40.7, lng: -73.99, lines: [] } } } as never,
    stationMatrix: { stationIds: ["s1"], matrix: [[0]] } as never,
    citiBikeStations: [],
    ferryTerminals: [],
    ferryAdjacency: {},
    busStops: [],
  };
}

describe("grid worker warmup race", () => {
  beforeEach(() => {
    FakeWorker.instances.length = 0;
  });

  it("late warmup must not steal onmessage from an in-flight compute", async () => {
    const input = makeInput();

    // 1. Compute starts first (URL-restore path) — posts LOAD_DATA itself.
    const promise = computeHexGrid(input);
    const worker = FakeWorker.instances[0];
    expect(worker.posted.map((m) => m.type)).toEqual(["LOAD_DATA"]);
    const computeHandler = worker.onmessage;

    // 2. requestIdleCallback fires late: warmup runs while compute owns the
    //    worker. It must neither re-post LOAD_DATA nor replace onmessage.
    warmGridWorker(input);
    expect(worker.posted.map((m) => m.type)).toEqual(["LOAD_DATA"]);
    expect(worker.onmessage).toBe(computeHandler);

    // 3. Worker acks the load — compute's handler must dispatch COMPUTE.
    worker.emit({ type: "data_loaded" });
    expect(worker.posted.map((m) => m.type)).toEqual(["LOAD_DATA", "COMPUTE"]);

    // 4. Result resolves the original promise.
    worker.emit({ type: "result", cells: [{ h3Index: "a" }] });
    await expect(promise).resolves.toEqual({ cells: [{ h3Index: "a" }] });
  });

  it("warmup while an identical warmup load is in flight does not re-post LOAD_DATA", () => {
    const input = makeInput();
    // grid.ts module state may carry over from the previous test (data already
    // loaded) — warmups for loaded data are no-ops either way; assert no new
    // LOAD_DATA gets posted on the double call (StrictMode double-mount).
    const before = FakeWorker.instances.flatMap((w) => w.posted).filter((m) => m.type === "LOAD_DATA").length;
    warmGridWorker(input);
    warmGridWorker(input);
    const after = FakeWorker.instances.flatMap((w) => w.posted).filter((m) => m.type === "LOAD_DATA").length;
    expect(after - before).toBeLessThanOrEqual(1);
  });
});
