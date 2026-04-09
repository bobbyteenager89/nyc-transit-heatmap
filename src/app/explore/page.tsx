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
import { MobileBottomSheet } from "@/components/isochrone/mobile-bottom-sheet";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { loadBusData } from "@/lib/bus";
import type { BusData } from "@/lib/bus";
import { computeHexGrid } from "@/lib/grid";
import { reverseGeocode } from "@/lib/geocode";
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
import { encodeShareSlug, decodeShareSlug } from "@/lib/share-slug";
import { ShareSheet } from "@/components/share/share-sheet";
import { MeetupSummary } from "@/components/isochrone/meetup-summary";
import { TransitTrivia } from "@/components/isochrone/transit-trivia";
import { CORE_NYC_BOUNDS, H3_RESOLUTION, BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS } from "@/lib/constants";
import type { BoundingBox } from "@/lib/types";

const ALL_MODES: TransportMode[] = ["subway", "bus", "walk", "car", "bike", "ferry"];

// Default modes on page load. Walk is locked ON (can't be toggled off) — you
// have to walk to/from everything. Subway/bus/ferry/bike (Citi Bike) default
// on because they're "public transit" accessible to anyone. Car is off by
// default — a lifestyle assertion the user adds explicitly.
const DEFAULT_MODES: TransportMode[] = ["walk", "subway", "bus", "ferry", "bike"];
const LOCKED_MODES: TransportMode[] = ["walk"];

type ViewMode = "fastest" | TransportMode;
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  fastest: "Your reach",
  subway: "Subway",
  bus: "Bus",
  walk: "Walk",
  bike: "Citi Bike",
  car: "Car",
  ferry: "Ferry",
};

/**
 * Detect whether the reach envelope hit a border of the current grid and,
 * if so, return expanded bounds. Returns null if the envelope is entirely
 * inside the grid or if expansion would exceed MAX_NYC_BOUNDS.
 *
 * "Border hit" = at least one cell within ~one-hex-edge of an outer edge
 * has a fastestTime <= maxMinutes. We then grow the hit side(s) by
 * BOUNDS_EXPANSION_STEP, clamped to MAX_NYC_BOUNDS.
 */
function expandBoundsIfHit(
  bounds: BoundingBox,
  cells: HexCell[],
  maxMinutes: number
): BoundingBox | null {
  if (cells.length === 0) return null;
  const EDGE_PAD = 0.005; // ~500m — roughly one res-10 hex ring worth
  let hitN = false, hitS = false, hitE = false, hitW = false;
  for (const cell of cells) {
    if (cell.compositeScore >= 999 || cell.compositeScore > maxMinutes) continue;
    const { lat, lng } = cell.center;
    if (lat >= bounds.ne.lat - EDGE_PAD) hitN = true;
    if (lat <= bounds.sw.lat + EDGE_PAD) hitS = true;
    if (lng >= bounds.ne.lng - EDGE_PAD) hitE = true;
    if (lng <= bounds.sw.lng + EDGE_PAD) hitW = true;
    if (hitN && hitS && hitE && hitW) break;
  }
  if (!hitN && !hitS && !hitE && !hitW) return null;

  const expanded: BoundingBox = {
    sw: {
      lat: hitS ? Math.max(bounds.sw.lat - BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.sw.lat) : bounds.sw.lat,
      lng: hitW ? Math.max(bounds.sw.lng - BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.sw.lng) : bounds.sw.lng,
    },
    ne: {
      lat: hitN ? Math.min(bounds.ne.lat + BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.ne.lat) : bounds.ne.lat,
      lng: hitE ? Math.min(bounds.ne.lng + BOUNDS_EXPANSION_STEP, MAX_NYC_BOUNDS.ne.lng) : bounds.ne.lng,
    },
  };
  // If nothing actually moved (already at max), abort.
  if (
    expanded.sw.lat === bounds.sw.lat && expanded.sw.lng === bounds.sw.lng &&
    expanded.ne.lat === bounds.ne.lat && expanded.ne.lng === bounds.ne.lng
  ) {
    return null;
  }
  return expanded;
}

export default function ExplorePage() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [activeModes, setActiveModes] = useState<TransportMode[]>(DEFAULT_MODES);
  // Dynamic hex grid bounds. Starts tight, auto-expands when the reach
  // envelope hits a border — see runCompute's border-hit detection below.
  const [gridBounds, setGridBounds] = useState<BoundingBox>(CORE_NYC_BOUNDS);
  const [expanding, setExpanding] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [viewMode, setViewMode] = useState<ViewMode>("fastest");
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
  const [busData, setBusData] = useState<BusData | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [meetupCopied, setMeetupCopied] = useState(false);

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

        const bus = await loadBusData();
        setBusData(bus);

        setDataReady(true);
      } catch (err) {
        console.error("Failed to load transit data:", err);
        setDataReady(true);
      }
    }
    load();
  }, []);

  // Sync state to URL
  const updateURL = useCallback((loc: LatLng | null, mins: number, modes: TransportMode[], addr?: string) => {
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
  }, []);

  const runCompute = useCallback(
    async (loc: LatLng) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData || !busData) return;

      setComputing(true);
      setComputeProgress(0);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

        // Helper: compute hexes for a given bounds. Returned cells include
        // their center so we can detect border hits without re-walking geo.
        const computeForBounds = async (bounds: BoundingBox, onProgress?: (n: number) => void) => {
          const rawCenters = generateHexCenters(bounds, H3_RESOLUTION);
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
              busStops: busData.stops,
            },
            onProgress ?? (() => {})
          );
          const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
          return result.cells.map((cell) => {
            const geo = geoLookup.get(cell.h3Index)!;
            return { ...cell, center: geo.center, boundary: geo.boundary };
          });
        };

        // Initial compute with current bounds.
        let currentBounds = gridBounds;
        const [hexResult, contours] = await Promise.all([
          computeForBounds(currentBounds, (p) => setComputeProgress(p)),
          fetchAllIsochrones(loc, ["walk", "bike", "car"], 60, token),
        ]);
        setCells(hexResult);
        setApiContours(contours);

        // Border-hit detection + auto-expansion. If any outer-ring cell is
        // reachable within the time budget, the envelope is truncated at the
        // edge — expand the bounds and recompute. Limited to 2 extra passes
        // per origin to prevent runaway growth.
        let attempts = 0;
        let workingCells = hexResult;
        let workingBounds = currentBounds;
        while (attempts < 2) {
          const expanded = expandBoundsIfHit(workingBounds, workingCells, maxMinutes);
          if (!expanded) break;
          attempts++;
          setExpanding(true);
          try {
            workingCells = await computeForBounds(expanded, (p) => setComputeProgress(p));
            workingBounds = expanded;
            setCells(workingCells);
            setGridBounds(expanded);
          } finally {
            setExpanding(false);
          }
        }
      } catch (err) {
        console.error("Compute failed:", err);
      } finally {
        setComputing(false);
        setMobileExpanded(false);
      }
    },
    [stationGraph, stationMatrix, citiBikeData, ferryData, busData, destinations, gridBounds, maxMinutes]
  );

  const runFriendCompute = useCallback(
    async (loc: LatLng) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData || !busData) return;
      setFriendComputing(true);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

        // Run hex compute AND API isochrones for friend in parallel
        const [hexResult, contours] = await Promise.all([
          (async () => {
            const rawCenters = generateHexCenters(gridBounds, H3_RESOLUTION);
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
                busStops: busData.stops,
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
    [stationGraph, stationMatrix, citiBikeData, ferryData, busData, gridBounds]
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
      // Baseline transit (walk/subway/bus/ferry) is always in the blend; the
      // URL only needs to preserve the opt-in overlays (bike, car). Parse any
      // valid mode and union with baseline so baseline can never be dropped.
      const parsed = m.split(",").filter((mode): mode is TransportMode =>
        ALL_MODES.includes(mode as TransportMode)
      ) as TransportMode[];
      const merged = Array.from(new Set([...DEFAULT_MODES, ...parsed]));
      setActiveModes(merged);
    }
    if (lat && lng) {
      const loc = { lat: Number(lat), lng: Number(lng) };
      setOrigin(loc);
      runCompute(loc);
      // Reverse geocode to show address in input
      reverseGeocode(loc, process.env.NEXT_PUBLIC_MAPBOX_TOKEN!)
        .then((addr) => setOriginAddress(addr))
        .catch(() => setOriginAddress(`${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`));
    }

    // If a ?compare=[slug] param is present, decode it and pre-load the friend's location.
    // Entry point from the recipient page ("Drop your pin →" CTA) and the "Share meetup link" button.
    const compareSlug = params.get("compare");
    if (compareSlug) {
      const decoded = decodeShareSlug(compareSlug);
      if (decoded) {
        const friendLoc = { lat: decoded.lat, lng: decoded.lng };
        setFriendOrigin(friendLoc);
        setExploreMode("meet");
        runFriendCompute(friendLoc);
        if (decoded.address) {
          setFriendAddress(decoded.address);
        } else {
          reverseGeocode(friendLoc, process.env.NEXT_PUBLIC_MAPBOX_TOKEN!)
            .then((addr) => setFriendAddress(addr))
            .catch(() => setFriendAddress(`${decoded.lat.toFixed(4)}, ${decoded.lng.toFixed(4)}`));
        }
      }
    }
  }, [dataReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddressSelect = useCallback(
    (address: string, location: LatLng) => {
      setOriginAddress(address);
      setOrigin(location);
      runCompute(location);
      updateURL(location, maxMinutes, activeModes, address);
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

  /**
   * Build a shareable meetup URL. The friend's location is encoded as a slug
   * in ?compare= so the recipient opens /explore pre-loaded with person B's
   * isochrone and can add their own pin as person A to see the intersection.
   */
  const handleShareMeetup = useCallback(() => {
    if (!friendOrigin) return;
    const slug = encodeShareSlug({
      lat: friendOrigin.lat,
      lng: friendOrigin.lng,
      t: maxMinutes,
      m: activeModes,
      address: friendAddress || undefined,
    });
    const base = `${window.location.origin}/explore`;
    const qp = new URLSearchParams({ compare: slug });
    if (origin) {
      qp.set("lat", origin.lat.toFixed(4));
      qp.set("lng", origin.lng.toFixed(4));
    }
    if (originAddress) qp.set("address", originAddress);
    qp.set("t", String(maxMinutes));
    qp.set("m", activeModes.join(","));
    const url = `${base}?${qp.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setMeetupCopied(true);
      setTimeout(() => setMeetupCopied(false), 2500);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setMeetupCopied(true);
      setTimeout(() => setMeetupCopied(false), 2500);
    });
  }, [friendOrigin, friendAddress, origin, originAddress, maxMinutes, activeModes]);

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
    // Walk is locked — every trip involves walking at both ends, so turning
    // it off would be incoherent and leave the map empty for origins with no
    // station in range. ModeLegend also disables the Walk button.
    if (LOCKED_MODES.includes(mode)) return;
    startTransition(() => {
      setActiveModes((prev) => {
        const next = prev.includes(mode)
          ? prev.length > 1 ? prev.filter((m) => m !== mode) : prev
          : [...prev, mode];
        updateURL(origin, maxMinutes, next, originAddress || undefined);
        return next;
      });
    });
  }, [updateURL, origin, maxMinutes, originAddress]);

  const handleMaxMinutesChange = useCallback((mins: number) => {
    startTransition(() => {
      setMaxMinutes(mins);
      updateURL(origin, mins, activeModes, originAddress || undefined);
    });
  }, [updateURL, origin, activeModes, originAddress]);

  const allContours = useMemo(
    () => [...apiContours, ...friendContours],
    [apiContours, friendContours]
  );

  const mapCenter: LatLng = origin ?? { lat: 40.728, lng: -73.958 };

  const sidebarControls = (
    <>
      {/* Header + Mode Tabs */}
      <div className="px-1 pt-2 pb-1 hidden md:block">
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

      {/* MEET mode: Overlap summary + share button */}
      {exploreMode === "meet" && cells.length > 0 && friendCells.length > 0 && (
        <PanelSection title="Meetup">
          <MeetupSummary
            cellsA={cells}
            cellsB={friendCells}
            activeModes={activeModes}
            maxMinutes={maxMinutes}
            onShare={handleShareMeetup}
            copied={meetupCopied}
          />
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
        <div className="flex items-center gap-2">
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

      {/* Transit trivia */}
      <TransitTrivia />

      {/* Shared: Transport modes */}
      <PanelSection title="Transport Modes">
        <ModeLegend activeModes={activeModes} onToggle={toggleMode} />
      </PanelSection>

      {/* View as: render filter (separate from compute toggles above) */}
      {cells.length > 0 && (
        <PanelSection title="View as">
          <div className="flex flex-wrap gap-1.5">
            {(["fastest", ...activeModes] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-2.5 py-1.5 text-[11px] rounded border transition-colors ${
                  viewMode === m
                    ? "bg-accent/20 border-accent text-accent"
                    : "border-white/20 text-white/60 hover:bg-white/10"
                }`}
              >
                {VIEW_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/40 mt-2 leading-tight">
            {viewMode === "fastest"
              ? "Color = fastest of all active modes"
              : `Color = ${VIEW_MODE_LABELS[viewMode]} only — cells unreachable by ${VIEW_MODE_LABELS[viewMode]} are hidden`}
          </p>
        </PanelSection>
      )}

      {/* Results section — shown after compute */}
      {origin && !computing && cells.length > 0 && (
        <>
          <PanelSection title="Your Reach">
            <ReachStats cells={cells} activeModes={activeModes} maxMinutes={maxMinutes} />
          </PanelSection>

          <PanelSection>
            {origin && (() => {
              const slug = encodeShareSlug({
                lat: origin.lat,
                lng: origin.lng,
                t: maxMinutes,
                m: activeModes,
                address: originAddress || undefined,
              });
              const url = `/p/${slug}`;
              const label = originAddress || "this spot";
              return (
                <ShareSheet
                  url={url}
                  title={`${maxMinutes}-minute reach from ${label}`}
                  text={`See how far you can go in ${maxMinutes} minutes by ${activeModes.join(", ")} from ${label}.`}
                />
              );
            })()}
          </PanelSection>
        </>
      )}
    </>
  );

  const mobileSummary = (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-display italic text-sm text-white truncate max-w-[200px]">
          {originAddress || "Drop a pin"}
        </p>
        <p className="font-body text-xs text-white/40">
          {maxMinutes} min · {activeModes.length} mode{activeModes.length !== 1 ? "s" : ""}
        </p>
      </div>
      <span className="text-accent text-xs font-display italic uppercase">Details ↑</span>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[420px] flex-shrink-0 flex-col bg-surface overflow-y-auto gap-3 p-4">
        {sidebarControls}
      </aside>

      {/* Map */}
      <main className="flex-1 relative w-full">
        {computing && !expanding && (
          <div className="absolute inset-0 bg-surface/90 z-50 flex items-center justify-center">
            <span className="font-display italic uppercase text-2xl text-accent animate-pulse">
              Computing… {computeProgress}%
            </span>
          </div>
        )}

        {/* Expansion overlay — non-blocking pill at top-center with a subtle
            spinner. We keep the current map visible so the user sees their
            existing reach while we compute the extra area. */}
        {expanding && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-card/95 border border-accent/40 backdrop-blur-md shadow-lg">
              <span className="w-3 h-3 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
              <span className="font-display italic uppercase text-[11px] tracking-wider text-accent">
                Expanding map… {computeProgress}%
              </span>
            </div>
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
          viewMode={viewMode}
        />
      </main>

      {/* Mobile bottom sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
        <MobileBottomSheet
          expanded={mobileExpanded}
          onToggle={() => setMobileExpanded((p) => !p)}
          summary={mobileSummary}
        >
          {sidebarControls}
        </MobileBottomSheet>
      </div>
    </div>
  );
}
