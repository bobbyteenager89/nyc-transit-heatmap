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
      className={`border-3 border-red font-display italic uppercase text-base px-3 py-2.5 cursor-pointer transition-colors text-center ${
        wide ? "col-span-2" : ""
      } ${
        active ? "bg-red text-pink" : "bg-transparent text-red hover:bg-red hover:text-pink"
      }`}
    >
      {label}
    </button>
  );
}
