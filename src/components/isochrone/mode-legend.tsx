"use client";

import type { TransportMode } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";

const MODE_CHIPS: { key: TransportMode; label: string; locked?: boolean; advanced?: boolean }[] = [
  { key: "walk", label: "Walk", locked: true },
  { key: "subway", label: "Subway" },
  { key: "bus", label: "Bus" },
  { key: "ferry", label: "Ferry" },
  { key: "bike", label: "Citi Bike" },
  { key: "ownbike", label: "Own Bike", advanced: true },
  { key: "car", label: "Car" },
];

interface ModeLegendProps {
  activeModes: TransportMode[];
  onToggle: (mode: TransportMode) => void;
  showAdvanced?: boolean;
}

export function ModeLegend({ activeModes, onToggle, showAdvanced = false }: ModeLegendProps) {
  const visibleChips = MODE_CHIPS.filter((c) => showAdvanced || !c.advanced);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {visibleChips.map(({ key, label, locked }) => {
        const isActive = activeModes.includes(key);
        const color = MODE_COLORS[key];

        return (
          <button
            key={key}
            onClick={locked ? undefined : () => onToggle(key)}
            disabled={locked}
            title={locked ? "Walk is always included" : isActive ? `Turn off ${label}` : `Turn on ${label}`}
            aria-label={locked ? "Walk is always included" : isActive ? `Turn off ${label}` : `Turn on ${label}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 6,
              border: `1px solid ${isActive ? color : "rgba(255,255,255,0.12)"}`,
              background: isActive
                ? `color-mix(in srgb, ${color} 12%, transparent)`
                : "transparent",
              cursor: locked ? "default" : "pointer",
              transition: "border-color 0.15s, background 0.15s",
              minHeight: 36,
            }}
          >
            {/* Colored square dot */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: color,
                flexShrink: 0,
                opacity: isActive ? 1 : 0.5,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: isActive ? "#f5f6fa" : "rgba(255,255,255,0.46)",
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
