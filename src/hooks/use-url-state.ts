"use client";

import { useCallback } from "react";
import type { LatLng, TransportMode } from "@/lib/types";

/**
 * URL param writer for /explore. The read side runs once on mount in
 * the page component (needs to fire exactly when `dataReady` flips), so
 * keeping it separate from this writer avoids accidental double-loads.
 */
export function useUrlState() {
  const updateURL = useCallback(
    (loc: LatLng | null, mins: number, modes: TransportMode[], addr?: string) => {
      const params = new URLSearchParams();
      if (loc) {
        params.set("lat", loc.lat.toFixed(4));
        params.set("lng", loc.lng.toFixed(4));
      }
      params.set("t", String(mins));
      params.set("m", modes.join(","));
      if (addr) params.set("address", addr);
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", url);
    },
    []
  );

  return { updateURL };
}
