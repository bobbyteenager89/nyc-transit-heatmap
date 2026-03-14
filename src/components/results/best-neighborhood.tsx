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
    <div className="bg-red text-pink p-4">
      <div className="text-xs uppercase font-bold tracking-widest mb-1">Your Best Bet</div>
      <div className="font-display italic text-lg leading-tight">
        {bestAddress ?? "Loading neighborhood…"}
      </div>
      <div className="mt-2 text-sm font-body">
        <span className="font-bold">{hours} hrs/mo</span> in transit — the lowest in NYC for your destinations
      </div>
    </div>
  );
}
