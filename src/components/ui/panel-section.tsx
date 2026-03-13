interface PanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelSection({ title, children, className = "" }: PanelSectionProps) {
  return (
    <div className={`border-b-3 border-red p-6 flex flex-col gap-4 ${className}`}>
      {title && (
        <h2 className="font-display italic uppercase text-xl font-bold">{title}</h2>
      )}
      {children}
    </div>
  );
}
