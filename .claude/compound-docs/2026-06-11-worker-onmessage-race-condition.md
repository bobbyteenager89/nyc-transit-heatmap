---
title: "Worker onmessage Race: Idle-Deferred Setup Overwrites Active Handler"
category: gotcha
tags: [web-worker, requestIdleCallback, handler-clobbering, race-condition, grid-compute]
project: nyc-transit-heatmap
created: 2026-06-11
---

## Problem

Prod site hanging at "Computing… 0%" then silently crashing with a blank map. Hit on every share-link restore load and quick-pick clicks within the warm-up window.

Root cause was in the worker warmup pattern: `warmGridWorker()` was deferred via `requestIdleCallback` to avoid stalling INP on initial page load (1.8MB structured-clone payload). On share-link loads, `computeHexGrid()` fired first and installed its `onmessage` handler. The idle callback then fired and **overwrote that handler** with the warmup handler. The worker posted a `data_loaded` ack, but it went to the warmup handler (which just clears itself). The compute handler never received it, never dispatched the `COMPUTE` message, and the promise hung until a 60s watchdog killed the worker.

Symptom: UI spinner stuck at "Computing… 0%", then blank map when the worker was terminated.

## Root Cause

Single-slot `worker.onmessage` + multiple callers = handler clobbering. The pattern:

```javascript
// 1. requestIdleCallback warmup installs handler A
worker.onmessage = handlerA;

// 2. Later, URL-restore path synchronously installs handler B
worker.onmessage = handlerB;  // ← overwrites handlerA

// 3. Worker posts data_loaded; handlerB receives it and dispatches COMPUTE
// But if handlerA fires first (because idle callback is late):
worker.onmessage = handlerA;  // ← overwrites handlerB
// data_loaded arrives → handlerA executes, clears itself
// handlerB never fires, COMPUTE never dispatched, promise hangs
```

The flaw: idle-deferred work assumes "I'll run later, after user actions settle." But a user action (clicking a share link with URL-embedded origin) can fire **synchronously** and install a handler before the idle callback runs. Now two owners share the single slot, and whoever wrote second loses.

## Solution

**Prevent handler clobbering:**

1. **In `warmGridWorker()`, check if another compute is in flight** before installing a handler:

```typescript
export function warmGridWorker(input: WarmupInput): void {
  const sig = dataSignature(input);
  if (dataLoaded && sig === loadedDataSignature) return;
  if (loadInFlightSignature === sig) return;
  
  // ← NEW: if a compute is in flight, DON'T install a handler
  if (pendingReject) return;  // A compute owns worker.onmessage

  const worker = getOrCreateWorker();
  const handler = (e: MessageEvent) => {
    if (e.data?.type === "data_loaded") {
      dataLoaded = true;
      loadedDataSignature = sig;
      loadInFlightSignature = null;
      // Clear ONLY if we still own the handler
      if (worker.onmessage === handler) worker.onmessage = null;
    }
  };
  worker.onmessage = handler;
  // ... rest of LOAD_DATA post
}
```

2. **In `computeHexGrid()`, check for in-flight warmup loads** so you don't re-post:

```typescript
if (needsLoad && loadInFlightSignature === sig) {
  // Warmup LOAD_DATA with same data is already posted.
  // Our onmessage (installed above) will react to the warmup's data_loaded,
  // and dispatch COMPUTE when it arrives.
} else if (needsLoad) {
  // Send LOAD_DATA ourselves
  loadInFlightSignature = sig;
  worker.postMessage({ type: "LOAD_DATA", ... });
} else {
  // Data already loaded, send COMPUTE directly
  worker.postMessage({ type: "COMPUTE", ... });
}
```

3. **Track state explicitly**:
   - `pendingReject` — is a compute in flight? (not null = yes, compute owns the handler)
   - `loadInFlightSignature` — is a LOAD_DATA message in flight, awaiting `data_loaded` ack?
   - `dataLoaded` — has the worker successfully processed LOAD_DATA?
   - `loadedDataSignature` — fingerprint of the data currently loaded in the worker

The test `src/lib/grid-warmup-race.test.ts` validates this: a warmup fires while a compute is in flight, and the warmup must not overwrite the compute's handler or re-post LOAD_DATA.

## Prevention

**For any web-worker pattern with deferred setup + synchronous fast-path:**

1. **Never write `worker.onmessage` twice without coordinating.** A single global handler is the safest pattern. If you need multiple message types, dispatch within one handler:

```typescript
worker.onmessage = (e) => {
  if (e.data.type === "data_loaded") { /* warmup */ }
  else if (e.data.type === "progress") { /* compute */ }
  else if (e.data.type === "result") { /* resolve */ }
};
```

2. **If handlers must be replaced, guard with a flag:**

```typescript
if (!dataLoaded && pendingReject === null) {
  // Only install a new handler if nobody else owns the worker
  worker.onmessage = newHandler;
}
```

3. **Make idle-deferred work idempotent and short-circuit early.** Check all preconditions before touching shared state:
   - Is the data already loaded?
   - Is the same LOAD_DATA already in flight?
   - Is a compute in flight (which owns the handler)?

4. **Write a regression test** that stubs the Worker, calls warmup + compute in the order they race on prod, and verifies the compute's handler wasn't clobbered. Use `evaluateOnNewDocument` in puppeteer to spy on worker messages if debugging in headless.

5. **Headless Chrome repro tip:** Headless behaves as a backgrounded tab for timer throttling. If the bug only hits on share-link restores (not dev-server refreshes), test with `puppeteer-core` launching Chrome in `--headless=new` mode to reveal timing bugs that disappear in dev.
