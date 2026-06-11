---
title: "Silent Promise Rejection: console.error Only; No UI Feedback"
category: gotcha
tags: [error-handling, promise-rejection, error-state, user-feedback, UX]
project: nyc-transit-heatmap
created: 2026-06-11
---

## Problem

When the grid computation hung (due to the worker race condition), the promise from `computeHexGrid()` was rejected after 60 seconds with "Grid computation timed out." The hook `useDynamicGridCompute()` caught the error with `console.error("Compute failed:", err)` — the error was logged, but **nothing changed on the UI**. The page showed:
- Map with nothing rendered
- Sidebar still visible
- No error banner, no "Tap to retry" message
- User had no indication what went wrong

The "Computing… 0%" message never appeared because the compute hung during the initial request, and the progress state was only updated on progress messages.

Symptom: User sees a blank map + working sidebar. Refresh the page resets the spinner, but the underlying bug persists, creating a loop of reloads. No error message to search for or report.

## Root Cause

The hook managed `computing`, `computeProgress`, and `expanding` state, but **had no `computeError` state**. When an error occurred:

```typescript
try {
  const result = await computeHexGrid(..., reportProgress);
  setCells(result);
} catch (err) {
  console.error("Compute failed:", err);  // ← Only logs; does nothing to UI
  // No setComputeError() call
}
```

The error was caught (no unhandled rejection), but silently swallowed. The UI stayed in whatever state it was in—spinner off, cells empty.

## Solution

**1. Add a `computeError` state and expose it in the hook return:**

```typescript
const [computeError, setComputeError] = useState<string | null>(null);

export interface DynamicGridCompute {
  // ... other fields ...
  computeError: string | null;
}

return {
  // ... other fields ...
  computeError,
};
```

**2. Set the error in the catch block, excluding "cancelled" noise:**

```typescript
try {
  // ... compute
} catch (err) {
  console.error("Compute failed:", err);
  const msg = err instanceof Error ? err.message : String(err);
  // "Cancelled" means a newer compute superseded this one—not an error
  // the user should see.
  if (!msg.includes("cancelled")) {
    setComputeError("Computation didn't finish — tap your location again to retry.");
  }
} finally {
  setComputing(false);
}
```

**3. Clear the error when a new compute starts:**

```typescript
const runCompute = useCallback(async (loc: LatLng) => {
  if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData || !busData) return;

  setComputing(true);
  setComputeError(null);  // ← Clear old errors before new attempt
  // ... rest of compute
});
```

**4. Render the error banner in the UI:**

In the explore component, check `computeError` and show a dismissible or auto-clearing banner:

```typescript
{computeError && (
  <div className="fixed bottom-4 left-4 right-4 bg-red-900/80 text-white p-3 rounded">
    {computeError}
  </div>
)}
```

Or a sticky inline message:

```typescript
{computeError && (
  <div className="bg-red-950 border border-red-700 text-red-100 p-4 rounded mb-4">
    {computeError}
    <button onClick={() => setComputeError(null)} className="ml-4 underline">
      Dismiss
    </button>
  </div>
)}
```

## Prevention

**For any async operation with user-visible consequences:**

1. **Always have an error state**, even if you think "this never fails." Bugs happen (as the race condition proved). An error state costs <5 lines of code and saves debugging hell.

2. **Distinguish user-actionable errors from internal noise:**
   - Timeouts, network errors, parsing failures → show to user with retry instructions
   - "Operation cancelled" (user started a new compute) → log only, don't show

3. **Test error paths explicitly:**
   ```typescript
   // In a test or manual verification:
   // 1. Start a long-running compute
   // 2. Trigger its 60s timeout manually (with mock timers or puppeteer)
   // 3. Verify computeError state updates AND the UI banner appears
   ```

4. **Visibility rule:** Any `catch` block with only `console.error()` is a red flag. If you're catching an error the user caused (or could encounter), set a state and render it.

5. **For worker timeouts specifically:**
   - Include the timeout duration in the error message: `"Computation timed out after 60s — this usually means your browser tab was backgrounded."`
   - Offer a retry link or button, not just "try again"
   - Consider a fallback to lower resolution or cached results (e.g., "Using cached results from 2 minutes ago")

6. **Testing silent failures in headless:**
   - `puppeteer-core` doesn't show console output by default. Add a listener:
     ```typescript
     page.on('console', msg => console.log('PAGE:', msg.text()));
     ```
   - If a compute hangs in headless, check both the page console AND the puppeteer script console for errors

7. **Logging best practice for errors:**
   ```typescript
   catch (err) {
     const msg = err instanceof Error ? err.message : String(err);
     console.error("Grid compute failed", { message: msg, stack: err instanceof Error ? err.stack : undefined });
     
     // Decide: is this noise or user-visible?
     if (!msg.includes("cancelled")) {
       setComputeError(`Couldn't compute reach (${msg.slice(0, 60)}). Tap again.`);
     }
   }
   ```
   This includes the actual error message in the state, useful for user reporting and triage.
