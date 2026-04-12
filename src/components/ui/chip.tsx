"use client";

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  wide?: boolean;
}

export function Chip({ label, active, onClick, wide }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`border rounded font-display italic uppercase text-base px-3 py-2.5 cursor-pointer transition-colors text-center ${
        wide ? "col-span-2" : ""
      } ${
        active ? "border-accent bg-accent/20 text-accent" : "border-white/20 text-white/60 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
