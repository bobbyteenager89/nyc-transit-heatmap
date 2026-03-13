"use client";

import { useState, useEffect, useCallback } from "react";
import { DestinationCard } from "./destination-card";
import { AddressInput } from "./address-input";
import { DEFAULT_FREQUENCY } from "@/lib/constants";
import { SubwayData } from "@/lib/subway";
import type { Destination, DestinationCategory, TransportMode, LatLng, StationGraph, StationMatrix } from "@/lib/types";

interface DestinationListProps {
  destinations: Destination[];
  onChange: (destinations: Destination[]) => void;
  originLocation: LatLng | null;
  modes: TransportMode[];
}

const CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "work", label: "Work" },
  { key: "social", label: "Social" },
  { key: "fitness", label: "Fitness" },
  { key: "errands", label: "Errands" },
  { key: "other", label: "Other" },
];

export function DestinationList({ destinations, onChange, originLocation, modes }: DestinationListProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLocation, setNewLocation] = useState<LatLng | null>(null);
  const [newCategory, setNewCategory] = useState<DestinationCategory>("work");
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
        ]);
        const graph: StationGraph = await graphRes.json();
        const matrix: StationMatrix = await matrixRes.json();
        setSubwayData(new SubwayData(graph, matrix));
      } catch (e) {
        console.warn("Failed to load subway data for estimates", e);
      }
    }
    load();
  }, []);

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
    onChange([...destinations, dest]);
    setNewName("");
    setNewAddress("");
    setNewLocation(null);
    setShowAdd(false);
  }, [newName, newAddress, newLocation, newCategory, destinations, onChange]);

  return (
    <div className="flex flex-col gap-3">
      {destinations.map((dest) => (
        <DestinationCard
          key={dest.id}
          destination={dest}
          originLocation={originLocation}
          modes={modes}
          subwayData={subwayData}
          onFrequencyChange={(freq) =>
            onChange(destinations.map((d) => (d.id === dest.id ? { ...d, frequency: freq } : d)))
          }
          onRemove={() => onChange(destinations.filter((d) => d.id !== dest.id))}
        />
      ))}

      {showAdd ? (
        <div className="border-3 border-red border-dashed p-3 flex flex-col gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (e.g. Work, Gym)"
            className="bg-transparent border-3 border-red text-red p-2 text-sm outline-none placeholder:text-red/50 focus:bg-red focus:text-pink"
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
                className={`text-xs border-2 border-red px-2 py-1 uppercase font-bold ${
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
              className="flex-1 border-3 border-red bg-red text-pink font-display italic uppercase py-2 disabled:opacity-30"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="border-3 border-red px-4 py-2 font-display italic uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="border-3 border-red border-dashed p-3 text-center font-display italic uppercase cursor-pointer hover:bg-red hover:text-pink transition-colors"
        >
          + Add Place
        </button>
      )}
    </div>
  );
}
