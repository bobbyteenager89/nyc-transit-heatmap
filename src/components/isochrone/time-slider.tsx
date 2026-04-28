"use client";

import { useRef, useCallback } from "react";

interface TimeSliderProps {
  value: number;
  onChange: (minutes: number) => void;
}

const SNAP_POINTS = [5, 10, 15, 20, 30, 45, 60];

// Green → yellow → orange → red → purple — matches design TIME_RAMP
const GRADIENT =
  "linear-gradient(90deg," +
  " #39ff14 0%," +
  " #c8ff00 9.1%," +
  " #ffd700 18.2%," +
  " #ffaa00 27.3%," +
  " #ff7700 36.4%," +
  " #ff4500 45.5%," +
  " #e81800 54.5%," +
  " #c8101a 63.6%," +
  " #a00030 72.7%," +
  " #800020 81.8%," +
  " #6a1b6a 90.9%," +
  " #4a0a4a 100%)";

function pctFromMinutes(min: number): number {
  return ((min - 5) / 55) * 100;
}

function snapMinutes(raw: number): number {
  let closest = SNAP_POINTS[0];
  let dist = Math.abs(raw - closest);
  for (const pt of SNAP_POINTS) {
    const d = Math.abs(raw - pt);
    if (d < dist) {
      closest = pt;
      dist = d;
    }
  }
  return closest;
}

export function TimeSlider({ value, onChange }: TimeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const minutesFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 5;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapMinutes(Math.round(pct * 55 + 5));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      onChange(minutesFromClientX(e.clientX));
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [minutesFromClientX, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragging.current) onChange(minutesFromClientX(e.clientX));
    },
    [minutesFromClientX, onChange]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = SNAP_POINTS.indexOf(value);
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        if (idx < SNAP_POINTS.length - 1) onChange(SNAP_POINTS[idx + 1]);
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        if (idx > 0) onChange(SNAP_POINTS[idx - 1]);
        e.preventDefault();
      }
    },
    [value, onChange]
  );

  const thumbPct = pctFromMinutes(value);

  return (
    <div>
      {/* Header row — label left, big mono number right */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.46)",
          }}
        >
          Reach Time
        </span>
        <div className="flex items-baseline gap-1">
          <span
            style={{
              fontFamily: "var(--font-data)",
              fontSize: 32,
              lineHeight: 1,
              color: "#f5f6fa",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontFamily: "var(--font-data)",
              fontSize: 11,
              color: "rgba(255,255,255,0.46)",
            }}
          >
            min
          </span>
        </div>
      </div>

      {/* Drag track */}
      <div
        ref={trackRef}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={5}
        aria-valuemax={60}
        aria-label="Maximum travel time in minutes"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          position: "relative",
          height: 32,
          cursor: "pointer",
          userSelect: "none",
          touchAction: "pan-y",
        }}
      >
        {/* Gradient bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            height: 4,
            borderRadius: 2,
            background: GRADIENT,
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${thumbPct}%`,
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Tick marks + labels */}
      <div style={{ position: "relative", height: 20, marginTop: 2 }}>
        {SNAP_POINTS.map((pt) => {
          const pct = pctFromMinutes(pt);
          const isActive = value >= pt;
          return (
            <div
              key={pt}
              style={{
                position: "absolute",
                left: `${pct}%`,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <div
                style={{
                  width: 1,
                  height: 3,
                  background: isActive
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.1)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-data)",
                  fontSize: 9,
                  lineHeight: 1,
                  color: isActive
                    ? "rgba(255,255,255,0.46)"
                    : "rgba(255,255,255,0.2)",
                }}
              >
                {pt}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
