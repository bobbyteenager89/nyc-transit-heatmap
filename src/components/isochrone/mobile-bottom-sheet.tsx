"use client";

interface MobileBottomSheetProps {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  summary?: React.ReactNode;
}

export function MobileBottomSheet({
  expanded,
  onToggle,
  children,
  summary,
}: MobileBottomSheetProps) {
  return (
    <div
      className={`bg-surface border-t border-white/10 rounded-t-2xl transition-all duration-300 ${
        expanded ? "max-h-[75dvh]" : "max-h-[120px]"
      } overflow-hidden`}
    >
      {/* Drag handle — 44px min touch target */}
      <button
        onClick={onToggle}
        className="w-full flex flex-col items-center pt-2 pb-3 cursor-pointer min-h-[44px] justify-center"
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full" />
      </button>

      {/* Collapsed summary */}
      {!expanded && summary && (
        <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{summary}</div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto max-h-[calc(75dvh-48px)] flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
