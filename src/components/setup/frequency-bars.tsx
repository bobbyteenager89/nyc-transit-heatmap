interface FrequencyBarsProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
}

export function FrequencyBars({ value, max = 7, onChange }: FrequencyBarsProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange?.(i + 1)}
          aria-label={`${i + 1} times per week`}
          className={`w-6 h-6 border-2 border-red cursor-pointer ${
            i < value ? "bg-red" : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
