"use client";

export function MapLegend() {
  const stops = [
    { color: "#00ff87", label: "5m" },
    { color: "#ffdd00", label: "15m" },
    { color: "#ff6600", label: "30m" },
    { color: "#e21822", label: "45m" },
    { color: "#8b0000", label: "60m" },
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
