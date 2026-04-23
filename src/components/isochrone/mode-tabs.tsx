"use client";

import { startTransition } from "react";

export type ExploreMode = "reach" | "live" | "meet";

interface ModeTabsProps {
  active: ExploreMode;
  onChange: (mode: ExploreMode) => void;
}

const TABS: { key: ExploreMode; label: string; desc: string }[] = [
  { key: "reach", label: "Reach", desc: "How far can I go?" },
  { key: "live", label: "Live", desc: "Where should I live?" },
  { key: "meet", label: "Meet", desc: "Where should we meet?" },
];

export function ModeTabs({ active, onChange }: ModeTabsProps) {
  return (
    <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
      {TABS.map(({ key, label, desc }) => (
        <button
          key={key}
          onClick={() => startTransition(() => onChange(key))}
          title={desc}
          className={`flex-1 min-h-[44px] py-2 px-3 rounded-md font-display italic uppercase text-xs cursor-pointer transition-colors active:scale-[0.96] ${
            active === key
              ? "bg-accent/15 text-accent border border-accent/30"
              : "text-white/40 hover:text-white/60 border border-transparent"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
