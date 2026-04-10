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
import type { LatLng, TransportMode, HexCell, Destination } from "@/lib/types";
import { encodeShareSlug, decodeShareSlug } from "@/lib/share-slug";
import { ShareSheet } from "@/components/share/share-sheet";
import { MeetupSummary } from "@/components/isochrone/meetup-summary";
import { TransitTrivia } from "@/components/isochrone/transit-trivia";
import { H3_RESOLUTION } from "@/lib/constants";
import { useTransitData } from "@/hooks/use-transit-data";
import { useUrlState } from "@/hooks/use-url-state";
import { useDynamicGridCompute } from "@/hooks/use-dynamic-grid-compute";
import { useOwnBikePreference } from "@/hooks/use-own-bike-preference";

const ALL_MODES: TransportMode[] = ["subway", "bus", "walk", "car", "bike", "ownbike", "ferry"];

// Default modes on page load. Walk is locked ON (can't be toggled off) — you
// have to walk to/from everything. Subway/bus/ferry/bike (Citi Bike) default
// on because they're "public transit" accessible to anyone. Car is off by
// default — a lifestyle assertion the user adds explicitly.
const DEFAULT_MODES: TransportMode[] = ["walk", "subway", "bus", "ferry", "bike"];
const LOCKED_MODES: TransportMode[] = ["walk"];

// expandBoundsIfHit now lives in useDynamicGridCompute.

type ViewMode = "fastest" | TransportMode;
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  fastest: "Your reach",
  subway: "Subway",
  bus: "Bus",
  walk: "Walk",
  bike: "Citi Bike",
  ownbike: "Own Bike",
  car: "Car",
  ferry: "Ferry",
};

export default function ExplorePage() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [activeModes, setActiveModes] = useState<TransportMode[]>(DEFAULT_MODES);
  // Advanced settings — hidden behind a disclosure. Currently gates `ownbike`
  // mode. Also auto-enables whenever the URL already includes an advanced mode.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [viewMode, setViewMode] = useState<ViewMode>("fastest");
  const [friendComputing, setFriendComputing] = useState(false);
  const [friendOrigin, setFriendOrigin] = useState<LatLng | null>(null);
  const [friendAddress, setFriendAddress] = useState("");
  const [friendContours, setFriendContours] = useState<IsochroneContour[]>([]);
  const [showFriend, setShowFriend] = useState(false);
  const [friendCells, setFriendCells] = useState<HexCell[]>([]);
  const [fairnessRange, setFairnessRange] = useState(5);
  const [exploreMode, setExploreMode] = useState<ExploreMode>("reach");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [meetupCopied, setMeetupCopied] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Own-bike preference — persisted in localStorage
  const [ownBikePref, setOwnBikePref] = useOwnBikePreference();

  // All transit datasets (subway, citibike, ferry, bus)
  const {
    stationGraph,
    stationMatrix,
    citiBikeData,
    ferryData,
    busData,
    dataReady,
  } = useTransitData();

  // URL param writer
  const { updateURL } = useUrlState();

  // Primary origin compute pipeline (hexes + API contours + border expansion)
  const {
    cells,
    apiContours,
    gridBounds,
    computing,
    expanding,
    computeProgress,
    runCompute: runComputeRaw,
  } = useDynamicGridCompute({
    stationGraph,
    stationMatrix,
    citiBikeData,
    ferryData,
    busData,
    destinations,
    maxMinutes,
  });

  // Wrap runCompute to collapse the mobile sheet once the compute finishes.
  const runCompute = useCallback(
    async (loc: LatLng) => {
      await runComputeRaw(loc);
      setMobileExpanded(false);
    },
    [runComputeRaw]
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
      // Apply own-bike preference if persisted and not already in URL
      if (ownBikePref && !merged.includes("ownbike")) {
        merged.push("ownbike");
      }
      setActiveModes(merged);
      // Auto-reveal advanced panel if the URL already carries an advanced mode
      // or if the own-bike preference is set.
      if (parsed.includes("ownbike") || ownBikePref) setShowAdvanced(true);
    } else if (ownBikePref) {
      // No URL modes param — apply own-bike preference to defaults
      setActiveModes([...DEFAULT_MODES, "ownbike"]);
      setShowAdvanced(true);
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

  const handleStationClick = useCallback(
    (station: { name: string; lat: number; lng: number }) => {
      const loc = { lat: station.lat, lng: station.lng };
      setOrigin(loc);
      setOriginAddress(station.name);
      runCompute(loc);
      updateURL(loc, maxMinutes, activeModes, station.name);
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
        <ModeLegend activeModes={activeModes} onToggle={toggleMode} showAdvanced={showAdvanced} />
        <button
          type="button"
          onClick={() => {
            setShowAdvanced((v) => {
              const next = !v;
              // Turning advanced OFF should also drop any advanced-only modes
              // from the active set so the compute stays consistent with the UI.
              if (!next && activeModes.includes("ownbike")) {
                const cleaned = activeModes.filter((m) => m !== "ownbike");
                setActiveModes(cleaned);
                if (origin) updateURL(origin, maxMinutes, cleaned, originAddress);
              }
              return next;
            });
          }}
          className="mt-2 text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          {showAdvanced ? "− Hide advanced" : "+ Advanced modes"}
        </button>
        {showAdvanced && (
          <label className="mt-2 flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={ownBikePref}
              onChange={(e) => {
                const checked = e.target.checked;
                setOwnBikePref(checked);
                if (checked && !activeModes.includes("ownbike")) {
                  const next: TransportMode[] = [...activeModes, "ownbike"];
                  setActiveModes(next);
                  if (origin) updateURL(origin, maxMinutes, next, originAddress);
                }
              }}
              className="w-3.5 h-3.5 rounded border border-white/20 bg-transparent accent-accent cursor-pointer"
            />
            <span className="text-[10px] uppercase tracking-wider text-white/40 group-hover:text-white/60 transition-colors">
              I have my own bike
            </span>
          </label>
        )}
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
            <div className="text-center px-4">
              <p className="font-display italic uppercase text-3xl text-white/20">
                Enter an address
              </p>
              <p className="font-body text-sm text-white/20 mt-2">
                Try <span className="text-accent/60">Times Square</span> — or click the map to drop a pin
              </p>
            </div>
          </div>
        )}

        {/* How it works — info button (top-right of map) */}
        <button
          type="button"
          onClick={() => setShowHowItWorks(true)}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-surface-card/90 border border-white/15 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-accent hover:border-accent/50 transition-colors"
          aria-label="How it works"
        >
          <span className="font-display italic text-sm">?</span>
        </button>

        {showHowItWorks && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowHowItWorks(false)}
          >
            <div
              className="max-w-md w-full bg-surface-card border border-white/15 rounded-xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display italic uppercase text-xl text-white">How it works</h2>
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(false)}
                  className="text-white/40 hover:text-white text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4 font-body text-sm text-white/70">
                <div>
                  <p className="font-display italic uppercase text-xs text-accent mb-1">Your reach</p>
                  <p>
                    The default view shows the <span className="text-white">fastest</span> way to get
                    anywhere — walk, subway, bus, ferry, and Citi Bike are blended together. Toggle car
                    on if that&apos;s an option for you.
                  </p>
                </div>
                <div>
                  <p className="font-display italic uppercase text-xs text-accent mb-1">Stepped bands</p>
                  <p>
                    Colors are grouped into 10-minute bands (green → yellow → orange → red) so you can
                    see &ldquo;everywhere I can reach in 20 minutes&rdquo; at a glance instead of squinting
                    at a smooth gradient.
                  </p>
                </div>
                <div>
                  <p className="font-display italic uppercase text-xs text-accent mb-1">View as</p>
                  <p>
                    Switch from &ldquo;Your reach&rdquo; to a single mode (e.g. Subway only) to see what
                    that mode alone gets you. Cells unreachable by that mode disappear.
                  </p>
                </div>
              </div>
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
          onStationClick={handleStationClick}
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
