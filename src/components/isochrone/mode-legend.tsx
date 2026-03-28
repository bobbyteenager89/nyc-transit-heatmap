"use client";

import type { TransportMode } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";

const MODE_LABELS: { key: TransportMode; label: string }[] = [
  { key: "subway", label: "Subway" },
  { key: "walk", label: "Walk" },
  { key: "car", label: "Car" },
  { key: "bike", label: "Citi Bike" },
  { key: "bikeSubway", label: "Bike+Sub" },
  { key: "ferry", label: "Ferry" },
];

interface ModeLegendProps {
  activeModes: TransportMode[];
  onToggle: (mode: TransportMode) => void;
}

export function ModeLegend({ activeModes, onToggle }: ModeLegendProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {MODE_LABELS.map(({ key, label }) => {
        const isActive = activeModes.includes(key);
        const color = MODE_COLORS[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-2 px-2.5 py-2 border-3 border-red font-display italic uppercase text-xs cursor-pointer transition-opacity ${
              isActive ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className="w-3 h-3 flex-shrink-0 border border-red/30"
              style={{ backgroundColor: isActive ? color : "transparent" }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
