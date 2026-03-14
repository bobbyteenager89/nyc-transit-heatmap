"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { FrequencyBars } from "@/components/setup/frequency-bars";
import { PanelSection } from "@/components/ui/panel-section";
import type { Destination, LatLng } from "@/lib/types";

interface StepGymProps {
  value: Destination | null;
  onChange: (destination: Destination | null) => void;
}

export function StepGym({ value, onChange }: StepGymProps) {
  const [address, setAddress] = useState(value?.address ?? "");
  const [location, setLocation] = useState<LatLng | null>(value?.location ?? null);
  const [frequency, setFrequency] = useState(value?.frequency ?? 3);

  const handleSelect = useCallback(
    (selectedAddress: string, selectedLocation: LatLng) => {
      setAddress(selectedAddress);
      setLocation(selectedLocation);
      onChange({
        id: "gym",
        name: "Gym",
        address: selectedAddress,
        location: selectedLocation,
        category: "fitness",
        frequency,
      });
    },
    [frequency, onChange]
  );

  const handleFrequencyChange = useCallback(
    (newFrequency: number) => {
      setFrequency(newFrequency);
      if (location) {
        onChange({
          id: "gym",
          name: "Gym",
          address,
          location,
          category: "fitness",
          frequency: newFrequency,
        });
      }
    },
    [address, location, onChange]
  );

  return (
    <div className="flex flex-col">
      <PanelSection>
        <h2 className="font-display italic uppercase text-3xl leading-none">
          Where do<br />you work out?
        </h2>
        <p className="font-body text-sm text-red/60">
          Gym, studio, or favorite running spot.
        </p>
      </PanelSection>

      <PanelSection title="Gym / Studio Address">
        <AddressAutocomplete
          label="Gym address"
          placeholder="Search for your gym or studio…"
          onSelect={handleSelect}
          initialValue={address}
          autoFocus
        />
        {location && (
          <p className="font-body text-xs text-red/50">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}
      </PanelSection>

      <PanelSection title="How often do you go?">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <FrequencyBars value={frequency} max={7} onChange={handleFrequencyChange} />
            <span className="font-body text-sm font-bold ml-4">{frequency}x / week</span>
          </div>
          <p className="font-body text-xs text-red/50">
            Tap a bar to set frequency (default: 3 days/week)
          </p>
        </div>
      </PanelSection>

      {!location && (
        <div className="p-6">
          <p className="font-body text-sm text-red/50 italic">
            Skip this step if fitness isn&apos;t a factor.
          </p>
        </div>
      )}
    </div>
  );
}
