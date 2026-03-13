"use client";

import { useState, useCallback } from "react";
import { AddressInput } from "@/components/setup/address-input";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { DestinationCard } from "@/components/setup/destination-card";
import { PanelSection } from "@/components/ui/panel-section";
import { ViewSwitch } from "./view-switch";
import { MonthlyFooter } from "./monthly-footer";
import { DEFAULT_FREQUENCY } from "@/lib/constants";
import type { TransportMode, Destination, LatLng, DestinationCategory } from "@/lib/types";
import { SubwayData } from "@/lib/subway";

interface SidebarProps {
  originAddress: string;
  originLocation: LatLng | null;
  modes: TransportMode[];
  destinations: Destination[];
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
  pinDropMode: boolean;
  onPinDropToggle: () => void;
}

const CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "work", label: "Work" },
  { key: "social", label: "Social" },
  { key: "fitness", label: "Fitness" },
  { key: "errands", label: "Errands" },
  { key: "other", label: "Other" },
];

export function Sidebar({
  originAddress, originLocation, modes, destinations,
  subwayData, view, selectedDestId,
  totalHours, totalCost,
  onOriginChange, onModesChange, onDestinationsChange,
  onViewChange, onSelectedDestChange,
  pinDropMode, onPinDropToggle,
}: SidebarProps) {
  const [scoreOpen, setScoreOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLocation, setNewLocation] = useState<LatLng | null>(null);
  const [newCategory, setNewCategory] = useState<DestinationCategory>("work");

  const addDestination = useCallback(() => {
    if (!newName || !newLocation) return;
    const dest: Destination = {
      id: crypto.randomUUID(),
      name: newName,
      address: newAddress,
      location: newLocation,
      category: newCategory,
      frequency: DEFAULT_FREQUENCY[newCategory],
    };
    onDestinationsChange([...destinations, dest]);
    setNewName("");
    setNewAddress("");
    setNewLocation(null);
    setShowAdd(false);
  }, [newName, newAddress, newLocation, newCategory, destinations, onDestinationsChange]);

  return (
    <aside className="w-[400px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
      {/* Header + Origin */}
      <PanelSection className="pb-8">
        <h1 className="text-4xl leading-none">Transit<br />Heatmap</h1>
        <AddressInput
          label="Your Address"
          value={originAddress}
          onChange={onOriginChange}
        />
      </PanelSection>

      {/* Transport Modes */}
      <PanelSection title="Transport Mode">
        <ModeToggles selected={modes} onChange={onModesChange} />
      </PanelSection>

      {/* Build My Score — collapsible */}
      <div className="border-b-3 border-red">
        <button
          onClick={() => setScoreOpen((o) => !o)}
          aria-expanded={scoreOpen}
          className="w-full p-6 flex justify-between items-center cursor-pointer"
        >
          <h2 className="font-display italic uppercase text-xl font-bold">Build My Score</h2>
          <span className="text-red text-2xl" aria-hidden="true">{scoreOpen ? "−" : "+"}</span>
        </button>

        {scoreOpen && (
          <div className="px-6 pb-6 flex flex-col gap-4">
            {/* Existing destinations */}
            {destinations.map((dest) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
                originLocation={originLocation}
                modes={modes}
                subwayData={subwayData}
                onFrequencyChange={(freq) =>
                  onDestinationsChange(
                    destinations.map((d) => (d.id === dest.id ? { ...d, frequency: freq } : d))
                  )
                }
                onRemove={() => onDestinationsChange(destinations.filter((d) => d.id !== dest.id))}
              />
            ))}

            {/* Add destination form */}
            {showAdd ? (
              <div className="border-3 border-red border-dashed p-3 flex flex-col gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name (e.g. Work, Gym)…"
                  name="destination-name"
                  autoComplete="off"
                  className="bg-transparent border-3 border-red text-red p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-red placeholder:text-red/50 focus:bg-red focus:text-pink"
                />
                <AddressInput
                  label="Address"
                  value={newAddress}
                  onChange={(addr, loc) => {
                    setNewAddress(addr);
                    if (loc) setNewLocation(loc);
                  }}
                />
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setNewCategory(c.key)}
                      className={`text-xs border-2 border-red px-2 py-1 uppercase font-bold cursor-pointer ${
                        newCategory === c.key ? "bg-red text-pink" : ""
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addDestination}
                    disabled={!newName || !newLocation}
                    className="flex-1 border-3 border-red bg-red text-pink font-display italic uppercase py-2 disabled:opacity-30 cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="border-3 border-red px-4 py-2 font-display italic uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowAdd(true)}
                  className="border-3 border-red border-dashed p-3 text-center font-display italic uppercase cursor-pointer hover:bg-red hover:text-pink transition-colors"
                >
                  + Add Place
                </button>
                <button
                  onClick={onPinDropToggle}
                  className={`border-3 border-red p-3 text-center font-display italic uppercase cursor-pointer transition-colors ${
                    pinDropMode ? "bg-red text-pink" : "hover:bg-red hover:text-pink"
                  }`}
                >
                  {pinDropMode ? "Click map to drop pin..." : "Drop Pin on Map"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heatmap Mode (only show when destinations exist) */}
      {destinations.length > 0 && (
        <PanelSection title="Heatmap Mode" className="border-b-0">
          <ViewSwitch view={view} onChange={onViewChange} />
          {view === "perPin" && destinations.length > 0 && (
            <select
              value={selectedDestId ?? ""}
              onChange={(e) => onSelectedDestChange(e.target.value || null)}
              aria-label="Select destination to view"
              className="bg-transparent border-3 border-red p-2 text-red font-display italic uppercase"
            >
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </PanelSection>
      )}

      {/* Monthly footer */}
      <MonthlyFooter totalHours={totalHours} totalCost={totalCost} />
    </aside>
  );
}
