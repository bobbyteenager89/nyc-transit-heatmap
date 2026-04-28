"use client";

interface QuickStart {
  name: string;
  lat: number;
  lng: number;
}

interface MobileInstructionProps {
  onQuickStart: (name: string, lat: number, lng: number) => void;
}

const QUICK_STARTS: QuickStart[] = [
  { name: "Times Square", lat: 40.758, lng: -73.9855 },
  { name: "Williamsburg", lat: 40.7081, lng: -73.9571 },
  { name: "Astoria", lat: 40.7724, lng: -73.9301 },
];

export function MobileInstruction({ onQuickStart }: MobileInstructionProps) {
  return (
    <div className="absolute bottom-0 inset-x-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="bg-surface-card/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4">
        <p className="font-display italic uppercase text-white text-lg text-center mb-1">
          Tap anywhere on the map
        </p>
        <p className="font-body text-xs text-white/40 text-center mb-3">
          See how far you can travel in NYC
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          {QUICK_STARTS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => onQuickStart(loc.name, loc.lat, loc.lng)}
              className="px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-body hover:bg-accent/20 transition-colors"
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
