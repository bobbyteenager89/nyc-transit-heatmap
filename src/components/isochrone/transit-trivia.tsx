"use client";

import { useEffect, useRef, useState } from "react";

const TRIVIA: string[] = [
  "The 7 train carries ~500k riders/day — more than many US cities' entire systems.",
  "NYC's subway never fully closes. It has run 24/7 since 1904.",
  "The A train is the longest line at 31 miles, from Inwood to Far Rockaway.",
  "Grand Central Terminal has 44 platforms — the most of any station in the world.",
  "The L train shutdown scare (2019) led to the largest protected bike lane expansion in NYC history.",
  "Citi Bike has over 1,000 stations and 35,000 bikes — the largest bike share in the US.",
  "NYC has 472 subway stations — more than any city in the Western Hemisphere.",
  "The subway moves ~3.5 million people on an average weekday.",
  "The Staten Island Ferry has been free since 1997 and carries ~70k riders/day.",
  "The G train is the only line that doesn't pass through Manhattan.",
  "Times Square–42 St is the busiest station, with ~60 million annual riders.",
  "NYC's first subway line opened October 27, 1904 — the IRT from City Hall to 145 St.",
  "Walking a NYC block takes ~1 min east–west (short) and ~3 min north–south (long).",
  "The 2nd Ave Subway took 50+ years from planning to its 2017 opening.",
];

const ROTATION_MS = 8000;

export function TransitTrivia() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(
    0 as unknown as ReturnType<typeof setTimeout>
  );

  useEffect(() => {
    // Respect prefers-reduced-motion — skip auto-rotation
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    function cycle() {
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % TRIVIA.length);
        setVisible(true);
        timerRef.current = setTimeout(cycle, ROTATION_MS);
      }, 400);
    }

    timerRef.current = setTimeout(cycle, ROTATION_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5 font-display italic">
        Transit Trivia
      </p>
      <p
        className="font-body text-[11px] text-white/60 leading-relaxed transition-opacity duration-400"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {TRIVIA[index]}
      </p>
    </div>
  );
}
