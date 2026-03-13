"use client";

import { AddressInput } from "@/components/setup/address-input";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { DestinationCard } from "@/components/setup/destination-card";
import { PanelSection } from "@/components/ui/panel-section";
import { ViewSwitch } from "./view-switch";
import { MonthlyFooter } from "./monthly-footer";
import type { SetupState, TransportMode, Destination, LatLng } from "@/lib/types";
import { SubwayData } from "@/lib/subway";

interface SidebarProps {
  state: SetupState;
  subwayData: SubwayData | null;
  view: "composite" | "perPin";
  selectedDestId: string | null;
  totalHours: number;
  totalCost: number;
  onOriginChange: (address: string, location: LatLng | null) => void;
  onModesChange: (modes: TransportMode[]) => void;
  onDestinationsChange: (destinations: Destination[]) => void;
  onViewChange: (view: "composite" | "perPin") => void;
  onSelectedDestChange: (id: string | null) => void;
}

export function Sidebar({
  state, subwayData, view, selectedDestId,
  totalHours, totalCost,
  onOriginChange, onModesChange, onDestinationsChange,
  onViewChange, onSelectedDestChange,
}: SidebarProps) {
  return (
    <aside className="w-[400px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
      <PanelSection className="pb-8">
        <h1 className="text-4xl leading-none">Transit<br />Heatmap</h1>
        <AddressInput
          label="Origin"
          value={state.originAddress}
          onChange={onOriginChange}
        />
      </PanelSection>

      <PanelSection title="Transport Mode">
        <ModeToggles selected={state.modes} onChange={onModesChange} />
      </PanelSection>

      <PanelSection title="Pinned Destinations" className="flex-1">
        <div className="flex flex-col gap-3">
          {state.destinations.map((dest) => (
            <DestinationCard
              key={dest.id}
              destination={dest}
              originLocation={state.origin}
              modes={state.modes}
              subwayData={subwayData}
              onFrequencyChange={(freq) =>
                onDestinationsChange(
                  state.destinations.map((d) => (d.id === dest.id ? { ...d, frequency: freq } : d))
                )
              }
              onRemove={() => onDestinationsChange(state.destinations.filter((d) => d.id !== dest.id))}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Heatmap Mode" className="border-b-0">
        <ViewSwitch view={view} onChange={onViewChange} />
        {view === "perPin" && state.destinations.length > 0 && (
          <select
            value={selectedDestId ?? ""}
            onChange={(e) => onSelectedDestChange(e.target.value || null)}
            className="bg-transparent border-3 border-red p-2 text-red font-display italic uppercase"
          >
            {state.destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </PanelSection>

      <MonthlyFooter totalHours={totalHours} totalCost={totalCost} />
    </aside>
  );
}
