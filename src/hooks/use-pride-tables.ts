import { useEffect, useState } from "react";
import { loadPrideTables } from "@/lib/pride-data";
import type { PrideTables } from "@/lib/pride-stats";

/**
 * Loads the pride-stat tables once, deferred to idle so the ~200KB fetch+parse
 * stays off the INP-critical mount path. Returns null until ready.
 */
export function usePrideTables(): PrideTables | null {
  const [tables, setTables] = useState<PrideTables | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      loadPrideTables()
        .then((t) => {
          if (!cancelled) setTables(t);
        })
        .catch(() => {
          // Pride stats are non-critical chrome — fail silently.
        });
    };

    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void })
      .cancelIdleCallback;

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (ric) idleId = ric(run);
    else timeoutId = setTimeout(run, 1500);

    return () => {
      cancelled = true;
      if (idleId !== undefined && cic) cic(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  return tables;
}
