"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TransportMode } from "@/lib/types";

/**
 * Reach-race button: animates through walk -> bike -> subway mode views
 * with the time slider expanding from 5 to 60 min for each mode.
 *
 * Shows all three modes' reach shapes sequentially to tell the story of
 * how each mode "blooms" from an origin point.
 *
 * Respects prefers-reduced-motion: skips straight to the fastest view.
 */

interface ReachRaceButtonProps {
  viewMode: string;
  onViewModeChange: (mode: TransportMode | "fastest") => void;
  onMaxMinutesChange: (mins: number) => void;
  disabled: boolean;
}

const RACE_SEQUENCE: Array<TransportMode | "fastest"> = ["walk", "bike", "subway", "fastest"];
const PER_MODE_MS = 2000;
const MIN_TIME = 5;
const MAX_TIME = 60;

export function ReachRaceButton({
  onViewModeChange,
  onMaxMinutesChange,
  disabled,
}: ReachRaceButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const animRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(
    0 as unknown as ReturnType<typeof setTimeout>
  );

  const stop = useCallback(() => {
    setPlaying(false);
    setActiveStep(-1);
    cancelAnimationFrame(animRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const play = useCallback(() => {
    if (disabled) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      onViewModeChange("fastest");
      onMaxMinutesChange(MAX_TIME);
      return;
    }

    cancelAnimationFrame(animRef.current);
    clearTimeout(timeoutRef.current);
    setPlaying(true);

    function runMode(idx: number) {
      if (idx >= RACE_SEQUENCE.length) {
        setPlaying(false);
        setActiveStep(-1);
        return;
      }

      const mode = RACE_SEQUENCE[idx];
      setActiveStep(idx);
      onViewModeChange(mode);
      onMaxMinutesChange(MIN_TIME);

      const start = performance.now();
      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / PER_MODE_MS, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const value = Math.round(MIN_TIME + eased * (MAX_TIME - MIN_TIME));
        onMaxMinutesChange(value);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          timeoutRef.current = setTimeout(() => runMode(idx + 1), 400);
        }
      }
      animRef.current = requestAnimationFrame(tick);
    }

    runMode(0);
  }, [disabled, onViewModeChange, onMaxMinutesChange]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const modeLabels: Record<string, string> = {
    walk: "Walk",
    bike: "Bike",
    subway: "Subway",
    fastest: "All",
  };

  return (
    <button
      onClick={playing ? stop : play}
      disabled={disabled}
      title={playing ? "Stop reach race" : "Reach race: animate walk to bike to subway"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/20 bg-white/5 text-[11px] text-white/70 cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/30 flex-shrink-0"
      aria-label={playing ? "Stop reach race animation" : "Play reach race animation"}
    >
      {playing ? (
        <>
          <span className="text-[10px]">&#9632;</span>
          <span className="text-accent font-display italic uppercase">
            {activeStep >= 0 ? modeLabels[RACE_SEQUENCE[activeStep]] : "..."}
          </span>
        </>
      ) : (
        <>
          <span className="text-[10px]">&#9654;</span>
          <span className="font-display italic uppercase">Race</span>
        </>
      )}
    </button>
  );
}
