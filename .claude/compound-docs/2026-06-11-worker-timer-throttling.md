---
title: "Worker Timer Throttling: setTimeout(0) Silently Stalls in Background Tabs and Headless"
category: gotcha
tags: [web-worker, timer-throttling, background-tab, headless-chrome, chunked-processing]
project: nyc-transit-heatmap
created: 2026-06-11
---

## Problem

Grid computation stalled mid-way through hexagon time calculations. The worker was chunking hex cells (5,000 per chunk) via `setTimeout(processChunk, 0)` to yield to the main thread and allow progress updates. In normal browser tabs, this works fine—chunks process every ~16ms. But in hidden pages (backgrounded tabs, headless Chrome with `--headless=new`) timers are throttled to 1/second or slower, causing computes to stall visible in the user's background tab, or preventing headless verification from completing in reasonable time.

Symptom: "Computing…" UI frozen at 15% or 20%, never progressing to 100%, until user brings the tab to focus or times out waiting for headless verification.

## Root Cause

Browsers throttle `setTimeout` callbacks in hidden pages as a power-saving optimization:
- **Visible foreground tab:** timers can fire as fast as the event loop allows (~100+ calls/sec)
- **Hidden background tab:** timers throttled to 1/second
- **Headless Chrome (`--headless=new`):** treated as hidden page, similar 1/second throttling
- **Headless with `--headless=chrome` (legacy):** sometimes behaves differently

When grid-worker chunks work via `setTimeout(0)`:

```typescript
function processChunk() {
  const start = processed;
  const end = Math.min(start + CHUNK_SIZE, total);
  // ... compute 5,000 cells ...
  processed = end;
  if (processed < total) {
    postMessage({ type: "progress", percent: (processed / total) * 100 });
    setTimeout(processChunk, 0);  // ← queues next chunk
  }
}
```

In a hidden tab, this queue backs up: the main thread gets one timer callback/second, processes 5,000 cells, yields, then waits 1+ second for the next tick. The progress message fires, but visually the computation appears stuck.

## Solution

**Replace `setTimeout` scheduling with `MessageChannel`-based task scheduling:**

```typescript
// At worker top level, create a private MessageChannel
const channel = new MessageChannel();
let processingScheduled = false;

channel.port1.onmessage = () => {
  // This callback is NOT subject to timer throttling—messages
  // between ports are exempt from the hidden-page rate limit.
  if (processChunk()) {
    // More work to do; schedule next chunk via port2
    channel.port2.postMessage(null);
  }
};

function processChunk(): boolean {
  const start = processed;
  const end = Math.min(start + CHUNK_SIZE, total);
  // ... compute cells ...
  processed = end;
  if (processed < total) {
    postMessage({ type: "progress", percent: (processed / total) * 100 });
    return true;  // Signal: more work pending
  }
  return false;  // Done
}

// When starting a compute, kick off the first chunk via port message
channel.port2.postMessage(null);
```

**Why this works:**
- `MessageChannel` messages between ports are **not throttled**, even in hidden pages or headless
- The worker's event loop is entirely driven by messages, which means no "wait for next timer tick"
- Progress updates still fire at full speed: one per chunk (~16ms in visible tabs, no longer throttled in hidden tabs)

**For workers used by puppeteer/headless verification:**
- This fix lets headless verification complete in actual compute time (~100-300ms for full grid), not blocked on timer throttling (which could add 2-3 minutes)
- Same worker code works identically in foreground, background, and headless environments

## Prevention

**For any worker doing chunked/iterative work:**

1. **Never use `setTimeout(0)` to schedule worker-internal chunks.** Use `MessageChannel` or `queueMicrotask` instead.

2. **If you must use setTimeout (for compatibility), document the hidden-page limitation** and test with `puppeteer-core` headless to catch the stall:
   ```typescript
   // Detects if running in headless or hidden page
   // (not 100% reliable, but good smoke test)
   const isHiddenContext = typeof document === 'undefined' || document.hidden;
   ```

3. **Test all worker code with headless Chrome (`npx puppeteer-core --headless=new`)**, not just dev-server:
   ```bash
   npx puppeteer-core --headless=new --evaluate "
     await page.goto('http://localhost:3000');
     await page.waitForFunction(() => window.gridCompute?.done, { timeout: 5000 });
   "
   ```

4. **MessageChannel + port.onmessage is the modern, fastest pattern:**
   - Exempt from timer throttling ✓
   - Exempt from CPU quota limits ✓
   - Allows true async chunking (no blocking) ✓
   - Works in shared workers, dedicated workers, and service workers ✓

5. **For debugging timer throttling in production:**
   - Spy on `setTimeout` calls with `evaluateOnNewDocument`:
     ```typescript
     page.evaluateOnNewDocument(() => {
       const orig = window.setTimeout;
       window.setTimeout = function(...args) {
         console.log("setTimeout queued from hidden=", document.hidden);
         return orig(...args);
       };
     });
     ```
   - In worker context, add `console.log` before each `setTimeout(processChunk, 0)` to confirm it's being called but not firing
   - Check browser DevTools > Performance tab for hidden-page indicator or worker throttling stats
