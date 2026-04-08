"use client";

import { useMemo } from "react";
import type { HexCell, TransportMode } from "@/lib/types";
import { countOverlapCells } from "@/lib/meetup-overlap";

interface MeetupSummaryProps {
  cellsA: HexCell[];
  cellsB: HexCell[];
  activeModes: TransportMode[];
  maxMinutes: number;
  /** Called when user taps "Share meetup link" */
  onShare: () => void;
  copied: boolean;
}

export function MeetupSummary({
  cellsA,
  cellsB,
  activeModes,
  maxMinutes,
  onShare,
  copied,
}: MeetupSummaryProps) {
  const overlapCount = useMemo(
    () => countOverlapCells(cellsA, cellsB, activeModes, maxMinutes),
    [cellsA, cellsB, activeModes, maxMinutes]
  );

  // Each H3 res-10 hex ≈ 0.00581 sq mi
  const sqMi = (overlapCount * 0.00581).toFixed(1);

  return (
    <div className="space-y-3">
      {overlapCount === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-center">
          <p className="font-display italic uppercase text-sm text-white/50">No overlap</p>
          <p className="font-body text-[11px] text-white/30 mt-1 leading-tight">
            Try a longer time budget — slide the timer up.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
          <p className="font-display italic uppercase text-xs text-emerald-400 mb-0.5">
            Shared reach
          </p>
          <p className="font-body text-sm text-white">
            <span className="font-bold text-emerald-300">{overlapCount.toLocaleString()}</span>{" "}
            areas reachable by both in{" "}
            <span className="text-white/70">{maxMinutes} min</span>
          </p>
          <p className="font-body text-[10px] text-white/30 mt-0.5">
            ≈ {sqMi} mi² of the city
          </p>
        </div>
      )}

      <button
        onClick={onShare}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-xs font-body text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      >
        {copied ? (
          <>
            <span className="text-emerald-400">&#10003;</span>
            <span className="text-emerald-400">Link copied!</span>
          </>
        ) : (
          <>
            <span>&#128279;</span>
            <span>Share meetup link</span>
          </>
        )}
      </button>
    </div>
  );
}
