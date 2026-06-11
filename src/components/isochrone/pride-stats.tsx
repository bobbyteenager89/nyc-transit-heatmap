"use client";

import type { PrideStats as PrideStatsData } from "@/lib/pride-stats";
import { LINE_COLORS, lineTextColor } from "@/lib/subway-lines";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return new Intl.NumberFormat("en-US").format(n);
}

const ROWS: [keyof PrideStatsData, string, string][] = [
  ["population", "PEOPLE", "#39ff14"],
  ["restaurants", "RESTAURANTS", "#ffbe0b"],
  ["cafes", "COFFEE SHOPS", "#06d6a0"],
  ["bars", "BARS & CLUBS", "#f97316"],
  ["parks", "PARKS", "#00b4d8"],
];

interface PrideStatsProps {
  stats: PrideStatsData | null;
  maxMinutes: number;
}

export function PrideStats({ stats, maxMinutes }: PrideStatsProps) {
  if (!stats || (stats.population === 0 && stats.lines.length === 0)) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p
        style={{
          fontFamily: "var(--font-data)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
        }}
      >
        Within reach · {maxMinutes} min
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
        {ROWS.map(([key, label, color]) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 22,
                color,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(stats[key] as number)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {stats.lines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-data)",
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {stats.lines.length} LINES · 15 MIN WALK
          </span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {stats.lines.map((l) => (
              <span
                key={l}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: LINE_COLORS[l] ?? "#666",
                  color: lineTextColor(l),
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-data)",
                  fontSize: 11,
                  lineHeight: 1,
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
