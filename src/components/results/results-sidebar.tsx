"use client";

import { PanelSection } from "@/components/ui/panel-section";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { MonthlyFooter } from "./monthly-footer";
import { BestNeighborhood } from "./best-neighborhood";
import { SurpriseInsight } from "./surprise-insight";
import { ShareButton } from "./share-button";
import type { Destination, TransportMode, HexCell } from "@/lib/types";

interface ResultsSidebarProps {
  destinations: Destination[];
  modes: TransportMode[];
  onModesChange: (modes: TransportMode[]) => void;
  onEditDestinations: () => void;
  bestCell: HexCell | null;
  bestAddress: string | null;
  totalHours: number;
  totalCost: number;
  shareUrl: string;
}

export function ResultsSidebar({
  destinations,
  modes,
  onModesChange,
  onEditDestinations,
  bestCell,
  bestAddress,
  totalHours,
  totalCost,
  shareUrl,
}: ResultsSidebarProps) {
  return (
    <aside className="w-[360px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
      {/* Header */}
      <PanelSection className="pb-6">
        <h1 className="text-4xl leading-none">
          Find My<br />Neighborhood
        </h1>
        <p className="font-body text-xs text-red/60 mt-1">
          {destinations.length} destination{destinations.length !== 1 ? "s" : ""} · {modes.length} mode{modes.length !== 1 ? "s" : ""}
        </p>
      </PanelSection>

      {/* Best Neighborhood callout */}
      {bestCell && (
        <div className="border-b-3 border-red">
          <BestNeighborhood bestCell={bestCell} bestAddress={bestAddress} />
        </div>
      )}

      {/* Surprise insight */}
      {bestCell && destinations.length >= 2 && (
        <div className="border-b-3 border-red px-6 py-4">
          <SurpriseInsight destinations={destinations} bestCell={bestCell} />
        </div>
      )}

      {/* Destinations list (read-only summary with edit button) */}
      <PanelSection title="Your Destinations">
        <ul className="flex flex-col gap-2">
          {destinations.map((dest) => (
            <li key={dest.id} className="flex justify-between items-center text-sm font-body">
              <span className="font-bold">{dest.name}</span>
              <span className="text-red/60">{dest.frequency}×/wk</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onEditDestinations}
          className="mt-3 w-full border-3 border-red p-2 font-display italic uppercase text-sm hover:bg-red hover:text-pink transition-colors cursor-pointer"
        >
          Edit Destinations
        </button>
      </PanelSection>

      {/* Transport modes */}
      <PanelSection title="Transport Mode">
        <ModeToggles selected={modes} onChange={onModesChange} />
      </PanelSection>

      {/* Share */}
      <PanelSection>
        <ShareButton url={shareUrl} />
      </PanelSection>

      {/* Monthly footer */}
      <MonthlyFooter totalHours={totalHours} totalCost={totalCost} />
    </aside>
  );
}
