"use client";

import { FrequencyBars } from "./frequency-bars";
import type { Destination, TransportMode, LatLng } from "@/lib/types";
import { walkTime, bikeTime, driveTime } from "@/lib/travel-time";
import { computeSubwayTime, SubwayData } from "@/lib/subway";

interface DestinationCardProps {
  destination: Destination;
  originLocation: LatLng | null;
  modes: TransportMode[];
  subwayData: SubwayData | null;
  onFrequencyChange: (freq: number) => void;
  onRemove: () => void;
}

function formatTime(min: number): string {
  return `${Math.round(min)}m`;
}

export function DestinationCard({
  destination,
  originLocation,
  modes,
  subwayData,
  onFrequencyChange,
  onRemove,
}: DestinationCardProps) {
  const estimates: { mode: string; time: number }[] = [];
  if (originLocation) {
    if (modes.includes("walk")) estimates.push({ mode: "Walk", time: walkTime(originLocation, destination.location) });
    if (modes.includes("car")) estimates.push({ mode: "Car", time: driveTime(originLocation, destination.location) });
    if (modes.includes("bike")) estimates.push({ mode: "Bike", time: bikeTime(originLocation, destination.location) });
    if (modes.includes("subway") && subwayData) {
      const t = computeSubwayTime(subwayData, originLocation, destination.location);
      if (t !== null) estimates.push({ mode: "Subway", time: t });
    }
  }

  const bestTime = estimates.length > 0 ? Math.min(...estimates.map((e) => e.time)) : null;
  const weeklyMinutes = bestTime !== null ? Math.round(bestTime * destination.frequency * 2) : null;

  return (
    <div className="border-3 border-red p-3 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-display italic uppercase text-lg">{destination.name}</span>
          <p className="text-xs">{destination.address}</p>
        </div>
        <button onClick={onRemove} className="text-red/50 hover:text-red text-sm">✕</button>
      </div>

      {estimates.length > 0 && (
        <div className="text-xs flex flex-wrap gap-2">
          {estimates.map((e) => (
            <span key={e.mode} className={e.time === bestTime ? "font-bold" : "opacity-60"}>
              {e.mode} {formatTime(e.time)}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <FrequencyBars value={destination.frequency} onChange={onFrequencyChange} />
        {weeklyMinutes !== null && (
          <span className="text-xs font-bold">
            {destination.frequency}×/wk = {weeklyMinutes} min/wk
          </span>
        )}
      </div>
    </div>
  );
}
