"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { IsochroneMap } from "@/components/isochrone/isochrone-map";
import { TimeSlider } from "@/components/isochrone/time-slider";
import { ModeLegend } from "@/components/isochrone/mode-legend";
import { PanelSection } from "@/components/ui/panel-section";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import { generateIsochroneLayers } from "@/lib/isochrone";
import type {
  LatLng,
  TransportMode,
  HexCell,
  IsochroneLayer,
  StationGraph,
  StationMatrix,
} from "@/lib/types";
import { CORE_NYC_BOUNDS, H3_RESOLUTION } from "@/lib/constants";

const ALL_MODES: TransportMode[] = ["subway", "walk", "car", "bike", "bikeSubway", "ferry"];

export default function ExplorePage() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [activeModes, setActiveModes] = useState<TransportMode[]>(ALL_MODES);
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [cells, setCells] = useState<HexCell[]>([]);
  const [computing, setComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [ferryData, setFerryData] = useState<{
    data: FerryData;
    adjacency: FerryAdjacency;
  } | null>(null);
  const [dataReady, setDataReady] = useState(false);

  // Load transit data on mount
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
          console.warn("Citi Bike data unavailable:", err);
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
    async (loc: LatLng) => {
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

        const result = await computeHexGrid(
          {
            hexCenters,
            origin: loc,
            destinations: [],
            modes: ALL_MODES,
            stationGraph,
            stationMatrix,
            citiBikeStations: citiBikeData.getAllStations(),
            ferryTerminals: ferryData.data.terminals,
            ferryAdjacency: ferryData.adjacency,
          },
          (percent) => setComputeProgress(percent)
        );

        const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
        const fullCells = result.cells.map((cell) => {
          const geo = geoLookup.get(cell.h3Index)!;
          return { ...cell, center: geo.center, boundary: geo.boundary };
        });

        setCells(fullCells);
      } catch (err) {
        console.error("Compute failed:", err);
      } finally {
        setComputing(false);
      }
    },
    [stationGraph, stationMatrix, citiBikeData, ferryData]
  );

  // Generate isochrone layers (memoized — only recomputes when cells change)
  const isochroneLayers: IsochroneLayer[] = useMemo(() => {
    if (cells.length === 0) return [];
    return generateIsochroneLayers(cells, ALL_MODES, 60);
  }, [cells]);

  const handleAddressSelect = useCallback(
    (address: string, location: LatLng) => {
      setOriginAddress(address);
      setOrigin(location);
      runCompute(location);
    },
    [runCompute]
  );

  const handleMapClick = useCallback(
    (location: LatLng) => {
      setOrigin(location);
      setOriginAddress("");
      runCompute(location);
    },
    [runCompute]
  );

  const toggleMode = useCallback((mode: TransportMode) => {
    setActiveModes((prev) => {
      if (prev.includes(mode)) {
        return prev.length > 1 ? prev.filter((m) => m !== mode) : prev;
      }
      return [...prev, mode];
    });
  }, []);

  const mapCenter: LatLng = origin ?? { lat: 40.728, lng: -73.958 };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col border-r-3 border-red bg-pink overflow-y-auto">
        <PanelSection className="pb-6">
          <h1 className="text-3xl leading-none">
            Isochrone<br />Explorer
          </h1>
          <p className="font-body text-sm text-red/70 leading-relaxed">
            How far can you go? Enter an address or click anywhere on the map.
          </p>
        </PanelSection>

        <PanelSection title="Location">
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

        <PanelSection title="Travel Time">
          <TimeSlider value={maxMinutes} onChange={setMaxMinutes} />
        </PanelSection>

        <PanelSection title="Transport Modes">
          <ModeLegend activeModes={activeModes} onToggle={toggleMode} />
          <p className="font-body text-xs text-red/50 mt-2">
            All modes shown. Click to toggle.
          </p>
        </PanelSection>

        {origin && !computing && cells.length > 0 && (
          <PanelSection title="Reading the Map">
            <p className="font-body text-xs text-red/70 leading-relaxed">
              Bright inner rings = reachable quickly. Faded outer rings = takes
              longer. Each color is a transport mode. Hover for details.
            </p>
          </PanelSection>
        )}
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        {computing && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl text-pink animate-pulse">
              Computing… {computeProgress}%
            </span>
          </div>
        )}

        {!origin && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <p className="font-display italic uppercase text-3xl text-white/20">
                Enter an address
              </p>
              <p className="font-body text-sm text-white/10 mt-2">
                or click the map to drop a pin
              </p>
            </div>
          </div>
        )}

        <IsochroneMap
          center={mapCenter}
          layers={isochroneLayers}
          activeModes={activeModes}
          maxMinutes={maxMinutes}
          onMapClick={handleMapClick}
        />
      </main>
    </div>
  );
}
