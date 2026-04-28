"use client";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileBottomSheet({ open, onClose, children }: MobileBottomSheetProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-surface border-t border-white/10 rounded-t-2xl max-h-[85dvh] flex flex-col">
        <div className="relative flex items-center justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
          <button
            onClick={onClose}
            className="absolute right-4 text-white/40 hover:text-white text-2xl leading-none"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
          {children}
        </div>
      </div>
    </>
  );
}
