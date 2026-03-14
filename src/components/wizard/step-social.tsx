"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { PanelSection } from "@/components/ui/panel-section";
import type { Destination, LatLng } from "@/lib/types";

interface StepSocialProps {
  value: Destination[];
  onChange: (destinations: Destination[]) => void;
}

export function StepSocial({ value, onChange }: StepSocialProps) {
  const [pendingAddress, setPendingAddress] = useState("");

  const handleSelect = useCallback(
    (selectedAddress: string, selectedLocation: LatLng) => {
      const newDestination: Destination = {
        id: `social-${Date.now()}`,
        name: "Friend / Family",
        address: selectedAddress,
        location: selectedLocation,
        category: "social",
        frequency: 1,
      };
      const updated = [...value, newDestination];
      onChange(updated);
      setPendingAddress("");
    },
    [value, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(value.filter((d) => d.id !== id));
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col">
      <PanelSection>
        <h2 className="font-display italic uppercase text-3xl leading-none">
          Where do<br />friends live?
        </h2>
        <p className="font-body text-sm text-red/60">
          Add addresses for people you visit regularly. Each counts as ~1x/week.
        </p>
      </PanelSection>

      <PanelSection title="Add a Friend or Family Member">
        <AddressAutocomplete
          label="Their address or neighborhood"
          placeholder="Search for address or neighborhood…"
          onSelect={handleSelect}
          initialValue={pendingAddress}
          autoFocus={value.length === 0}
        />
        <p className="font-body text-xs text-red/50">
          Tip: You can also drop a pin on the map later.
        </p>
      </PanelSection>

      {value.length > 0 && (
        <PanelSection title={`${value.length} Location${value.length === 1 ? "" : "s"} Added`}>
          <ul className="flex flex-col gap-2">
            {value.map((dest, i) => (
              <li
                key={dest.id}
                className="flex items-center justify-between border-3 border-red p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-body text-xs font-bold uppercase tracking-widest text-red/60">
                    Friend {i + 1}
                  </span>
                  <span className="font-body text-sm truncate">{dest.address}</span>
                </div>
                <button
                  onClick={() => handleRemove(dest.id)}
                  aria-label={`Remove ${dest.address}`}
                  className="ml-4 flex-shrink-0 w-8 h-8 border-3 border-red flex items-center justify-center font-display italic text-sm hover:bg-red hover:text-pink transition-colors"
                >
                  X
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {value.length === 0 && (
        <div className="p-6">
          <p className="font-body text-sm text-red/50 italic">
            Skip this step if social visits aren&apos;t a factor.
          </p>
        </div>
      )}
    </div>
  );
}
