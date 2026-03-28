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
      <div className="flex items-center justify-between mb-2">
        <span className="font-display italic uppercase text-sm">
          {value} min
        </span>
      </div>

      <input
        type="range"
        min={5}
        max={60}
        step={1}
        value={value}
        onChange={handleChange}
        className="w-full h-2 appearance-none bg-red/30 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:bg-red [&::-webkit-slider-thumb]:border-3
          [&::-webkit-slider-thumb]:border-pink [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:bg-red [&::-moz-range-thumb]:border-3
          [&::-moz-range-thumb]:border-pink [&::-moz-range-thumb]:border-solid
          [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none"
        aria-label={`Maximum travel time: ${value} minutes`}
      />

      <div className="flex justify-between mt-1">
        {SNAP_POINTS.map((pt) => (
          <button
            key={pt}
            onClick={() => onChange(pt)}
            className={`text-xs font-body cursor-pointer transition-colors ${
              value >= pt ? "text-red" : "text-red/30"
            }`}
          >
            {pt}
          </button>
        ))}
      </div>
    </div>
  );
}
