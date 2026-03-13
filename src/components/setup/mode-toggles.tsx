"use client";

import { Chip } from "@/components/ui/chip";
import type { TransportMode } from "@/lib/types";

const MODES: { key: TransportMode; label: string; wide?: boolean }[] = [
  { key: "subway", label: "Subway" },
  { key: "walk", label: "Walking" },
  { key: "car", label: "Car" },
  { key: "bike", label: "Citi Bike" },
  { key: "bikeSubway", label: "Bike + Subway", wide: true },
];

interface ModeTogglesProps {
  selected: TransportMode[];
  onChange: (modes: TransportMode[]) => void;
}

export function ModeToggles({ selected, onChange }: ModeTogglesProps) {
  const toggle = (mode: TransportMode) => {
    if (selected.includes(mode)) {
      if (selected.length > 1) onChange(selected.filter((m) => m !== mode));
    } else {
      onChange([...selected, mode]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((m) => (
        <Chip
          key={m.key}
          label={m.label}
          active={selected.includes(m.key)}
          onClick={() => toggle(m.key)}
          wide={m.wide}
        />
      ))}
    </div>
  );
}
