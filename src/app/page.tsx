"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Sidebar } from "@/components/results/sidebar";
import { MapView } from "@/components/results/map-view";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { computeGrid, type GridResult } from "@/lib/grid";
import { computeMonthlyCost } from "@/lib/cost";
import { walkTime, bikeTime, driveTime } from "@/lib/travel-time";
import { computeSubwayTime } from "@/lib/subway";
import type { TransportMode, Destination, LatLng, StationGraph, StationMatrix, CompositeGridPoint, GridPoint } from "@/lib/types";
import { DEFAULT_BOUNDS, WEEKS_PER_MONTH } from "@/lib/constants";

export default function HomePage() {
  // Core state (replaces sessionStorage)
  const [originAddress, setOriginAddress] = useState("");
  const [originLocation, setOriginLocation] = useState<LatLng | null>(null);
  const [modes, setModes] = useState<TransportMode[]>(["subway", "bike", "bikeSubway"]);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  // Data loading
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [gridResult, setGridResult] = useState<GridResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [view, setView] = useState<"composite" | "perPin">("composite");
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);

  // Pin drop mode
  const [pinDropMode, setPinDropMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<LatLng | null>(null);

  // Load subway + citi bike data
  useEffect(() => {
    async function load() {
      const [graphRes, matrixRes] = await Promise.all([
        fetch("/data/station-graph.json"),
        fetch("/data/station-matrix.json"),
      ]);
      const graph: StationGraph = await graphRes.json();
      const matrix: StationMatrix = await matrixRes.json();
      setStationGraph(graph);
      setStationMatrix(matrix);
      setSubwayData(new SubwayData(graph, matrix));

      const citi = await CitiBikeData.fetch();
      setCitiBikeData(citi);
    }
    load();
  }, []);

  // Compute grid when state or data changes
  useEffect(() => {
    if (!originLocation || !stationGraph || !stationMatrix || !citiBikeData) return;

    setComputing(true);
    computeGrid(
      DEFAULT_BOUNDS,
      originLocation,
      destinations,
      modes,
      stationGraph,
      stationMatrix,
      citiBikeData.getAllStations()
    ).then((result) => {
      setGridResult(result);
      setComputing(false);
    }).catch((err) => {
      console.error("Grid computation failed:", err);
      setComputing(false);
    });
  }, [originLocation, destinations, modes, stationGraph, stationMatrix, citiBikeData]);

  // Handle map click for pin drop
  const handleMapClick = useCallback((location: LatLng) => {
    if (pinDropMode) {
      setPendingPin(location);
      setPinDropMode(false);
    }
  }, [pinDropMode]);

  // Handle pin drop confirmation
  const handlePinConfirm = useCallback((name: string, category: "work" | "social" | "fitness" | "errands" | "other") => {
    if (!pendingPin) return;
    const dest: Destination = {
      id: crypto.randomUUID(),
      name,
      address: `${pendingPin.lat.toFixed(4)}, ${pendingPin.lng.toFixed(4)}`,
      location: pendingPin,
      category,
      frequency: category === "work" ? 5 : category === "fitness" ? 3 : 1,
    };
    setDestinations((prev) => [...prev, dest]);
    setPendingPin(null);
  }, [pendingPin]);

  const handlePinCancel = useCallback(() => {
    setPendingPin(null);
  }, []);

  // Compute monthly stats from origin (memoized, must be before early return for hooks order)
  const { totalHours, totalCost } = useMemo(() => {
    if (!originLocation) return { totalHours: 0, totalCost: 0 };

    const destModes: { destId: string; mode: TransportMode }[] = [];
    let totalMinutes = 0;

    for (const d of destinations) {
      const times: Partial<Record<TransportMode, number>> = {};
      if (modes.includes("walk")) times.walk = walkTime(originLocation, d.location);
      if (modes.includes("car")) times.car = driveTime(originLocation, d.location);
      if (modes.includes("bike")) times.bike = bikeTime(originLocation, d.location);
      if (modes.includes("subway") && subwayData) {
        const t = computeSubwayTime(subwayData, originLocation, d.location);
        if (t !== null) times.subway = t;
      }
      if (modes.includes("bikeSubway") && subwayData) {
        const t = computeSubwayTime(subwayData, originLocation, d.location);
        if (t !== null) times.bikeSubway = t;
      }

      let bestMode: TransportMode = "walk";
      let bestTime = Infinity;
      for (const [mode, time] of Object.entries(times)) {
        if (time !== undefined && time < bestTime) { bestTime = time; bestMode = mode as TransportMode; }
      }

      destModes.push({ destId: d.id, mode: bestMode });
      if (bestTime < Infinity) {
        totalMinutes += bestTime * d.frequency * 2 * WEEKS_PER_MONTH;
      }
    }

    return {
      totalHours: totalMinutes / 60,
      totalCost: computeMonthlyCost(destinations, destModes),
    };
  }, [destinations, modes, originLocation, subwayData]);

  const displayGrid: CompositeGridPoint[] | GridPoint[] =
    view === "composite" || !selectedDestId
      ? gridResult?.compositeGrid ?? []
      : gridResult?.destGrids?.[selectedDestId] ?? [];

  // No origin yet — show landing state
  if (!originLocation) {
    return (
      <div className="flex h-full border-3 border-red">
        <Sidebar
          originAddress={originAddress}
          originLocation={null}
          modes={modes}
          destinations={destinations}
          subwayData={subwayData}
          view={view}
          selectedDestId={selectedDestId}
          totalHours={0}
          totalCost={0}
          onOriginChange={(addr, loc) => {
            setOriginAddress(addr);
            if (loc) setOriginLocation(loc);
          }}
          onModesChange={setModes}
          onDestinationsChange={setDestinations}
          onViewChange={setView}
          onSelectedDestChange={setSelectedDestId}
          pinDropMode={pinDropMode}
          onPinDropToggle={() => setPinDropMode((p) => !p)}
        />
        <main className="flex-1 relative flex items-center justify-center bg-pink">
          <div className="text-center px-8">
            <h2 className="font-display italic uppercase text-3xl mb-4">Enter Your Address</h2>
            <p className="text-red/60 text-sm">Type an address in the sidebar to see your transit heatmap</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full border-3 border-red">
      <Sidebar
        originAddress={originAddress}
        originLocation={originLocation}
        modes={modes}
        destinations={destinations}
        subwayData={subwayData}
        view={view}
        selectedDestId={selectedDestId}
        totalHours={totalHours}
        totalCost={totalCost}
        onOriginChange={(addr, loc) => {
          setOriginAddress(addr);
          if (loc) setOriginLocation(loc);
        }}
        onModesChange={setModes}
        onDestinationsChange={setDestinations}
        onViewChange={setView}
        onSelectedDestChange={setSelectedDestId}
        pinDropMode={pinDropMode}
        onPinDropToggle={() => setPinDropMode((p) => !p)}
      />

      <main className="flex-1 relative">
        {computing && (
          <div className="absolute inset-0 bg-pink/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl animate-pulse">Computing...</span>
          </div>
        )}
        <MapView
          origin={originLocation}
          destinations={destinations}
          grid={displayGrid}
          bounds={DEFAULT_BOUNDS}
          hasDestinations={destinations.length > 0}
          pinDropMode={pinDropMode}
          onMapClick={handleMapClick}
          pendingPin={pendingPin}
          onPinConfirm={handlePinConfirm}
          onPinCancel={handlePinCancel}
        />
      </main>
    </div>
  );
}
