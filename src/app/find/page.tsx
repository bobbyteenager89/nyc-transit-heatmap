"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { HexMap } from "@/components/results/hex-map";
import { ResultsSidebar } from "@/components/results/results-sidebar";
import { MobileBottomSheet } from "@/components/isochrone/mobile-bottom-sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTransitData } from "@/hooks/use-transit-data";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import { reverseGeocode } from "@/lib/geocode";
import { encodeShareableState, decodeShareableState } from "@/lib/url-state";
import { CORE_NYC_BOUNDS, H3_RESOLUTION } from "@/lib/constants";
import type {
  Destination,
  TransportMode,
  HexCell,
  LatLng,
} from "@/lib/types";

type Phase = "wizard" | "results";

const DEFAULT_CENTER: LatLng = { lat: 40.728, lng: -73.958 };

export default function FindPage() {
  const [phase, setPhase] = useState<Phase>("wizard");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [modes, setModes] = useState<TransportMode[]>(["subway", "walk"]);
  const [cells, setCells] = useState<HexCell[]>([]);
  const [computing, setComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);

  // Transit data (shared hook — same data as explore page)
  const { stationGraph, stationMatrix, citiBikeData, ferryData, busData, dataReady } = useTransitData();

  // Results UI state
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [bestCell, setBestCell] = useState<HexCell | null>(null);
  const [bestAddress, setBestAddress] = useState<string | null>(null);

  // Pin drop mode (for adding destinations on map)
  const [pinDropMode, setPinDropMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<LatLng | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Reverse geocode cache for best cell
  const geocodeCacheRef = useRef<Map<string, string>>(new Map());

  // Viewport detection: render ResultsSidebar in exactly ONE location to
  // eliminate the double-mount that occurred when sidebarContent was placed in
  // both the desktop div and MobileBottomSheet simultaneously.
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Check for shared state in URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search.slice(1);
    if (!search) return;

    const decoded = decodeShareableState(search);
    if (decoded && decoded.destinations.length > 0) {
      setDestinations(decoded.destinations);
      setModes(decoded.modes);
      setPhase("results");
    }
  }, []);

  const runCompute = useCallback(
    async (dests: Destination[], selectedModes: TransportMode[]) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData || !busData) return;

      setComputing(true);
      setComputeProgress(0);
      try {
        const rawCenters = generateHexCenters(CORE_NYC_BOUNDS, H3_RESOLUTION);
        const hexCenters = rawCenters.map((c) => ({
          h3Index: c.h3Index,
          lat: c.center.lat,
          lng: c.center.lng,
        }));
        const result = await computeHexGrid({
          hexCenters,
          origin: null, // wizard mode — no single origin
          destinations: dests,
          modes: selectedModes,
          stationGraph,
          stationMatrix,
          citiBikeStations: citiBikeData.getAllStations(),
          ferryTerminals: ferryData.data.terminals,
          ferryAdjacency: ferryData.adjacency,
          busStops: busData.stops,
        }, (percent) => setComputeProgress(percent));

        // Worker returns cells without geometry — merge center + boundary from rawCenters
        const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
        const fullCells: HexCell[] = result.cells.map((cell) => {
          const geo = geoLookup.get(cell.h3Index)!;
          return { ...cell, center: geo.center, boundary: geo.boundary };
        });
        setCells(fullCells);

        // Find the best cell (lowest composite score among cells that have scores)
        const scoredCells = fullCells.filter((c) => c.compositeScore > 0);
        if (scoredCells.length > 0) {
          const best = scoredCells.reduce((a, b) =>
            a.compositeScore < b.compositeScore ? a : b
          );
          setBestCell(best);

          // Reverse geocode best cell center
          const cacheKey = `${best.center.lat.toFixed(3)},${best.center.lng.toFixed(3)}`;
          const cached = geocodeCacheRef.current.get(cacheKey);
          if (cached) {
            setBestAddress(cached);
          } else {
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
            const addr = await reverseGeocode(best.center, token);
            geocodeCacheRef.current.set(cacheKey, addr);
            setBestAddress(addr);
          }
        } else {
          setBestCell(null);
          setBestAddress(null);
        }
      } catch (err) {
        console.error("Find compute failed:", err);
      } finally {
        setComputing(false);
      }
    },
    [stationGraph, stationMatrix, citiBikeData, ferryData, busData]
  );

  const handleWizardComplete = useCallback(
    (completedDestinations: Destination[]) => {
      setDestinations(completedDestinations);
      setPhase("results");
      // Update URL with shareable state
      if (typeof window !== "undefined") {
        const qs = encodeShareableState(completedDestinations, modes);
        const url = `${window.location.pathname}?${qs}`;
        window.history.replaceState(null, "", url);
      }
      // Trigger grid computation (will run once data is ready)
      if (dataReady) {
        runCompute(completedDestinations, modes);
      }
    },
    [modes, dataReady, runCompute]
  );

  // Auto-compute when data becomes ready and we're in results phase
  useEffect(() => {
    if (dataReady && phase === "results" && destinations.length > 0 && cells.length === 0) {
      runCompute(destinations, modes);
    }
  }, [dataReady, phase, destinations, modes, cells.length, runCompute]);

  // Re-compute when modes change in results phase
  const handleModesChange = useCallback(
    (newModes: TransportMode[]) => {
      setModes(newModes);
      if (phase === "results" && destinations.length > 0) {
        // Update share URL
        if (typeof window !== "undefined") {
          const qs = encodeShareableState(destinations, newModes);
          window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
        }
        runCompute(destinations, newModes);
      }
    },
    [phase, destinations, runCompute]
  );

  const handleEditDestinations = useCallback(() => {
    setPhase("wizard");
    setCells([]);
    setBestCell(null);
    setBestAddress(null);
  }, []);

  // Pin drop handlers
  const handleMapClick = useCallback(
    (location: LatLng) => {
      if (pinDropMode) {
        setPendingPin(location);
        setPinDropMode(false);
      }
    },
    [pinDropMode]
  );

  const handlePinConfirm = useCallback(
    (name: string, category: import("@/lib/types").DestinationCategory) => {
      if (!pendingPin) return;
      const newDest: Destination = {
        id: crypto.randomUUID(),
        name,
        address: `${pendingPin.lat.toFixed(4)}, ${pendingPin.lng.toFixed(4)}`,
        location: pendingPin,
        category,
        frequency: 1,
      };
      const updated = [...destinations, newDest];
      setDestinations(updated);
      setPendingPin(null);
      // Re-compute with new destination
      runCompute(updated, modes);
      // Update URL
      if (typeof window !== "undefined") {
        const qs = encodeShareableState(updated, modes);
        window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
      }
    },
    [pendingPin, destinations, modes, runCompute]
  );

  const handlePinCancel = useCallback(() => {
    setPendingPin(null);
    setPinDropMode(false);
  }, []);

  // Compute summary metrics from best cell
  const totalHours = bestCell ? bestCell.compositeScore / 60 : 0;

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://nyc-transit-heatmap.vercel.app/find?${encodeShareableState(destinations, modes)}`;

  // Visible cells depend on view mode — memoized to avoid 150k-cell spread per render
  const visibleCells = useMemo(() => {
    if (selectedDestId === null) return cells;
    return cells.map((cell) => {
      const destTime = cell.destBreakdown[selectedDestId] ?? null;
      return {
        ...cell,
        compositeScore: destTime ?? 999,
      };
    });
  }, [cells, selectedDestId]);
  const showPerPin = selectedDestId !== null;

  if (phase === "wizard") {
    return (
      <div className="flex flex-col h-full p-1.5 md:p-3">
        <WizardShell onComplete={handleWizardComplete} />
      </div>
    );
  }

  // Results phase
  const mapCenter = bestCell?.center ?? DEFAULT_CENTER;

  const mobileFindSummary = (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-display italic text-sm text-white truncate max-w-[200px]">
          {bestAddress || "Computing…"}
        </p>
        <p className="font-body text-xs text-white/40">
          {destinations.length} destination{destinations.length !== 1 ? "s" : ""} · {modes.length} mode{modes.length !== 1 ? "s" : ""}
        </p>
      </div>
      <span className="text-accent text-xs font-display italic uppercase">Details ↑</span>
    </div>
  );

  const sidebarContent = (
    <ResultsSidebar
      destinations={destinations}
      modes={modes}
      onModesChange={handleModesChange}
      onEditDestinations={handleEditDestinations}
      onDropPin={() => setPinDropMode((p) => !p)}
      pinDropMode={pinDropMode}
      selectedDestId={selectedDestId}
      onSelectDest={setSelectedDestId}
      bestCell={bestCell}
      bestAddress={bestAddress}
      totalHours={totalHours}
      shareUrl={shareUrl}
    />
  );

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Desktop sidebar — only mounted on >=md. Eliminates double-mount. */}
      {isDesktop && (
        <div>
          {sidebarContent}
        </div>
      )}

      <main className="flex-1 relative w-full">
        {computing && (
          <div className="absolute inset-0 bg-surface/90 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl text-accent animate-pulse">
              Computing… {computeProgress}%
            </span>
          </div>
        )}

        {!dataReady && !computing && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="font-display italic uppercase text-xl text-white/30 animate-pulse">
              Loading transit data…
            </span>
          </div>
        )}

        <HexMap
          center={mapCenter}
          cells={visibleCells}
          destinations={destinations}
          hasDestinations={destinations.length > 0 && !showPerPin}
          pinDropMode={pinDropMode}
          onMapClick={handleMapClick}
          pendingPin={pendingPin}
          onPinConfirm={handlePinConfirm}
          onPinCancel={handlePinCancel}
        />
      </main>

      {/* Mobile bottom sheet — only mounted on <md viewports */}
      {!isDesktop && (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <MobileBottomSheet
            expanded={mobileExpanded}
            onToggle={() => setMobileExpanded((p) => !p)}
            summary={mobileFindSummary}
          >
            {sidebarContent}
          </MobileBottomSheet>
        </div>
      )}
    </div>
  );
}
