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
  bus: "Bus",
  walk: "Walk",
  car: "Car",
  bike: "Citi Bike",
  ownbike: "Own Bike",
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
      <p className="font-body text-[10px] text-white/30 mb-1">
        Area reachable within {maxMinutes} min by mode
      </p>
      {counts.map(({ mode, count, color }) => {
        // Each H3 res-10 hex ≈ 0.00581 sq mi (15,047 sq m)
        const sqMi = (count * 0.00581).toFixed(1);
        return (
          <div key={mode} className="flex items-center gap-2">
            <span className="font-display italic uppercase text-[10px] w-14 text-white/60 flex-shrink-0">
              {MODE_LABELS[mode]}
            </span>
            <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  backgroundColor: color,
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="font-body text-[10px] text-white/40 w-14 text-right tabular-nums">
              {sqMi} mi²
            </span>
          </div>
        );
      })}
    </div>
  );
}
