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
  onDropPin?: () => void;
  pinDropMode?: boolean;
  selectedDestId: string | null;
  onSelectDest: (destId: string | null) => void;
  bestCell: HexCell | null;
  bestAddress: string | null;
  totalHours: number;
  shareUrl: string;
}

export function ResultsSidebar({
  destinations,
  modes,
  onModesChange,
  onEditDestinations,
  onDropPin,
  pinDropMode,
  selectedDestId,
  onSelectDest,
  bestCell,
  bestAddress,
  totalHours,
  shareUrl,
}: ResultsSidebarProps) {
  return (
    <aside className="w-full md:w-[360px] flex-shrink-0 flex flex-col bg-surface md:overflow-y-auto gap-3 p-4">
      {/* Header */}
      <PanelSection className="pb-4">
        <h1 className="text-3xl leading-none text-white">
          Find My<br /><span className="text-accent">Neighborhood</span>
        </h1>
        <p className="font-body text-xs text-white/40 mt-1">
          {destinations.length} destination{destinations.length !== 1 ? "s" : ""} · {modes.length} mode{modes.length !== 1 ? "s" : ""}
        </p>
      </PanelSection>

      {/* Best Neighborhood callout */}
      {bestCell && (
        <div className="border-b border-white/10">
          <BestNeighborhood bestCell={bestCell} bestAddress={bestAddress} />
        </div>
      )}

      {/* Surprise insight */}
      {bestCell && destinations.length >= 2 && (
        <div className="border-b border-white/10 px-2 py-3">
          <SurpriseInsight destinations={destinations} bestCell={bestCell} />
        </div>
      )}

      {/* Destinations list — click to isolate heatmap */}
      <PanelSection title="Your Destinations">
        {selectedDestId && (
          <button
            onClick={() => onSelectDest(null)}
            className="w-full border border-white/20 rounded p-2 font-display italic uppercase text-xs text-white/70 hover:bg-white/10 transition-colors cursor-pointer mb-2"
          >
            ← Show All Destinations
          </button>
        )}
        <ul className="flex flex-col gap-2">
          {destinations.map((dest) => {
            const isSelected = selectedDestId === dest.id;
            return (
              <li key={dest.id}>
                <button
                  onClick={() => onSelectDest(isSelected ? null : dest.id)}
                  aria-pressed={isSelected}
                  className={`w-full flex justify-between items-center text-sm font-body p-2 rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-accent bg-accent/20 text-accent"
                      : selectedDestId
                        ? "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
                        : "border-white/20 text-white/80 hover:bg-white/10"
                  }`}
                >
                  <span className="font-bold">{dest.name}</span>
                  <span className={isSelected ? "text-accent/70" : "text-white/40"}>{dest.frequency}×/wk</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onEditDestinations}
            className="flex-1 border border-white/20 rounded p-2 font-display italic uppercase text-sm text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Edit
          </button>
          {onDropPin && (
            <button
              onClick={onDropPin}
              aria-pressed={!!pinDropMode}
              className={`flex-1 border rounded p-2 font-display italic uppercase text-sm transition-colors cursor-pointer ${
                pinDropMode ? "border-accent bg-accent/20 text-accent" : "border-white/20 text-white/70 hover:bg-white/10"
              }`}
            >
              {pinDropMode ? "Cancel Pin" : "Drop a Pin"}
            </button>
          )}
        </div>
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
      <MonthlyFooter
        totalHours={totalHours}
        destinations={destinations}
        modes={modes}
      />
    </aside>
  );
}
