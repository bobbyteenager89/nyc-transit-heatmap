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
    <div
      className="flex"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {TABS.map(({ key, label, desc }) => (
        <button
          key={key}
          onClick={() => startTransition(() => onChange(key))}
          title={desc}
          style={{
            flex: 1,
            padding: "10px 8px",
            fontFamily: "var(--font-data)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: active === key ? "#f5f6fa" : "rgba(255,255,255,0.45)",
            background: "none",
            border: "none",
            borderBottom: active === key
              ? "2px solid var(--color-accent, #22d3ee)"
              : "2px solid transparent",
            marginBottom: -1,
            cursor: "pointer",
            transition: "color 0.15s",
            minHeight: 40,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
