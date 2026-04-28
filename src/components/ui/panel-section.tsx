interface PanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelSection({ title, children, className = "" }: PanelSectionProps) {
  return (
    <div
      className={className}
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {title && (
        <p
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.46)",
            lineHeight: 1,
          }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
