"use client";

import type { TransportMode } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";

function SubwayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="14" rx="3" />
      <line x1="12" y1="3" x2="12" y2="17" />
      <circle cx="8" cy="13" r="1" fill="currentColor" />
      <circle cx="16" cy="13" r="1" fill="currentColor" />
      <line x1="8" y1="17" x2="6" y2="21" />
      <line x1="16" y1="17" x2="18" y2="21" />
    </svg>
  );
}

function WalkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2" />
      <path d="M14 10l-1 4-3 4" />
      <path d="M10 10l1 4 3 4" />
      <path d="M10 10l-2 6" />
      <path d="M14 10l2 6" />
      <line x1="10" y1="10" x2="14" y2="10" />
    </svg>
  );
}

function BikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17l3-7h4l2 4h3" />
      <path d="M9 10l3-4" />
    </svg>
  );
}

function CarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11l1.5-5h11L19 11" />
      <rect x="3" y="11" width="18" height="7" rx="2" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" />
      <circle cx="17" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BikeSubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="17" r="2.5" />
      <path d="M5 17l2-5h3" />
      <path d="M8 12l2-3" />
      <line x1="13" y1="9" x2="13" y2="17" />
      <rect x="13" y="9" width="8" height="8" rx="2" />
      <circle cx="17" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

function FerryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
      <path d="M6 14l-2 4" />
      <path d="M18 14l2 4" />
      <rect x="7" y="8" width="10" height="6" rx="1" />
      <line x1="12" y1="4" x2="12" y2="8" />
      <path d="M10 4h4" />
    </svg>
  );
}

const ICON_MAP: Record<TransportMode, React.FC<{ className?: string }>> = {
  subway: SubwayIcon,
  walk: WalkIcon,
  bike: BikeIcon,
  car: CarIcon,
  bikeSubway: BikeSubIcon,
  ferry: FerryIcon,
};

const MODE_LABELS: { key: TransportMode; label: string }[] = [
  { key: "subway", label: "Subway" },
  { key: "walk", label: "Walk" },
  { key: "bike", label: "Bike" },
  { key: "car", label: "Car" },
  { key: "bikeSubway", label: "Bike+Sub" },
  { key: "ferry", label: "Ferry" },
];

interface ModeLegendProps {
  activeModes: TransportMode[];
  onToggle: (mode: TransportMode) => void;
}

export function ModeLegend({ activeModes, onToggle }: ModeLegendProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODE_LABELS.map(({ key, label }) => {
        const isActive = activeModes.includes(key);
        const Icon = ICON_MAP[key];
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
            <Icon className="w-5 h-5" />
            <span className="font-display italic uppercase text-[10px] tracking-wider">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
