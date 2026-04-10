"use client";

export function MapLegend() {
  // Hybrid bands — gradient within each band, visible jump at edges.
  // Must match COLOR_RAMP in isochrone-map.tsx.
  const bands = [
    { from: "#39ff14", to: "#8aff00", label: "<10" },
    { from: "#ffd000", to: "#ffb000", label: "20" },
    { from: "#ff8800", to: "#ff6200", label: "30" },
    { from: "#ff4400", to: "#f02010", label: "40" },
    { from: "#e21822", to: "#c01020", label: "50" },
    { from: "#8b0000", to: "#5a0000", label: "50+" },
  ];

  return (
    <div className="absolute bottom-32 md:bottom-6 right-4 md:right-6 z-10 bg-surface-card/90 border border-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm">
      <p className="font-display italic uppercase text-[10px] text-white/50 tracking-wider mb-2">Travel Time</p>
      <div className="flex items-center gap-0.5 mb-1">
        {bands.map((b, i) => (
          <div
            key={i}
            className="h-2 flex-1 first:rounded-l-full last:rounded-r-full"
            style={{ background: `linear-gradient(90deg, ${b.from}, ${b.to})` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {bands.map((b, i) => (
          <span key={i} className="text-[9px] text-white/50">{b.label}</span>
        ))}
      </div>
    </div>
  );
}
