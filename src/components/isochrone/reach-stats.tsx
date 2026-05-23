"use client";

import { useMemo } from "react";
import type { HexCell, TransportMode } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";
import {
  perModeReach,
  unionReach,
  type NearestStops,
  type NearestStopMode,
} from "@/lib/reach-stats";

interface ReachStatsProps {
  cells: HexCell[];
  activeModes: TransportMode[];
  maxMinutes: number;
  nearestStops?: NearestStops | null;
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

const NEAREST_STOP_MODES: TransportMode[] = ["subway", "bus", "ferry", "bike"];

function isNearestStopMode(mode: TransportMode): mode is NearestStopMode {
  return NEAREST_STOP_MODES.includes(mode);
}

function formatWalkHint(min: number): string {
  if (min < 1) return "<1 min walk";
  return `${Math.round(min)} min walk`;
}

export function ReachStats({ cells, activeModes, maxMinutes, nearestStops }: ReachStatsProps) {
  const { perMode, union } = useMemo(() => {
    return {
      perMode: perModeReach(cells, activeModes, maxMinutes),
      union: unionReach(cells, activeModes, maxMinutes),
    };
  }, [cells, activeModes, maxMinutes]);

  if (cells.length === 0 || perMode.length === 0) return null;

  const maxCount = perMode[0]?.count ?? 1;

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

      {/* Union total — any active mode */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 4,
        }}
        data-testid="union-total"
      >
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.56)",
          }}
        >
          Any mode
        </span>
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 16,
            color: "#f5f6fa",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {union.areaMi2.toFixed(1)} mi²{" "}
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.46)" }}>
            ({union.pctOfGrid.toFixed(0)}% of grid)
          </span>
        </span>
      </div>

      {perMode.map(({ mode, count, areaMi2, pctOfGrid }) => {
        const color = MODE_COLORS[mode];
        const pct = (count / maxCount) * 100;
        const nearest =
          nearestStops && isNearestStopMode(mode) ? nearestStops[mode] : null;
        return (
          <div key={mode} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr 76px",
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
                  whiteSpace: "nowrap",
                }}
                title={`${areaMi2.toFixed(1)} mi² reachable by ${MODE_LABELS[mode]}`}
              >
                {areaMi2.toFixed(1)} mi² · {pctOfGrid.toFixed(0)}%
              </span>
            </div>
            {nearest !== null && nearest !== undefined && (
              <span
                style={{
                  fontFamily: "var(--font-data)",
                  fontSize: 9,
                  color: "rgba(255,255,255,0.32)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  paddingLeft: 78,
                  lineHeight: 1,
                }}
                data-testid={`nearest-${mode}`}
              >
                Nearest stop: {formatWalkHint(nearest)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
