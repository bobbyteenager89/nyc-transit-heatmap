"use client";

import { useEffect } from "react";

export function VitalsLogger() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;
    import("web-vitals").then(({ onINP, onLCP, onCLS }) => {
      if (cancelled) return;
      const log = (name: string) => (metric: { value: number; rating: string; id: string }) => {
        const tag = metric.rating === "good" ? "✅" : metric.rating === "needs-improvement" ? "⚠️" : "🔴";
        console.log(`${tag} [${name}] ${metric.value.toFixed(0)}ms — ${metric.rating}`, metric.id);
      };
      onINP(log("INP"));
      onLCP(log("LCP"));
      onCLS(log("CLS"));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
