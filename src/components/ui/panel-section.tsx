interface PanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelSection({ title, children, className = "" }: PanelSectionProps) {
  return (
    <div className={`border border-white/10 rounded-xl bg-surface-card p-5 flex flex-col gap-3 ${className}`}>
      {title && (
        <h2 className="font-display italic uppercase text-sm font-bold text-white/70 tracking-wider">{title}</h2>
      )}
      {children}
    </div>
  );
}
