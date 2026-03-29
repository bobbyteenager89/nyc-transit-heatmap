"use client";

import type { TransportMode } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";

const MODE_LABELS: { key: TransportMode; label: string; icon: string }[] = [
  { key: "subway", label: "Subway", icon: "🚇" },
  { key: "walk", label: "Walk", icon: "🚶" },
  { key: "bike", label: "Bike", icon: "🚲" },
  { key: "car", label: "Car", icon: "🚗" },
  { key: "bikeSubway", label: "Bike+Sub", icon: "🔄" },
  { key: "ferry", label: "Ferry", icon: "⛴" },
];

interface ModeLegendProps {
  activeModes: TransportMode[];
  onToggle: (mode: TransportMode) => void;
}

export function ModeLegend({ activeModes, onToggle }: ModeLegendProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODE_LABELS.map(({ key, label, icon }) => {
        const isActive = activeModes.includes(key);
        const color = MODE_COLORS[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border cursor-pointer transition-all text-center ${
              isActive
                ? "border-accent/50 bg-accent/10"
                : "border-white/10 bg-white/[0.02] opacity-40 hover:opacity-70"
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span className="font-display italic uppercase text-[10px] tracking-wider">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
