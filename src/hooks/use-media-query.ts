"use client";

import { useEffect, useState } from "react";

/**
 * Returns true if the given CSS media query matches.
 * SSR-safe: returns defaultValue until the client hydrates.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue); // SSR-safe: always starts with defaultValue

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches); // syncs to real value after hydration + on query change
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
