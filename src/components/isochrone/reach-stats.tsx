"use client";

import { useMemo } from "react";
import type { HexCell, TransportMode } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";

interface ReachStatsProps {
  cells: HexCell[];
  activeModes: TransportMode[];
  maxMinutes: number;
}

const MODE_LABELS: Record<TransportMode, string> = {
  subway: "Subway",
  walk: "Walk",
  car: "Car",
  bike: "Citi Bike",
  bikeSubway: "Bike+Sub",
  ferry: "Ferry",
};

export function ReachStats({ cells, activeModes, maxMinutes }: ReachStatsProps) {
  if (cells.length === 0) return null;

  // Count reachable cells per mode — memoized to avoid 150k cell iteration on every render
  const counts = useMemo(() => {
    const result: { mode: TransportMode; count: number; color: string }[] = [];
    for (const mode of activeModes) {
      let count = 0;
      for (const cell of cells) {
        const t = cell.times[mode];
        if (t !== null && t !== undefined && t <= maxMinutes) {
          count++;
        }
      }
      if (count > 0) {
        result.push({ mode, count, color: MODE_COLORS[mode] });
      }
    }
    result.sort((a, b) => b.count - a.count);
    return result;
  }, [cells, activeModes, maxMinutes]);

  const maxCount = counts[0]?.count ?? 1;

  if (counts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="font-body text-xs text-white/40 mb-1">
        Reachable area within {maxMinutes} min
      </p>
      {counts.map(({ mode, count, color }) => (
        <div key={mode} className="flex items-center gap-2">
          <span className="font-display italic uppercase text-[10px] w-14 text-white/60 flex-shrink-0">
            {MODE_LABELS[mode]}
          </span>
          <div className="flex-1 h-3 bg-white/5 relative">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(count / maxCount) * 100}%`,
                backgroundColor: color,
                opacity: 0.7,
              }}
            />
          </div>
          <span className="font-body text-xs text-white/40 w-12 text-right tabular-nums">
            {count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
