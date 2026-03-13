interface MonthlyFooterProps {
  totalHours: number;
  totalCost: number;
}

export function MonthlyFooter({ totalHours, totalCost }: MonthlyFooterProps) {
  return (
    <div className="mt-auto bg-red text-pink p-6">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs uppercase font-bold">Avg Mo. Transit Time</span>
      </div>
      <div className="flex justify-between items-end">
        <span className="text-4xl font-display italic">{Math.round(totalHours)} HR</span>
        <span className="text-xs text-right uppercase font-bold">Based on<br />frequency</span>
      </div>
      <div className="mt-4">
        <span className="text-xs uppercase font-bold">Est Mo. Cost</span>
        <div className="text-3xl font-display italic">${totalCost.toFixed(2)}</div>
      </div>
    </div>
  );
}
