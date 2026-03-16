"use client";

import { useCallback, useEffect, useState } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { ModeToggles } from "@/components/setup/mode-toggles";
import { HexMap } from "@/components/results/hex-map";
import { PanelSection } from "@/components/ui/panel-section";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import type {
  LatLng,
  TransportMode,
  HexCell,
  StationGraph,
  StationMatrix,
} from "@/lib/types";
import { CORE_NYC_BOUNDS, H3_RESOLUTION } from "@/lib/constants";

export default function ExplorePage() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [modes, setModes] = useState<TransportMode[]>(["subway", "walk"]);
  const [cells, setCells] = useState<HexCell[]>([]);
  const [computing, setComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [ferryData, setFerryData] = useState<{ data: FerryData; adjacency: FerryAdjacency } | null>(null);
  const [dataReady, setDataReady] = useState(false);

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
        setSubwayData(new SubwayData(graph, matrix));

        try {
          const citi = await CitiBikeData.fetch();
          setCitiBikeData(citi);
        } catch (err) {
          console.warn("Citi Bike data unavailable, continuing without it:", err);
        }

        const ferry = await loadFerryData();
        setFerryData(ferry);

        setDataReady(true);
      } catch (err) {
        console.error("Failed to load transit data:", err);
        setDataReady(true);
      }
    }
    load();
  }, []);

  const runCompute = useCallback(
    async (loc: LatLng, selectedModes: TransportMode[]) => {
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
          origin: loc,
          destinations: [],
          modes: selectedModes,
          stationGraph,
          stationMatrix,
          citiBikeStations: citiBikeData.getAllStations(),
          ferryTerminals: ferryData.data.terminals,
          ferryAdjacency: ferryData.adjacency,
        }, (percent) => setComputeProgress(percent));

        // Worker returns cells without geometry — merge center + boundary from rawCenters
        const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
        setCells(result.cells.map((cell) => {
          const geo = geoLookup.get(cell.h3Index)!;
          return { ...cell, center: geo.center, boundary: geo.boundary };
        }));
      } catch (err) {
        console.error("Explore compute failed:", err);
      } finally {
        setComputing(false);
      }
    },
    [stationGraph, stationMatrix, citiBikeData, ferryData]
  );

  const handleAddressSelect = useCallback(
    (address: string, location: LatLng) => {
      setOriginAddress(address);
      setOrigin(location);
      runCompute(location, modes);
    },
    [modes, runCompute]
  );

  const handleModesChange = useCallback(
    (newModes: TransportMode[]) => {
      setModes(newModes);
      if (origin) runCompute(origin, newModes);
    },
    [origin, runCompute]
  );

  const mapCenter: LatLng = origin ?? { lat: 40.728, lng: -73.958 };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
        <PanelSection className="pb-8">
          <h1 className="text-3xl leading-none">
            Explore<br />the Map
          </h1>
          <p className="font-body text-sm text-red/70 leading-relaxed">
            Enter any address to see how long it takes to get anywhere in NYC.
          </p>
        </PanelSection>

        <PanelSection title="Your Location">
          <AddressAutocomplete
            label="Address"
            placeholder="Start typing an address…"
            onSelect={handleAddressSelect}
            initialValue={originAddress}
            autoFocus
          />
          {!dataReady && (
            <p className="font-body text-xs text-red/60 animate-pulse">
              Loading transit data…
            </p>
          )}
        </PanelSection>

        <PanelSection title="Transport Mode">
          <ModeToggles selected={modes} onChange={handleModesChange} />
        </PanelSection>

        {!origin && dataReady && (
          <PanelSection>
            <p className="font-body text-sm text-red/70">
              Enter an address above to generate your accessibility heatmap.
            </p>
          </PanelSection>
        )}

        {origin && !computing && cells.length > 0 && (
          <PanelSection title="Reading the Map">
            <p className="font-body text-xs text-red/70 leading-relaxed">
              Green = fast (&lt;5 min). Yellow = moderate (~17 min). Red = slow (40+ min). Hover any hex for exact times.
            </p>
          </PanelSection>
        )}
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        {computing && (
          <div className="absolute inset-0 bg-pink/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl animate-pulse">
              Computing… {computeProgress}%
            </span>
          </div>
        )}

        {!origin && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <p className="font-display italic uppercase text-3xl text-red/30">
                Enter an address
              </p>
              <p className="font-body text-sm text-red/20 mt-2">
                to see your accessibility heatmap
              </p>
            </div>
          </div>
        )}

        <HexMap
          center={mapCenter}
          cells={cells}
          destinations={[]}
          hasDestinations={false}
        />
      </main>
    </div>
  );
}
