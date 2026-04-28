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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p
        style={{
          fontFamily: "var(--font-data)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          marginBottom: 2,
        }}
      >
        Reachable in {maxMinutes} min
      </p>
      {counts.map(({ mode, count, color }) => {
        const sqMi = (count * 0.00581).toFixed(1);
        const pct = (count / maxCount) * 100;
        return (
          <div
            key={mode}
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 56px",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.46)",
                lineHeight: 1,
              }}
            >
              {MODE_LABELS[mode]}
            </span>
            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  backgroundColor: color,
                  transition: "width 300ms ease",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 10,
                color: "rgba(255,255,255,0.46)",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {sqMi} mi²
            </span>
          </div>
        );
      })}
    </div>
  );
}
