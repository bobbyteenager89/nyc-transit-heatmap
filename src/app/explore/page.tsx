"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { IsochroneMap } from "@/components/isochrone/isochrone-map";
import { TimeSlider } from "@/components/isochrone/time-slider";
import { ModeLegend } from "@/components/isochrone/mode-legend";
import { PanelSection } from "@/components/ui/panel-section";
import { ReachStats } from "@/components/isochrone/reach-stats";
import { PlayButton } from "@/components/isochrone/play-button";
import { MapLegend } from "@/components/isochrone/map-legend";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import { fetchAllIsochrones } from "@/lib/mapbox-isochrone";
import type { IsochroneContour } from "@/lib/mapbox-isochrone";
import { FriendInput } from "@/components/isochrone/friend-input";
import { FairnessSlider } from "@/components/isochrone/fairness-slider";
import { DestinationInput } from "@/components/isochrone/destination-input";
import { ModeTabs } from "@/components/isochrone/mode-tabs";
import type { ExploreMode } from "@/components/isochrone/mode-tabs";
import type {
  LatLng,
  TransportMode,
  HexCell,
  StationGraph,
  StationMatrix,
  Destination,
} from "@/lib/types";
import { CORE_NYC_BOUNDS, H3_RESOLUTION } from "@/lib/constants";

const ALL_MODES: TransportMode[] = ["subway", "walk", "car", "bike", "bikeSubway", "ferry"];

export default function ExplorePage() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [activeModes, setActiveModes] = useState<TransportMode[]>(["subway", "walk", "bike", "bikeSubway", "ferry"]);
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [copyLabel, setCopyLabel] = useState("Copy Link");
  const [cells, setCells] = useState<HexCell[]>([]);
  const [apiContours, setApiContours] = useState<IsochroneContour[]>([]);
  const [computing, setComputing] = useState(false);
  const [friendComputing, setFriendComputing] = useState(false);
  const [friendOrigin, setFriendOrigin] = useState<LatLng | null>(null);
  const [friendAddress, setFriendAddress] = useState("");
  const [friendContours, setFriendContours] = useState<IsochroneContour[]>([]);
  const [showFriend, setShowFriend] = useState(false);
  const [friendCells, setFriendCells] = useState<HexCell[]>([]);
  const [fairnessRange, setFairnessRange] = useState(5);
  const [exploreMode, setExploreMode] = useState<ExploreMode>("reach");
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
  const [destinations, setDestinations] = useState<Destination[]>([]);

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

  // Sync state to URL
  const updateURL = useCallback((loc: LatLng | null, mins: number, modes: TransportMode[]) => {
    const params = new URLSearchParams();
    if (loc) {
      params.set("lat", loc.lat.toFixed(4));
      params.set("lng", loc.lng.toFixed(4));
    }
    params.set("t", String(mins));
    params.set("m", modes.join(","));
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", url);
  }, []);

  const runCompute = useCallback(
    async (loc: LatLng) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData) return;

      setComputing(true);
      setComputeProgress(0);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

        // Run hex compute (for subway/ferry/bikeSubway) and API isochrones (walk/bike/car) in parallel
        const [hexResult, contours] = await Promise.all([
          (async () => {
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
                destinations: destinations,
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
            return result.cells.map((cell) => {
              const geo = geoLookup.get(cell.h3Index)!;
              return { ...cell, center: geo.center, boundary: geo.boundary };
            });
          })(),
          // Fetch API isochrones for walk/bike/car — max 60 min to cache all bands
          fetchAllIsochrones(loc, ["walk", "bike", "car"], 60, token),
        ]);

        setCells(hexResult);
        setApiContours(contours);
      } catch (err) {
        console.error("Compute failed:", err);
      } finally {
        setComputing(false);
      }
    },
    [stationGraph, stationMatrix, citiBikeData, ferryData, destinations]
  );

  const runFriendCompute = useCallback(
    async (loc: LatLng) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData) return;
      setFriendComputing(true);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

        // Run hex compute AND API isochrones for friend in parallel
        const [hexResult, contours] = await Promise.all([
          (async () => {
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
              () => {} // no progress bar for friend compute
            );

            const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
            return result.cells.map((cell) => {
              const geo = geoLookup.get(cell.h3Index)!;
              return { ...cell, center: geo.center, boundary: geo.boundary };
            });
          })(),
          fetchAllIsochrones(loc, ["walk", "bike", "car"], 60, token, "b"),
        ]);

        setFriendCells(hexResult);
        setFriendContours(contours);
      } catch (err) {
        console.error("Friend compute failed:", err);
      } finally {
        setFriendComputing(false);
      }
    },
    [stationGraph, stationMatrix, citiBikeData, ferryData]
  );

  // Restore state from URL on mount
  useEffect(() => {
    if (!dataReady) return;
    const params = new URLSearchParams(window.location.search);
    const lat = params.get("lat");
    const lng = params.get("lng");
    const t = params.get("t");
    const m = params.get("m");

    if (t) setMaxMinutes(Number(t));
    if (m) {
      const modes = m.split(",").filter((mode): mode is TransportMode =>
        ALL_MODES.includes(mode as TransportMode)
      ) as TransportMode[];
      if (modes.length > 0) setActiveModes(modes);
    }
    if (lat && lng) {
      const loc = { lat: Number(lat), lng: Number(lng) };
      setOrigin(loc);
      runCompute(loc);
    }
  }, [dataReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddressSelect = useCallback(
    (address: string, location: LatLng) => {
      setOriginAddress(address);
      setOrigin(location);
      runCompute(location);
      updateURL(location, maxMinutes, activeModes);
    },
    [runCompute, updateURL, maxMinutes, activeModes]
  );

  const handleMapClick = useCallback(
    (location: LatLng) => {
      setOrigin(location);
      setOriginAddress("");
      runCompute(location);
      updateURL(location, maxMinutes, activeModes);
    },
    [runCompute, updateURL, maxMinutes, activeModes]
  );

  const handleFriendSelect = useCallback(
    (address: string, location: LatLng) => {
      setFriendAddress(address);
      setFriendOrigin(location);
      runFriendCompute(location);
    },
    [runFriendCompute]
  );

  const removeFriend = useCallback(() => {
    setFriendOrigin(null);
    setFriendAddress("");
    setFriendContours([]);
    setFriendCells([]);
    setShowFriend(false);
  }, []);

  const addDestination = useCallback((dest: Destination) => {
    setDestinations((prev) => [...prev, dest]);
  }, []);

  const removeDestination = useCallback((id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Re-compute when destinations change
  useEffect(() => {
    if (origin && destinations.length > 0 && !computing) {
      runCompute(origin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations]);

  const [, startTransition] = useTransition();

  const toggleMode = useCallback((mode: TransportMode) => {
    startTransition(() => {
      setActiveModes((prev) => {
        const next = prev.includes(mode)
          ? prev.length > 1 ? prev.filter((m) => m !== mode) : prev
          : [...prev, mode];
        updateURL(origin, maxMinutes, next);
        return next;
      });
    });
  }, [updateURL, origin, maxMinutes]);

  const handleMaxMinutesChange = useCallback((mins: number) => {
    startTransition(() => {
      setMaxMinutes(mins);
      updateURL(origin, mins, activeModes);
    });
  }, [updateURL, origin, activeModes]);

  const allContours = useMemo(
    () => [...apiContours, ...friendContours],
    [apiContours, friendContours]
  );

  const mapCenter: LatLng = origin ?? { lat: 40.728, lng: -73.958 };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[420px] flex-shrink-0 flex flex-col bg-surface overflow-y-auto gap-3 p-4">
        {/* Header + Mode Tabs */}
        <div className="px-1 pt-2 pb-1">
          <h1 className="text-2xl leading-none text-white">
            Isochrone<br /><span className="text-accent">NYC</span>
          </h1>
          <p className="font-body text-xs text-white/40 mt-1">NYC Transit Heatmap</p>
        </div>

        <ModeTabs active={exploreMode} onChange={setExploreMode} />

        {/* Mode description */}
        <p className="font-body text-xs text-white/30 px-1">
          {exploreMode === "reach" && "Drop a pin or enter an address to see how far you can travel."}
          {exploreMode === "live" && "Add your regular destinations to find the best neighborhood to live in."}
          {exploreMode === "meet" && "Enter two addresses to find the fairest meeting spot."}
        </p>

        {/* Shared: Address input */}
        <PanelSection title={exploreMode === "meet" ? "Your Location" : "Location"}>
          <AddressAutocomplete
            label="Address"
            placeholder="Start typing an address…"
            onSelect={handleAddressSelect}
            initialValue={originAddress}
            autoFocus
          />
          {!dataReady && (
            <p className="font-body text-xs text-white/40 animate-pulse">
              Loading transit data…
            </p>
          )}
        </PanelSection>

        {/* MEET mode: Friend input right after your location */}
        {exploreMode === "meet" && (
          <PanelSection title="Friend's Location">
            <FriendInput
              onSelect={handleFriendSelect}
              onRemove={removeFriend}
              initialValue={friendAddress}
              hasResult={friendOrigin !== null}
            />
            {friendComputing && (
              <p className="font-body text-xs text-accent animate-pulse mt-1">Computing friend&apos;s reach…</p>
            )}
            {friendCells.length > 0 && (
              <div className="mt-2">
                <FairnessSlider value={fairnessRange} onChange={setFairnessRange} />
              </div>
            )}
          </PanelSection>
        )}

        {/* LIVE mode: Destinations */}
        {exploreMode === "live" && origin && !computing && cells.length > 0 && (
          <PanelSection title="Your Destinations">
            <DestinationInput
              destinations={destinations}
              onAdd={addDestination}
              onRemove={removeDestination}
            />
          </PanelSection>
        )}

        {/* Shared: Time slider + play */}
        <PanelSection>
          <div className="flex items-center gap-3">
            <PlayButton
              currentValue={maxMinutes}
              onChange={handleMaxMinutesChange}
              disabled={!origin || computing || cells.length === 0}
            />
            <div className="flex-1">
              <TimeSlider value={maxMinutes} onChange={handleMaxMinutesChange} />
            </div>
          </div>
        </PanelSection>

        {/* Shared: Transport modes */}
        <PanelSection title="Transport Modes">
          <ModeLegend activeModes={activeModes} onToggle={toggleMode} />
        </PanelSection>

        {/* Results section — shown after compute */}
        {origin && !computing && cells.length > 0 && (
          <>
            <PanelSection title="Your Reach">
              <ReachStats cells={cells} activeModes={activeModes} maxMinutes={maxMinutes} />
            </PanelSection>

            <PanelSection>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopyLabel("Copied!");
                  setTimeout(() => setCopyLabel("Copy Link"), 1500);
                }}
                className="w-full border border-white/20 rounded-lg font-display italic uppercase text-xs py-2 cursor-pointer hover:bg-white/10 transition-colors text-white/40"
              >
                {copyLabel}
              </button>
            </PanelSection>
          </>
        )}
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        {computing && (
          <div className="absolute inset-0 bg-surface/90 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl text-accent animate-pulse">
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

        {cells.length > 0 && <MapLegend />}

        <IsochroneMap
          center={mapCenter}
          cells={cells}
          friendCells={friendCells}
          fairnessRange={fairnessRange}
          apiContours={allContours}
          activeModes={activeModes}
          maxMinutes={maxMinutes}
          onMapClick={handleMapClick}
          friendOrigin={friendOrigin}
        />
      </main>
    </div>
  );
}
