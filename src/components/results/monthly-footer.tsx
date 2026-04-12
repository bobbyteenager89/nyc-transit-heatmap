"use client";

import { useMemo } from "react";
import { computeCostComparison } from "@/lib/cost";
import type { Destination, TransportMode } from "@/lib/types";

interface MonthlyFooterProps {
  totalHours: number;
  destinations: Destination[];
  modes: TransportMode[];
}

export function MonthlyFooter({ totalHours, destinations, modes }: MonthlyFooterProps) {
  const comparison = useMemo(() => {
    if (destinations.length === 0) return null;
    // Pick the first transit mode with a real cost for cost estimation.
    // Prioritize: subway > bus > ferry > bike > car, skip free modes (walk/ownbike).
    const transitPriority: TransportMode[] = ["subway", "bus", "ferry", "bike", "car"];
    const primaryMode =
      transitPriority.find((m) => modes.includes(m)) ?? modes[0] ?? "subway";
    return computeCostComparison(
      destinations,
      destinations.map((d) => ({ destId: d.id, mode: primaryMode }))
    );
  }, [destinations, modes]);

  return (
    <div className="mt-auto bg-surface-card rounded-lg border border-white/10 p-6">
      {/* Transit time */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <span className="text-xs uppercase font-bold text-white/50 block mb-1">Avg Mo. Transit Time</span>
          <span className="text-4xl font-display italic text-accent">{Math.round(totalHours)} HR</span>
        </div>
        <span className="text-xs text-right uppercase font-bold text-white/30">
          Based on<br />frequency
        </span>
      </div>

      {/* Cost comparison */}
      {comparison && comparison.options.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs uppercase font-bold text-white/50">Est. Monthly Cost</span>
            <span className="text-xs uppercase font-bold text-white/30">
              {Math.round(comparison.tripsPerWeek)} trips/wk
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {comparison.options.map((option, i) => {
              const isCheapest = i === comparison.cheapestIndex && comparison.options.length > 1;
              return (
                <div
                  key={option.label}
                  className={`rounded border p-3 ${
                    isCheapest
                      ? "border-accent bg-accent/10"
                      : "border-white/15"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-display italic uppercase text-sm text-white">
                        {option.label}
                      </span>
                      {isCheapest && (
                        <span className="text-[10px] uppercase font-bold bg-accent text-surface px-1.5 py-0.5 rounded">
                          Best
                        </span>
                      )}
                    </div>
                    <span className={`font-display italic text-xl ${
                      isCheapest ? "text-accent" : "text-white/50"
                    }`}>
                      ${option.monthlyCost.toFixed(0)}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5 font-body">
                    {option.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
