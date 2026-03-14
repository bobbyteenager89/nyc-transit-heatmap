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
    return computeCostComparison(
      destinations,
      destinations.map((d) => ({ destId: d.id, mode: modes[0] ?? "subway" }))
    );
  }, [destinations, modes]);

  return (
    <div className="mt-auto bg-red text-pink p-6">
      {/* Transit time */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <span className="text-xs uppercase font-bold block mb-1">Avg Mo. Transit Time</span>
          <span className="text-4xl font-display italic">{Math.round(totalHours)} HR</span>
        </div>
        <span className="text-xs text-right uppercase font-bold text-pink/60">
          Based on<br />frequency
        </span>
      </div>

      {/* Cost comparison */}
      {comparison && comparison.options.length > 0 && (
        <div className="border-t-3 border-pink/30 pt-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs uppercase font-bold">Est. Monthly Cost</span>
            <span className="text-xs uppercase font-bold text-pink/60">
              {Math.round(comparison.tripsPerWeek)} trips/wk
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {comparison.options.map((option, i) => {
              const isCheapest = i === comparison.cheapestIndex && comparison.options.length > 1;
              return (
                <div
                  key={option.label}
                  className={`border-3 p-3 ${
                    isCheapest
                      ? "border-pink bg-pink/10"
                      : "border-pink/30"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-display italic uppercase text-sm">
                        {option.label}
                      </span>
                      {isCheapest && (
                        <span className="text-[10px] uppercase font-bold bg-pink text-red px-1.5 py-0.5">
                          Best
                        </span>
                      )}
                    </div>
                    <span className={`font-display italic text-xl ${
                      isCheapest ? "text-pink" : "text-pink/60"
                    }`}>
                      ${option.monthlyCost.toFixed(0)}
                    </span>
                  </div>
                  <p className="text-[10px] text-pink/50 mt-0.5 font-body">
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
