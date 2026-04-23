/**
 * Animated bar chart preview for the Rankings card.
 * 5 bars grow up from baseline on mount, simulating a neighborhood
 * ranking chart. Heights vary to suggest ranked data.
 */
export function PreviewRankings() {
  const bars = [
    { h: 64, color: "#22d3ee", delay: "0ms" },
    { h: 52, color: "#22d3ee", delay: "80ms" },
    { h: 40, color: "#06d6a0", delay: "160ms" },
    { h: 30, color: "#f97316", delay: "240ms" },
    { h: 20, color: "#e21822", delay: "320ms" },
  ];

  const barW = 12;
  const gap = 6;
  const totalW = bars.length * barW + (bars.length - 1) * gap;
  const startX = (96 - totalW) / 2;
  const baseY = 80;

  return (
    <svg
      viewBox="0 0 96 96"
      className="w-24 h-24 opacity-50 group-hover:opacity-90 transition-opacity duration-300"
      aria-hidden
    >
      {/* Baseline */}
      <line
        x1={startX - 2}
        y1={baseY}
        x2={startX + totalW + 2}
        y2={baseY}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />
      {bars.map(({ h, color, delay }, i) => {
        const x = startX + i * (barW + gap);
        return (
          <rect
            key={i}
            x={x}
            y={baseY - h}
            width={barW}
            height={h}
            rx={2}
            fill={color}
            fillOpacity={0.8}
            style={{
              transformOrigin: `${x + barW / 2}px ${baseY}px`,
              animation: `bar-grow 0.6s cubic-bezier(0.16,1,0.3,1) ${delay} both`,
            }}
          />
        );
      })}
    </svg>
  );
}
