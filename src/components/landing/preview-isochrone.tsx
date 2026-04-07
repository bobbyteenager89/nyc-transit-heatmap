/**
 * Animated isochrone ring preview for the Explore card.
 * Three concentric rings that gently pulse outward on hover.
 * Pure SVG + inline CSS — no deps, respects prefers-reduced-motion via
 * the parent .card-enter suppression rule in globals.css.
 */
export function PreviewIsochrone() {
  const rings = [
    { r: 12, color: "#06d6a0", delay: "0ms", label: "5 min" },
    { r: 26, color: "#f97316", delay: "150ms", label: "15 min" },
    { r: 40, color: "#e21822", delay: "300ms", label: "30 min" },
  ];

  return (
    <svg
      viewBox="0 0 96 96"
      className="w-24 h-24 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
      aria-hidden
    >
      {rings.map(({ r, color, delay }) => (
        <circle
          key={r}
          cx={48}
          cy={48}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          style={{
            animation: `ring-pulse 2.4s ease-in-out ${delay} infinite`,
            transformOrigin: "48px 48px",
          }}
        />
      ))}
      {/* Center pin dot */}
      <circle cx={48} cy={48} r={4} fill="#22d3ee" />
    </svg>
  );
}
