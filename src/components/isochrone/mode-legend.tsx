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

function BusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <circle cx="8" cy="20" r="1.5" fill="currentColor" />
      <circle cx="16" cy="20" r="1.5" fill="currentColor" />
      <line x1="8" y1="17" x2="8" y2="18.5" />
      <line x1="16" y1="17" x2="16" y2="18.5" />
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
  bus: BusIcon,
  walk: WalkIcon,
  bike: BikeIcon,
  car: CarIcon,
  ferry: FerryIcon,
};

// Baseline = always shown in the blend, not toggleable. These are the modes
// a normal NYer uses without thinking: walk, train, bus when faster, ferry
// when faster. Bike and car are opt-in overlays — lifestyle choices the user
// has to explicitly add to the blend.
const BASELINE_LABELS: { key: TransportMode; label: string }[] = [
  { key: "walk", label: "Walk" },
  { key: "subway", label: "Subway" },
  { key: "bus", label: "Bus" },
  { key: "ferry", label: "Ferry" },
];

const OVERLAY_LABELS: { key: TransportMode; label: string; hint: string }[] = [
  { key: "bike", label: "Bike", hint: "Good for trips under ~3 miles" },
  { key: "car", label: "Car", hint: "Good for outer boroughs where transit is thin" },
];

interface ModeLegendProps {
  activeModes: TransportMode[];
  onToggle: (mode: TransportMode) => void;
}

export function ModeLegend({ activeModes, onToggle }: ModeLegendProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Baseline row — shown as a static "your reach includes" indicator.
          Not interactive because "turn off the subway" is never a real ask. */}
      <div>
        <p className="font-display italic uppercase text-[9px] text-white/40 tracking-wider mb-1.5">
          Your reach
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {BASELINE_LABELS.map(({ key, label }) => {
            const Icon = ICON_MAP[key];
            return (
              <div
                key={key}
                className="flex items-center gap-1 px-2 py-1 rounded border border-white/10 bg-white/[0.03] text-white/70"
                title={`${label} is always included in your reach`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="font-display italic uppercase text-[10px] tracking-wider">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlays — Bike and Car as explicit toggles. Off by default. */}
      <div>
        <p className="font-display italic uppercase text-[9px] text-white/40 tracking-wider mb-1.5">
          Add
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {OVERLAY_LABELS.map(({ key, label, hint }) => {
            const isActive = activeModes.includes(key);
            const Icon = ICON_MAP[key];
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                title={hint}
                className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer transition-all ${
                  isActive
                    ? "border-accent/60 bg-accent/15 text-accent"
                    : "border-white/10 bg-white/[0.02] text-white/40 hover:text-white/70 hover:border-white/20"
                }`}
              >
                <span className="text-[11px] leading-none">{isActive ? "\u2212" : "+"}</span>
                <Icon className="w-3.5 h-3.5" />
                <span className="font-display italic uppercase text-[10px] tracking-wider">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
