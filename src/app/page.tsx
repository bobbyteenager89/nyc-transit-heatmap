"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressInput } from "@/components/setup/address-input";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { DestinationList } from "@/components/setup/destination-list";
import { PanelSection } from "@/components/ui/panel-section";
import type { LatLng, TransportMode, Destination } from "@/lib/types";
import { DEFAULT_BOUNDS } from "@/lib/constants";

export default function SetupPage() {
  const router = useRouter();
  const [originAddress, setOriginAddress] = useState("");
  const [originLocation, setOriginLocation] = useState<LatLng | null>(null);
  const [modes, setModes] = useState<TransportMode[]>(["subway", "bike", "bikeSubway"]);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const canSubmit = originLocation && destinations.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    sessionStorage.setItem("heatmap-setup", JSON.stringify({
      origin: originLocation,
      originAddress,
      modes,
      destinations,
      bounds: DEFAULT_BOUNDS,
    }));
    router.push("/results");
  };

  return (
    <div className="flex h-full border-3 border-red">
      <div className="w-full max-w-lg mx-auto flex flex-col overflow-y-auto">
        <PanelSection className="border-b-0 pb-8">
          <h1 className="text-5xl leading-none">
            Transit<br />Heatmap
          </h1>
        </PanelSection>

        <PanelSection title="Origin Address">
          <AddressInput
            label="Where are you starting from?"
            value={originAddress}
            onChange={(addr, loc) => {
              setOriginAddress(addr);
              if (loc) setOriginLocation(loc);
            }}
          />
          {originLocation && (
            <p className="text-xs opacity-50">
              {originLocation.lat.toFixed(4)}, {originLocation.lng.toFixed(4)}
            </p>
          )}
        </PanelSection>

        <PanelSection title="Transport Modes">
          <ModeToggles selected={modes} onChange={setModes} />
        </PanelSection>

        <PanelSection title="Pinned Destinations" className="flex-1">
          <DestinationList
            destinations={destinations}
            onChange={setDestinations}
            originLocation={originLocation}
            modes={modes}
          />
        </PanelSection>

        <div className="p-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full border-3 border-red font-display italic uppercase text-xl py-4 cursor-pointer transition-colors ${
              canSubmit
                ? "bg-red text-pink hover:bg-red/90"
                : "bg-transparent text-red/30 cursor-not-allowed"
            }`}
          >
            Show Heatmap
          </button>
        </div>
      </div>
    </div>
  );
}
