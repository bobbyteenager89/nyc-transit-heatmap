"use client";

import type { HexCell } from "@/lib/types";

interface BestNeighborhoodProps {
  bestCell: HexCell | null;
  bestAddress: string | null;
}

export function BestNeighborhood({ bestCell, bestAddress }: BestNeighborhoodProps) {
  if (!bestCell) return null;

  const hours = Math.round(bestCell.compositeScore / 60);

  return (
    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
      <div className="text-xs uppercase font-bold tracking-widest mb-1 text-accent/60">Your Best Bet</div>
      <div className="font-display italic text-lg leading-tight text-accent">
        {bestAddress ?? "Loading neighborhood…"}
      </div>
      <div className="mt-2 text-sm font-body text-white/70">
        <span className="font-bold text-white">{hours} hrs/mo</span> in transit — the lowest in NYC for your destinations
      </div>
    </div>
  );
}
