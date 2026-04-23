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
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>);
  const startTimeRef = useRef(0);

  const stop = useCallback(() => {
    setPlaying(false);
    cancelAnimationFrame(animRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const play = useCallback(() => {
    if (disabled) return;
    cancelAnimationFrame(animRef.current);
    clearTimeout(timeoutRef.current);
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
        timeoutRef.current = setTimeout(() => setPlaying(false), 500);
      }
    }

    animRef.current = requestAnimationFrame(tick);
  }, [disabled, onChange]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <button
      onClick={playing ? stop : play}
      disabled={disabled}
      className="w-10 h-10 flex items-center justify-center rounded-full border border-white/20 bg-white/5 cursor-pointer transition-colors active:scale-[0.96] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/30 flex-shrink-0"
      aria-label={playing ? "Stop animation" : "Play time lapse"}
    >
      {playing ? (
        <span className="text-white text-sm">■</span>
      ) : (
        <span className="text-white text-sm ml-0.5">▶</span>
      )}
    </button>
  );
}
