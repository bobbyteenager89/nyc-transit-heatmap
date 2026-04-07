"use client";

import { PanelSection } from "@/components/ui/panel-section";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { MonthlyFooter } from "./monthly-footer";
import { BestNeighborhood } from "./best-neighborhood";
import { SurpriseInsight } from "./surprise-insight";
import { encodeShareSlug } from "@/lib/share-slug";
import { ShareSheet } from "@/components/share/share-sheet";
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
}: ResultsSidebarProps) {
  return (
    <aside className="w-[360px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
      {/* Header */}
      <PanelSection className="pb-6">
        <h1 className="text-3xl leading-none">
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

      {/* Destinations list — click to isolate heatmap */}
      <PanelSection title="Your Destinations">
        {selectedDestId && (
          <button
            onClick={() => onSelectDest(null)}
            className="w-full border-3 border-red p-2 font-display italic uppercase text-xs hover:bg-red hover:text-pink transition-colors cursor-pointer mb-2"
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
                  className={`w-full flex justify-between items-center text-sm font-body p-2 border-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-red bg-red text-pink"
                      : selectedDestId
                        ? "border-red/30 text-red/40 hover:border-red hover:text-red"
                        : "border-red hover:bg-red hover:text-pink"
                  }`}
                >
                  <span className="font-bold">{dest.name}</span>
                  <span className={isSelected ? "text-pink/70" : "text-red/60"}>{dest.frequency}×/wk</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onEditDestinations}
            className="flex-1 border-3 border-red p-2 font-display italic uppercase text-sm hover:bg-red hover:text-pink transition-colors cursor-pointer"
          >
            Edit
          </button>
          {onDropPin && (
            <button
              onClick={onDropPin}
              aria-pressed={!!pinDropMode}
              className={`flex-1 border-3 border-red p-2 font-display italic uppercase text-sm transition-colors cursor-pointer ${
                pinDropMode ? "bg-red text-pink" : "hover:bg-red hover:text-pink"
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
      {bestCell && (
        <PanelSection>
          {(() => {
            const lat = bestCell.center.lat;
            const lng = bestCell.center.lng;
            const t = Math.min(60, Math.max(1, Math.round(totalHours * 60)));
            const m = modes as string[];
            const address = bestAddress ?? undefined;
            const slug = encodeShareSlug({ lat, lng, t, m, address });
            const url = `/p/${slug}`;
            const label = address ?? "this spot";
            return (
              <ShareSheet
                url={url}
                title={`${t}-minute reach from ${label}`}
                text={`See how far you can go in ${t} minutes by ${m.join(", ")} from ${label}.`}
              />
            );
          })()}
        </PanelSection>
      )}

      {/* Monthly footer */}
      <MonthlyFooter
        totalHours={totalHours}
        destinations={destinations}
        modes={modes}
      />
    </aside>
  );
}
