---
name: NYC Transit Heatmap — performance context
description: Known performance characteristics, hotspots, and architecture decisions for the transit heatmap project
type: project
---

~150k H3 hex cells at resolution 10, computed in a web worker via chunked processing (5k cells/chunk). Worker is the right pattern here — main-thread INP risk is in rendering, not computation.

Key render bottlenecks:
- `cellsToHexGeoJSON` iterates all 150k cells on every slider move (maxMinutes change)
- `buildFairnessGeoJSON` iterates 150k cells with a Map lookup — runs on BOTH cells + friendCells changes
- `ReachStats` iterates 150k cells × n modes synchronously on every maxMinutes change
- Two full 150k-cell arrays in memory when friend is added (cells + friendCells)
- `generateHexCenters` is called identically in both runCompute and runFriendCompute — wasted work (though it has a module-level cache so the second call IS free)
- `allContours` array spread in render (`[...apiContours, ...friendContours]`) creates a new array reference every render, triggering the API contour useEffect unnecessarily

Worker architecture: single `activeWorker` global — friend compute terminates main compute if user adds a friend while origin is computing. This is intentional cancel behavior but could surprise users.

**Why:** These were flagged in a performance review after the fairness zone + friend hex compute features were added (Session covering timelapse, commute overlap, dark landing).
**How to apply:** Prioritize fixes that affect the slider interaction path (P1) before addressing memory (P2).
