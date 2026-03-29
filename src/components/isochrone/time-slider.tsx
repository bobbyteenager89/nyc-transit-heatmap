"use client";

import { useCallback } from "react";

interface TimeSliderProps {
  value: number;
  onChange: (minutes: number) => void;
}

const SNAP_POINTS = [5, 10, 15, 20, 30, 45, 60];

export function TimeSlider({ value, onChange }: TimeSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(e.target.value, 10);
      let closest = SNAP_POINTS[0];
      let closestDist = Math.abs(raw - closest);
      for (const pt of SNAP_POINTS) {
        const dist = Math.abs(raw - pt);
        if (dist < closestDist) {
          closest = pt;
          closestDist = dist;
        }
      }
      onChange(closest);
    },
    [onChange]
  );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-display italic uppercase text-xs text-white/50">Reach Time</span>
        <div>
          <span className="font-display italic text-2xl text-white">{value}</span>
          <span className="font-body text-xs text-white/40 ml-1">min</span>
        </div>
      </div>

      <input
        type="range"
        min={5}
        max={60}
        step={1}
        value={value}
        onChange={handleChange}
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer
          bg-gradient-to-r from-green-400 via-yellow-400 to-red-500
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.5)]
          [&::-moz-range-thumb]:cursor-pointer"
        aria-label={`Maximum travel time: ${value} minutes`}
      />

      <div className="flex justify-between mt-1.5">
        {[5, 30, 60].map((pt) => (
          <button
            key={pt}
            onClick={() => onChange(pt)}
            className={`text-[10px] font-body cursor-pointer transition-colors ${
              value >= pt ? "text-white/50" : "text-white/20"
            }`}
          >
            {pt}m
          </button>
        ))}
      </div>
    </div>
  );
}
