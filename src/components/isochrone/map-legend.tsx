"use client";

export function MapLegend() {
  // Stepped 10-min bands — must match COLOR_RAMP in isochrone-map.tsx
  const stops = [
    { color: "#39ff14", label: "<10" },
    { color: "#ffd000", label: "20" },
    { color: "#ff8800", label: "30" },
    { color: "#ff4400", label: "40" },
    { color: "#e21822", label: "50" },
    { color: "#8b0000", label: "50+" },
  ];

  return (
    <div className="absolute bottom-32 md:bottom-6 right-4 md:right-6 z-10 bg-surface-card/90 border border-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm">
      <p className="font-display italic uppercase text-[10px] text-white/50 tracking-wider mb-2">Travel Time</p>
      <div className="flex items-center gap-0.5 mb-1">
        {stops.map((s, i) => (
          <div
            key={i}
            className="h-2 flex-1 first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: s.color }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {stops.map((s, i) => (
          <span key={i} className="text-[9px] text-white/50">{s.label}</span>
        ))}
      </div>
    </div>
  );
}
