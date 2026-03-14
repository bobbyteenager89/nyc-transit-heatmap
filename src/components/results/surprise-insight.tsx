"use client";

import type { Destination, HexCell } from "@/lib/types";

interface SurpriseInsightProps {
  destinations: Destination[];
  bestCell: HexCell | null;
}

/**
 * Shows a counterintuitive insight: which destination is actually easiest to
 * reach from the optimal neighborhood, even if it seemed far away.
 */
export function SurpriseInsight({ destinations, bestCell }: SurpriseInsightProps) {
  if (!bestCell || destinations.length < 2) return null;

  // Find the destination with the best time from the optimal cell
  const breakdown = bestCell.destBreakdown;
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return null;

  // Find which dest has the biggest gap between its frequency-weight and raw time
  // Insight: the shortest raw trip among high-frequency destinations
  const sortedByTime = [...entries].sort(([, a], [, b]) => a - b);
  const fastestEntry = sortedByTime[0];
  const fastestDest = destinations.find((d) => d.id === fastestEntry[0]);
  if (!fastestDest) return null;

  const fastestTime = Math.round(fastestEntry[1]);

  // Only show if the fastest is surprisingly quick (< 15 min)
  if (fastestTime >= 20) return null;

  return (
    <div className="border-3 border-red p-4 bg-pink">
      <div className="text-xs uppercase font-bold tracking-widest mb-1 text-red/60">
        Surprise Finding
      </div>
      <p className="font-body text-sm leading-relaxed">
        <span className="font-bold">{fastestDest.name}</span> is only{" "}
        <span className="font-bold">{fastestTime} min away</span> from your ideal neighborhood
        — even though it might not feel close on a map.
      </p>
    </div>
  );
}
