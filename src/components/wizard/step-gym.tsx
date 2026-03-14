"use client";

import { useState, useCallback, useMemo } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { FrequencyBars } from "@/components/setup/frequency-bars";
import { PanelSection } from "@/components/ui/panel-section";
import { GYM_CHAINS, searchGymChains } from "@/lib/gym-chains";
import type { GymChain } from "@/lib/gym-chains";
import type { Destination, LatLng } from "@/lib/types";

type GymMode = "chain" | "address";

interface StepGymProps {
  value: Destination | null;
  onChange: (destination: Destination | null) => void;
}

export function StepGym({ value, onChange }: StepGymProps) {
  const [mode, setMode] = useState<GymMode>(
    value?.locations && value.locations.length > 0 ? "chain" : "address"
  );
  const [selectedChain, setSelectedChain] = useState<GymChain | null>(
    value?.locations && value.locations.length > 0
      ? GYM_CHAINS.find((c) => value.name === c.name) ?? null
      : null
  );
  const [chainQuery, setChainQuery] = useState("");
  const [address, setAddress] = useState(value?.address ?? "");
  const [location, setLocation] = useState<LatLng | null>(value?.location ?? null);
  const [frequency, setFrequency] = useState(value?.frequency ?? 3);

  const chainResults = useMemo(
    () => (chainQuery.length > 0 ? searchGymChains(chainQuery) : []),
    [chainQuery]
  );

  const buildDestination = useCallback(
    (overrides: {
      mode?: GymMode;
      chain?: GymChain | null;
      addr?: string;
      loc?: LatLng | null;
      freq?: number;
    }): Destination | null => {
      const m = overrides.mode ?? mode;
      const f = overrides.freq ?? frequency;

      if (m === "chain") {
        const c = overrides.chain ?? selectedChain;
        if (!c) return null;
        const locs = c.locations.map((l) => l.latlng);
        return {
          id: "gym",
          name: c.name,
          address: `${c.name} (${c.locations.length} locations)`,
          location: locs[0],
          locations: locs,
          category: "fitness",
          frequency: f,
        };
      }

      const loc = overrides.loc ?? location;
      const addr = overrides.addr ?? address;
      if (!loc) return null;
      return {
        id: "gym",
        name: "Gym",
        address: addr,
        location: loc,
        category: "fitness",
        frequency: f,
      };
    },
    [mode, selectedChain, address, location, frequency]
  );

  const handleSelectChain = useCallback(
    (chain: GymChain) => {
      setSelectedChain(chain);
      setChainQuery("");
      const dest = buildDestination({ chain, mode: "chain" });
      onChange(dest);
    },
    [buildDestination, onChange]
  );

  const handleClearChain = useCallback(() => {
    setSelectedChain(null);
    onChange(null);
  }, [onChange]);

  const handleAddressSelect = useCallback(
    (selectedAddress: string, selectedLocation: LatLng) => {
      setAddress(selectedAddress);
      setLocation(selectedLocation);
      onChange(buildDestination({ addr: selectedAddress, loc: selectedLocation, mode: "address" }));
    },
    [buildDestination, onChange]
  );

  const handleFrequencyChange = useCallback(
    (newFrequency: number) => {
      setFrequency(newFrequency);
      const dest = buildDestination({ freq: newFrequency });
      if (dest) onChange(dest);
    },
    [buildDestination, onChange]
  );

  const handleModeSwitch = useCallback(
    (newMode: GymMode) => {
      setMode(newMode);
      // Clear the other mode's selection
      if (newMode === "chain") {
        setAddress("");
        setLocation(null);
        onChange(selectedChain ? buildDestination({ mode: "chain" }) : null);
      } else {
        setSelectedChain(null);
        setChainQuery("");
        onChange(location ? buildDestination({ mode: "address" }) : null);
      }
    },
    [buildDestination, onChange, selectedChain, location]
  );

  const hasSelection = mode === "chain" ? !!selectedChain : !!location;

  return (
    <div className="flex flex-col">
      <PanelSection>
        <h2 className="font-display italic uppercase text-3xl leading-none">
          Where do<br />you work out?
        </h2>
        <p className="font-body text-sm text-red/60">
          Pick a gym chain with multiple locations, or enter a specific address.
        </p>
      </PanelSection>

      {/* Mode toggle */}
      <PanelSection>
        <div className="flex border-3 border-red">
          <button
            onClick={() => handleModeSwitch("chain")}
            className={`flex-1 py-3 font-display italic uppercase text-sm cursor-pointer transition-colors ${
              mode === "chain" ? "bg-red text-pink" : "hover:bg-red/10"
            }`}
          >
            Gym Chain
          </button>
          <button
            onClick={() => handleModeSwitch("address")}
            className={`flex-1 py-3 font-display italic uppercase text-sm cursor-pointer transition-colors border-l-3 border-red ${
              mode === "address" ? "bg-red text-pink" : "hover:bg-red/10"
            }`}
          >
            Specific Address
          </button>
        </div>
      </PanelSection>

      {mode === "chain" ? (
        <PanelSection title="Select Your Gym">
          {selectedChain ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-3 border-red p-4">
                <div>
                  <p className="font-display italic uppercase text-lg">{selectedChain.name}</p>
                  <p className="font-body text-xs text-red/60">
                    {selectedChain.locations.length} NYC location{selectedChain.locations.length !== 1 ? "s" : ""} — closest used per neighborhood
                  </p>
                </div>
                <button
                  onClick={handleClearChain}
                  className="font-display italic uppercase text-xs border-3 border-red px-3 py-1 hover:bg-red hover:text-pink transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {selectedChain.locations.map((loc, i) => (
                  <p key={i} className="font-body text-xs text-red/50 pl-2">
                    {loc.name}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={chainQuery}
                onChange={(e) => setChainQuery(e.target.value)}
                placeholder="Search gym chains..."
                autoFocus
                className="w-full border-3 border-red bg-transparent px-4 py-3 font-body text-sm placeholder:text-red/30 outline-none focus:bg-red/5"
              />
              {chainQuery.length > 0 && chainResults.length === 0 && (
                <p className="font-body text-xs text-red/50 italic px-1">
                  No chains found. Try &ldquo;Equinox&rdquo;, &ldquo;Planet Fitness&rdquo;, or switch to Specific Address.
                </p>
              )}
              {chainResults.length > 0 && (
                <div className="flex flex-col border-3 border-red">
                  {chainResults.map((chain, i) => (
                    <button
                      key={chain.id}
                      onClick={() => handleSelectChain(chain)}
                      className={`flex items-center justify-between px-4 py-3 text-left hover:bg-red hover:text-pink transition-colors cursor-pointer ${
                        i < chainResults.length - 1 ? "border-b-3 border-red" : ""
                      }`}
                    >
                      <span className="font-display italic uppercase text-sm">{chain.name}</span>
                      <span className="font-body text-xs text-red/50">
                        {chain.locations.length} location{chain.locations.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {chainQuery.length === 0 && (
                <div className="flex flex-col border-3 border-red">
                  {GYM_CHAINS.slice(0, 6).map((chain, i) => (
                    <button
                      key={chain.id}
                      onClick={() => handleSelectChain(chain)}
                      className={`flex items-center justify-between px-4 py-3 text-left hover:bg-red hover:text-pink transition-colors cursor-pointer ${
                        i < 5 ? "border-b-3 border-red" : ""
                      }`}
                    >
                      <span className="font-display italic uppercase text-sm">{chain.name}</span>
                      <span className="font-body text-xs text-red/50">
                        {chain.locations.length} location{chain.locations.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </PanelSection>
      ) : (
        <PanelSection title="Gym / Studio Address">
          <AddressAutocomplete
            label="Gym address"
            placeholder="Search for your gym or studio..."
            onSelect={handleAddressSelect}
            initialValue={address}
            autoFocus
          />
          {location && (
            <p className="font-body text-xs text-red/50">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </PanelSection>
      )}

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

      {!hasSelection && (
        <div className="p-6">
          <p className="font-body text-sm text-red/50 italic">
            Skip this step if fitness isn&apos;t a factor.
          </p>
        </div>
      )}
    </div>
  );
}
