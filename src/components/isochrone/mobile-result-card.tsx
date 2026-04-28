"use client";

interface MobileResultCardProps {
  address: string;
  maxMinutes: number;
  modeCount: number;
  onMenuOpen: () => void;
}

export function MobileResultCard({
  address,
  maxMinutes,
  modeCount,
  onMenuOpen,
}: MobileResultCardProps) {
  return (
    <div className="absolute bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="bg-surface-card/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display italic text-sm text-white truncate">
            {address || "Dropped pin"}
          </p>
          <p className="font-body text-xs text-white/40 mt-0.5">
            {maxMinutes} min · {modeCount} mode{modeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onMenuOpen}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Open settings"
        >
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor" aria-hidden="true">
            <rect y="0" width="14" height="2" rx="1" />
            <rect y="5" width="14" height="2" rx="1" />
            <rect y="10" width="14" height="2" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
