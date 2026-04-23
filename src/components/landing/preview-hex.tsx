/**
 * Animated hex grid preview for the Find My Neighborhood card.
 * A small 3×3 hex cluster, each cell shimmer-animates with a
 * green→yellow→red color suggesting the commute-score heatmap.
 */
export function PreviewHex() {
  // Flat-top hex layout: col offsets, staggered rows
  const hexes = [
    // row 0
    { cx: 20, cy: 32, color: "#06d6a0", delay: "0ms" },
    { cx: 48, cy: 20, color: "#22d3ee", delay: "200ms" },
    { cx: 76, cy: 32, color: "#06d6a0", delay: "400ms" },
    // row 1
    { cx: 20, cy: 60, color: "#ffbe0b", delay: "300ms" },
    { cx: 48, cy: 48, color: "#f97316", delay: "100ms" },
    { cx: 76, cy: 60, color: "#ffbe0b", delay: "500ms" },
    // row 2
    { cx: 20, cy: 88, color: "#e21822", delay: "600ms" },
    { cx: 48, cy: 76, color: "#f97316", delay: "200ms" },
    { cx: 76, cy: 88, color: "#e21822", delay: "400ms" },
  ];

  // Pointy-top hexagon path for r=13
  const hexPath = (cx: number, cy: number, r = 13) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return `M${pts.join("L")}Z`;
  };

  return (
    <svg
      viewBox="0 0 96 96"
      className="w-24 h-24 opacity-50 group-hover:opacity-90 transition-opacity duration-300"
      aria-hidden
    >
      {hexes.map(({ cx, cy, color, delay }, i) => (
        <path
          key={i}
          d={hexPath(cx, cy)}
          fill={color}
          fillOpacity={0.6}
          stroke={color}
          strokeWidth={0.5}
          strokeOpacity={0.4}
          style={{
            animation: `hex-shimmer 2s ease-in-out ${delay} infinite`,
          }}
        />
      ))}
    </svg>
  );
}
