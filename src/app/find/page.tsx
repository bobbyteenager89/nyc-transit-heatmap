"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { HexMap } from "@/components/results/hex-map";
import { ResultsSidebar } from "@/components/results/results-sidebar";
import { MobileBottomSheet } from "@/components/isochrone/mobile-bottom-sheet";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import { reverseGeocode } from "@/lib/geocode";
import { encodeShareableState, decodeShareableState } from "@/lib/url-state";
import { CORE_NYC_BOUNDS, H3_RESOLUTION } from "@/lib/constants";
import type {
  Destination,
  TransportMode,
  HexCell,
  StationGraph,
  StationMatrix,
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

  // Transit data
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [ferryData, setFerryData] = useState<{ data: FerryData; adjacency: FerryAdjacency } | null>(null);
  const [dataReady, setDataReady] = useState(false);

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

  // Load subway + Citi Bike data on mount
  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
        ]);
        const graph: StationGraph = await graphRes.json();
        const matrix: StationMatrix = await matrixRes.json();
        setStationGraph(graph);
        setStationMatrix(matrix);

        const citi = await CitiBikeData.fetch();
        setCitiBikeData(citi);

        const ferry = await loadFerryData();
        setFerryData(ferry);

        setDataReady(true);
      } catch (err) {
        console.error("Failed to load transit data:", err);
      }
    }
    load();
  }, []);

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
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData) return;

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
    [stationGraph, stationMatrix, citiBikeData, ferryData]
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

  // Visible cells depend on view mode
  const showPerPin = selectedDestId !== null;
  const visibleCells = (() => {
    if (showPerPin) {
      // Show per-pin view: raw travel time in minutes (like accessibility heatmap)
      return cells.map((cell) => {
        const destTime = cell.destBreakdown[selectedDestId] ?? null;
        return {
          ...cell,
          compositeScore: destTime ?? 999,
        };
      });
    }
    return cells;
  })();

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
    <div className="flex flex-col md:flex-row h-full p-0 md:p-3">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      <main className="flex-1 relative w-full">
        {computing && (
          <div className="absolute inset-0 bg-pink/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl animate-pulse">
              Computing… {computeProgress}%
            </span>
          </div>
        )}

        {!dataReady && !computing && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="font-display italic uppercase text-xl text-red/40 animate-pulse">
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

      {/* Mobile bottom sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
        <MobileBottomSheet
          expanded={mobileExpanded}
          onToggle={() => setMobileExpanded((p) => !p)}
          summary={mobileFindSummary}
        >
          {sidebarContent}
        </MobileBottomSheet>
      </div>
    </div>
  );
}
