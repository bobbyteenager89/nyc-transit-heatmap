"use client";

interface FairnessSliderProps {
  value: number; // max acceptable time difference in minutes
  onChange: (minutes: number) => void;
}

const PRESETS = [5, 10, 15];

export function FairnessSlider({ value, onChange }: FairnessSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-display italic uppercase text-xs text-amber-500">
          Fairness Zone
        </span>
        <span className="font-display italic uppercase text-xs">
          ±{value} min
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={15}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 appearance-none bg-amber-500/20 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:bg-amber-500 [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none"
        aria-label={`Maximum travel time difference: ${value} minutes`}
      />

      <div className="flex justify-between mt-1">
        {PRESETS.map((pt) => (
          <button
            key={pt}
            onClick={() => onChange(pt)}
            className={`text-xs font-body cursor-pointer transition-colors ${
              value >= pt ? "text-amber-500" : "text-amber-500/30"
            }`}
          >
            ±{pt}m
          </button>
        ))}
      </div>

      <p className="font-body text-[10px] text-red/40 mt-2 leading-tight">
        Green = equally convenient for both. Tight range = fewer options, more fair.
      </p>
    </div>
  );
}
