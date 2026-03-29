"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import type { LatLng, Destination, DestinationCategory } from "@/lib/types";

interface DestinationInputProps {
  destinations: Destination[];
  onAdd: (dest: Destination) => void;
  onRemove: (id: string) => void;
}

const CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "work", label: "Work" },
  { key: "fitness", label: "Gym" },
  { key: "social", label: "Social" },
  { key: "other", label: "Other" },
];

const FREQ_OPTIONS = [1, 2, 3, 5, 7];

export function DestinationInput({ destinations, onAdd, onRemove }: DestinationInputProps) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<DestinationCategory>("work");
  const [frequency, setFrequency] = useState(5);

  const handleSelect = useCallback(
    (address: string, location: LatLng) => {
      const dest: Destination = {
        id: `dest-${Date.now()}`,
        name: address.split(",")[0], // first part of address
        address,
        location,
        category,
        frequency,
      };
      onAdd(dest);
      setShowForm(false);
      setCategory("work");
      setFrequency(5);
    },
    [category, frequency, onAdd]
  );

  return (
    <div className="space-y-3">
      {/* Existing destinations */}
      {destinations.map((dest) => (
        <div
          key={dest.id}
          className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg border border-white/10"
        >
          <div className="min-w-0">
            <p className="text-xs text-white truncate">{dest.name}</p>
            <p className="text-[10px] text-white/30">
              {dest.frequency}x/week · {dest.category}
            </p>
          </div>
          <button
            onClick={() => onRemove(dest.id)}
            className="text-[10px] text-white/30 hover:text-white/60 cursor-pointer ml-2 flex-shrink-0"
          >
            ×
          </button>
        </div>
      ))}

      {/* Add form */}
      {showForm ? (
        <div className="space-y-2">
          <AddressAutocomplete
            label=""
            placeholder="Enter destination address…"
            onSelect={handleSelect}
          />
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`text-[10px] px-2 py-1 rounded border cursor-pointer transition-all ${
                  category === c.key
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40">Frequency:</span>
            {FREQ_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`text-[10px] w-6 h-6 rounded border cursor-pointer transition-all ${
                  frequency === f
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                {f}
              </button>
            ))}
            <span className="text-[10px] text-white/30">/wk</span>
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="text-[10px] text-white/30 hover:text-white/50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-white/15 rounded-lg py-2 text-xs text-white/40 hover:text-white/60 hover:border-white/30 cursor-pointer transition-all"
        >
          + Add Destination
        </button>
      )}
    </div>
  );
}
