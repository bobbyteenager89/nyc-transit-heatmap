"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PlayButtonProps {
  currentValue: number;
  onChange: (minutes: number) => void;
  disabled: boolean;
}

const MIN_TIME = 5;
const MAX_TIME = 60;
const DURATION_MS = 4000;

export function PlayButton({ currentValue, onChange, disabled }: PlayButtonProps) {
  const [playing, setPlaying] = useState(false);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  const stop = useCallback(() => {
    setPlaying(false);
    cancelAnimationFrame(animRef.current);
  }, []);

  const play = useCallback(() => {
    if (disabled) return;
    setPlaying(true);
    startTimeRef.current = performance.now();
    onChange(MIN_TIME);

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const value = Math.round(MIN_TIME + eased * (MAX_TIME - MIN_TIME));

      onChange(value);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setPlaying(false), 500);
      }
    }

    animRef.current = requestAnimationFrame(tick);
  }, [disabled, onChange]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <button
      onClick={playing ? stop : play}
      disabled={disabled}
      className="w-full border-3 border-red font-display italic uppercase text-sm py-2.5 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red hover:text-pink"
      aria-label={playing ? "Stop animation" : "Play time lapse"}
    >
      {playing ? "■ Stop" : "▶ Play Time Lapse"}
    </button>
  );
}
