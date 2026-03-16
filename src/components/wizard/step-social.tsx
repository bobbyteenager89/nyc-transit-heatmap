"use client";

import { useState, useCallback } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { DropPinMap } from "@/components/shared/drop-pin-map";
import { FrequencyBars } from "@/components/setup/frequency-bars";
import { PanelSection } from "@/components/ui/panel-section";
import type { Destination, LatLng } from "@/lib/types";

interface StepSocialProps {
  value: Destination[];
  onChange: (destinations: Destination[]) => void;
}

type InputMode = "address" | "pin";

interface PendingFriend {
  name: string;
  address: string;
  location: LatLng | null;
  frequency: number;
}

const EMPTY_PENDING: PendingFriend = {
  name: "",
  address: "",
  location: null,
  frequency: 1,
};

export function StepSocial({ value, onChange }: StepSocialProps) {
  const [pending, setPending] = useState<PendingFriend>(EMPTY_PENDING);
  const [inputMode, setInputMode] = useState<InputMode>("address");

  const handleSelect = useCallback(
    (selectedAddress: string, selectedLocation: LatLng) => {
      setPending((p) => ({ ...p, address: selectedAddress, location: selectedLocation }));
    },
    []
  );

  const handlePinDrop = useCallback(
    (location: LatLng, displayName: string) => {
      setPending((p) => ({ ...p, address: displayName, location }));
      setInputMode("address");
    },
    []
  );

  const handleAdd = useCallback(() => {
    if (!pending.location || !pending.name.trim()) return;
    const newDestination: Destination = {
      id: `social-${Date.now()}`,
      name: pending.name.trim(),
      address: pending.address,
      location: pending.location,
      category: "social",
      frequency: pending.frequency,
    };
    onChange([...value, newDestination]);
    setPending(EMPTY_PENDING);
  }, [pending, value, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(value.filter((d) => d.id !== id));
    },
    [value, onChange]
  );

  const canAdd = pending.location !== null && pending.name.trim().length > 0;

  return (
    <div className="flex flex-col">
      <PanelSection>
        <h2 className="font-display italic text-3xl leading-none">
          Where do<br />friends live?
        </h2>
        <p className="font-body text-sm text-red/60">
          Add people you visit regularly — we&apos;ll factor in how often you see them.
        </p>
      </PanelSection>

      <PanelSection title="Add a Friend or Family Member">
        {/* Name input — first field, auto-focused */}
        <div className="flex flex-col gap-2">
          <label className="font-bold uppercase text-xs tracking-widest">
            Name
          </label>
          <input
            type="text"
            value={pending.name}
            onChange={(e) => setPending((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Mom, Jake, Sarah…"
            autoFocus
            className="bg-transparent border-3 border-red text-red font-body text-base p-3 outline-none placeholder:text-red/50 focus:bg-red focus:text-pink"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex border-3 border-red">
          <button
            onClick={() => setInputMode("address")}
            data-testid="mode-address"
            className={`flex-1 py-2 text-xs uppercase font-bold tracking-widest cursor-pointer transition-colors ${
              inputMode === "address"
                ? "bg-red text-pink"
                : "text-red hover:bg-red/10"
            }`}
          >
            Search Address
          </button>
          <button
            onClick={() => setInputMode("pin")}
            data-testid="mode-pin"
            className={`flex-1 py-2 text-xs uppercase font-bold tracking-widest border-l-3 border-red cursor-pointer transition-colors ${
              inputMode === "pin"
                ? "bg-red text-pink"
                : "text-red hover:bg-red/10"
            }`}
          >
            Drop a Pin
          </button>
        </div>

        {inputMode === "address" ? (
          <>
            <AddressAutocomplete
              label="Their address or neighborhood"
              placeholder="Search for address or neighborhood..."
              onSelect={handleSelect}
              initialValue={pending.address}
            />
            <p className="font-body text-xs text-red/50">
              Don&apos;t know the exact address?{" "}
              <button
                onClick={() => setInputMode("pin")}
                className="underline hover:text-red cursor-pointer"
              >
                Drop a pin on the map instead
              </button>
            </p>
          </>
        ) : (
          <DropPinMap
            onPinDrop={handlePinDrop}
            onCancel={() => setInputMode("address")}
          />
        )}

        {/* Frequency — shown after address is selected */}
        {pending.location && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <FrequencyBars
                value={pending.frequency}
                max={7}
                onChange={(f) => setPending((p) => ({ ...p, frequency: f }))}
              />
              <span className="font-body text-sm font-bold ml-4">{pending.frequency}x / week</span>
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={`w-full border-3 border-red font-display italic uppercase text-base py-3 transition-colors ${
            canAdd
              ? "bg-red text-pink hover:bg-red/90 cursor-pointer"
              : "bg-transparent text-red/30 cursor-not-allowed"
          }`}
        >
          Add Friend
        </button>
      </PanelSection>

      {value.length > 0 && (
        <PanelSection title={`${value.length} Friend${value.length === 1 ? "" : "s"} Added`}>
          <ul className="flex flex-col gap-2">
            {value.map((dest) => (
              <li
                key={dest.id}
                className="flex items-center justify-between border-3 border-red p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-body text-xs font-bold uppercase tracking-widest text-red/60">
                    {dest.name} &middot; {dest.frequency}x/wk
                  </span>
                  <span className="font-body text-sm truncate">{dest.address}</span>
                </div>
                <button
                  onClick={() => handleRemove(dest.id)}
                  aria-label={`Remove ${dest.name}`}
                  className="ml-4 flex-shrink-0 w-8 h-8 border-3 border-red flex items-center justify-center font-display italic text-sm hover:bg-red hover:text-pink transition-colors"
                >
                  X
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {value.length === 0 && !pending.location && (
        <div className="p-6">
          <p className="font-body text-sm text-red/50 italic">
            Skip this step if social visits aren&apos;t a factor.
          </p>
        </div>
      )}
    </div>
  );
}
