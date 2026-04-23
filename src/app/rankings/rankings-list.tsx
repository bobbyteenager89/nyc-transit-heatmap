"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/neighborhoods";

export interface RankedEntry {
  name: string;
  borough: string;
  center: { lat: number; lng: number };
  avgMinutes: number;
}

interface RankingsListProps {
  rankings: RankedEntry[];
}

export default function RankingsList({ rankings }: RankingsListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bestTime = rankings.length > 0 ? rankings[0].avgMinutes : 1;
  const worstTime =
    rankings.length > 0 ? rankings[rankings.length - 1].avgMinutes : 1;

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 3) {
        next.add(name);
      }
      return next;
    });
  }

  function goCompare() {
    const slugs = Array.from(selected)
      .map((name) => slugify(name))
      .join(",");
    router.push(`/compare?n=${slugs}`);
  }

  return (
    <>
      {selected.size >= 2 && (
        <button
          onClick={goCompare}
          className="mb-6 px-5 py-2.5 rounded-lg bg-accent text-[#0a0a12] font-display italic uppercase text-sm hover:bg-accent/90 transition-colors active:scale-[0.96] cursor-pointer"
        >
          Compare {selected.size} neighborhoods &rarr;
        </button>
      )}
      {selected.size === 1 && (
        <p className="font-body text-xs text-white/30 mb-6">
          Select 1 more neighborhood to compare
        </p>
      )}

      <div className="flex flex-col gap-3">
        {rankings.map((r, i) => {
          const barWidth =
            worstTime === bestTime
              ? 100
              : 100 -
                ((r.avgMinutes - bestTime) / (worstTime - bestTime)) * 100;
          const isSelected = selected.has(r.name);
          const canSelect = selected.size < 3 || isSelected;

          return (
            <div
              key={r.name}
              className={`border rounded-xl bg-surface-card p-5 flex items-start gap-4 group hover:bg-white/[0.04] transition-colors ${
                isSelected
                  ? "border-accent/50"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <button
                onClick={() => toggleSelect(r.name)}
                disabled={!canSelect}
                className={`mt-0.5 w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-accent border-accent text-[#0a0a12]"
                    : canSelect
                      ? "border-white/20 hover:border-white/40"
                      : "border-white/10 opacity-30 cursor-not-allowed"
                }`}
                aria-label={`Select ${r.name} for comparison`}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              <span className="text-2xl font-display italic text-white/20 w-8 shrink-0 text-right leading-none pt-0.5">
                {i + 1}
              </span>

              <Link
                href={`/explore?lat=${r.center.lat}&lng=${r.center.lng}&t=30&m=subway,bus,walk,bike,ferry`}
                className="flex-1 min-w-0"
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h2 className="font-display italic uppercase text-lg text-white group-hover:text-accent transition-colors truncate">
                    {r.name}
                  </h2>
                  <span className="font-body text-sm text-white/70 tabular-nums shrink-0">
                    {r.avgMinutes.toFixed(1)} min
                  </span>
                </div>

                <p className="font-body text-xs text-white/30 mb-2">
                  {r.borough}
                </p>

                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${Math.max(barWidth, 4)}%` }}
                  />
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
