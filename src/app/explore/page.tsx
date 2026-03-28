"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { IsochroneMap } from "@/components/isochrone/isochrone-map";
import { TimeSlider } from "@/components/isochrone/time-slider";
import { ModeLegend } from "@/components/isochrone/mode-legend";
import { PanelSection } from "@/components/ui/panel-section";
import { ReachStats } from "@/components/isochrone/reach-stats";
import { PlayButton } from "@/components/isochrone/play-button";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { computeHexGrid } from "@/lib/grid";
import { generateHexCenters } from "@/lib/hex";
import { fetchAllIsochrones } from "@/lib/mapbox-isochrone";
import type { IsochroneContour } from "@/lib/mapbox-isochrone";
import { FriendInput } from "@/components/isochrone/friend-input";
import type {
  LatLng,
  TransportMode,
  HexCell,
  StationGraph,
  StationMatrix,
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
  const [friendOrigin, setFriendOrigin] = useState<LatLng | null>(null);
  const [friendAddress, setFriendAddress] = useState("");
  const [friendContours, setFriendContours] = useState<IsochroneContour[]>([]);
  const [showFriend, setShowFriend] = useState(false);
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
    [stationGraph, stationMatrix, citiBikeData, ferryData]
  );

  const runFriendCompute = useCallback(
    async (loc: LatLng) => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      const contours = await fetchAllIsochrones(loc, ["walk", "bike", "car"], 60, token, "b");
      setFriendContours(contours);
    },
    []
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
    setShowFriend(false);
  }, []);

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

  const allContours = [...apiContours, ...friendContours];

  const mapCenter: LatLng = origin ?? { lat: 40.728, lng: -73.958 };

  return (
    <div className="flex h-full p-3">
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
          <TimeSlider value={maxMinutes} onChange={handleMaxMinutesChange} />
        </PanelSection>

        <PanelSection>
          <PlayButton
            currentValue={maxMinutes}
            onChange={handleMaxMinutesChange}
            disabled={!origin || computing || cells.length === 0}
          />
        </PanelSection>

        <PanelSection title="Transport Modes">
          <ModeLegend activeModes={activeModes} onToggle={toggleMode} />
          <p className="font-body text-xs text-red/50 mt-2">
            All modes shown. Click to toggle.
          </p>
        </PanelSection>

        {origin && !computing && cells.length > 0 && (
          <>
            <PanelSection title="Reading the Map">
              <p className="font-body text-xs text-red/70 leading-relaxed">
                Bright inner rings = reachable quickly. Faded outer rings = takes
                longer. Each color is a transport mode. Hover for details.
              </p>
            </PanelSection>

            <PanelSection title="Your Reach">
              <ReachStats cells={cells} activeModes={activeModes} maxMinutes={maxMinutes} />
            </PanelSection>

            <PanelSection>
              {!showFriend ? (
                <button
                  onClick={() => setShowFriend(true)}
                  className="w-full border-3 border-red/50 font-display italic uppercase text-sm py-2 cursor-pointer hover:border-red hover:bg-red hover:text-pink transition-colors text-red/50 hover:text-pink"
                >
                  + Add a Friend
                </button>
              ) : (
                <FriendInput
                  onSelect={handleFriendSelect}
                  onRemove={removeFriend}
                  initialValue={friendAddress}
                  hasResult={friendOrigin !== null}
                />
              )}
            </PanelSection>

            <PanelSection>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopyLabel("Copied!");
                  setTimeout(() => setCopyLabel("Copy Link"), 1500);
                }}
                className="w-full border-3 border-red font-display italic uppercase text-sm py-2 cursor-pointer hover:bg-red hover:text-pink transition-colors"
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
          cells={cells}
          apiContours={allContours}
          activeModes={activeModes}
          maxMinutes={maxMinutes}
          onMapClick={handleMapClick}
        />
      </main>
    </div>
  );
}
