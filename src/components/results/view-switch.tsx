"use client";

interface ViewSwitchProps {
  view: "composite" | "perPin";
  onChange: (view: "composite" | "perPin") => void;
}

export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div className="flex border-3 border-red">
      <button
        onClick={() => onChange("composite")}
        className={`flex-1 font-display italic uppercase py-3 border-r-3 border-red ${
          view === "composite" ? "bg-red text-pink" : "text-red"
        }`}
      >
        Composite
      </button>
      <button
        onClick={() => onChange("perPin")}
        className={`flex-1 font-display italic uppercase py-3 ${
          view === "perPin" ? "bg-red text-pink" : "text-red"
        }`}
      >
        Per Pin
      </button>
    </div>
  );
}
