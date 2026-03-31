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
        expanded ? "max-h-[75vh]" : "max-h-[120px]"
      } overflow-hidden`}
    >
      {/* Drag handle */}
      <button
        onClick={onToggle}
        className="w-full flex flex-col items-center pt-2 pb-3 cursor-pointer"
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full" />
      </button>

      {/* Collapsed summary */}
      {!expanded && summary && (
        <div className="px-4 pb-3">{summary}</div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-6 overflow-y-auto max-h-[calc(75vh-48px)] flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
