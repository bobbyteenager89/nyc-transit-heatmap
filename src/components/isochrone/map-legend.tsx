export function MapLegend() {
  return (
    <div className="absolute bottom-6 right-6 z-10 bg-surface-card/90 border border-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm">
      <p className="font-display italic uppercase text-[10px] text-white/50 tracking-wider mb-1.5">Time Zones</p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-white/60">&lt; 20m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="text-[10px] text-white/60">&lt; 40m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-[10px] text-white/60">&lt; 60m</span>
        </div>
      </div>
    </div>
  );
}
