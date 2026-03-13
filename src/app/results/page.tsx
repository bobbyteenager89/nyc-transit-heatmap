"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/results/sidebar";
import { MapView } from "@/components/results/map-view";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { computeGrid, type GridResult } from "@/lib/grid";
import { computeMonthlyCost } from "@/lib/cost";
import { walkTime, bikeTime, driveTime } from "@/lib/travel-time";
import { computeSubwayTime } from "@/lib/subway";
import type { SetupState, TransportMode, Destination, LatLng, StationGraph, StationMatrix, CompositeGridPoint, GridPoint } from "@/lib/types";
import { WEEKS_PER_MONTH } from "@/lib/constants";

export default function ResultsPage() {
  const router = useRouter();
  const [state, setState] = useState<SetupState | null>(null);
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [gridResult, setGridResult] = useState<GridResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [view, setView] = useState<"composite" | "perPin">("composite");
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);

  // Load setup state from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("heatmap-setup");
    if (!raw) { router.push("/"); return; }
    const parsed: SetupState = JSON.parse(raw);
    setState(parsed);
    if (parsed.destinations.length > 0) {
      setSelectedDestId(parsed.destinations[0].id);
    }
  }, [router]);

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
    if (!state?.origin || !stationGraph || !stationMatrix || !citiBikeData) return;
    if (state.destinations.length === 0) return;

    setComputing(true);
    computeGrid(
      state.bounds,
      state.destinations,
      state.modes,
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
  }, [state?.origin, state?.bounds, state?.destinations, state?.modes, stationGraph, stationMatrix, citiBikeData]);

  if (!state?.origin) {
    return <div className="flex h-full items-center justify-center border-3 border-red">
      <span className="font-display italic uppercase text-2xl animate-pulse">Loading...</span>
    </div>;
  }

  // Compute monthly stats
  const destModes: { destId: string; mode: TransportMode }[] = [];
  let totalMinutes = 0;

  for (const d of state.destinations) {
    const times: Partial<Record<TransportMode, number>> = {};
    if (state.modes.includes("walk")) times.walk = walkTime(state.origin, d.location);
    if (state.modes.includes("car")) times.car = driveTime(state.origin, d.location);
    if (state.modes.includes("bike")) times.bike = bikeTime(state.origin, d.location);
    if (state.modes.includes("subway") && subwayData) {
      const t = computeSubwayTime(subwayData, state.origin, d.location);
      if (t !== null) times.subway = t;
    }

    let bestMode: TransportMode = "walk";
    let bestTime = Infinity;
    for (const [mode, time] of Object.entries(times)) {
      if (time !== undefined && time < bestTime) { bestTime = time; bestMode = mode as TransportMode; }
    }

    destModes.push({ destId: d.id, mode: bestMode });
    totalMinutes += bestTime * d.frequency * 2 * WEEKS_PER_MONTH;
  }

  const totalCost = computeMonthlyCost(state.destinations, destModes);
  const totalHours = totalMinutes / 60;

  const displayGrid: CompositeGridPoint[] | GridPoint[] =
    view === "composite" || !selectedDestId
      ? gridResult?.compositeGrid ?? []
      : gridResult?.destGrids?.[selectedDestId] ?? [];

  return (
    <div className="flex h-full border-3 border-red">
      <Sidebar
        state={state}
        subwayData={subwayData}
        view={view}
        selectedDestId={selectedDestId}
        totalHours={totalHours}
        totalCost={totalCost}
        onOriginChange={(addr, loc) => {
          setState((s) => s ? { ...s, originAddress: addr, origin: loc ?? s.origin } : s);
        }}
        onModesChange={(modes) => setState((s) => s ? { ...s, modes } : s)}
        onDestinationsChange={(dests) => setState((s) => s ? { ...s, destinations: dests } : s)}
        onViewChange={setView}
        onSelectedDestChange={setSelectedDestId}
      />

      <main className="flex-1 relative">
        {computing && (
          <div className="absolute inset-0 bg-pink/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl animate-pulse">Computing...</span>
          </div>
        )}
        <MapView
          origin={state.origin}
          destinations={state.destinations}
          grid={displayGrid}
          bounds={state.bounds}
        />
      </main>
    </div>
  );
}
