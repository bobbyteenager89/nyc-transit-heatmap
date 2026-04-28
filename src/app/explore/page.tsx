"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { IsochroneMap } from "@/components/isochrone/isochrone-map";
import type { StreetMode } from "@/components/isochrone/isochrone-map";
import { TimeSlider } from "@/components/isochrone/time-slider";
import { ModeLegend } from "@/components/isochrone/mode-legend";
import { PanelSection } from "@/components/ui/panel-section";
import { ReachStats } from "@/components/isochrone/reach-stats";
import { PlayButton } from "@/components/isochrone/play-button";
import { MapLegend } from "@/components/isochrone/map-legend";
import { MobileBottomSheet } from "@/components/isochrone/mobile-bottom-sheet";
import { MobileInstruction } from "@/components/isochrone/mobile-instruction";
import { MobileResultCard } from "@/components/isochrone/mobile-result-card";
import { computeHexGrid } from "@/lib/grid";
import { reverseGeocode } from "@/lib/geocode";
import { generateHexCenters } from "@/lib/hex";
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
import { H3_RESOLUTION, MAX_NYC_BOUNDS } from "@/lib/constants";
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

// URL input validation: accepts only finite numbers inside the NYC envelope
// and a plausible time window. Anything else is silently ignored so a
// pasted bad link (?lat=abc&lng=&t=999) loads the empty state instead of
// crashing the grid compute with NaN or a pin in the ocean.
function parseUrlLatLng(lat: string | null, lng: string | null): LatLng | null {
  if (!lat || !lng) return null;
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < MAX_NYC_BOUNDS.sw.lat || la > MAX_NYC_BOUNDS.ne.lat) return null;
  if (lo < MAX_NYC_BOUNDS.sw.lng || lo > MAX_NYC_BOUNDS.ne.lng) return null;
  return { lat: la, lng: lo };
}

function parseUrlMinutes(t: string | null): number | null {
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(1, Math.min(60, Math.round(n)));
  return clamped;
}

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streetMode, setStreetMode] = useState<StreetMode>("glow");
  useEffect(() => {
    try {
      const v = localStorage.getItem("nyc-transit-street-mode");
      if ((["off", "plain", "glow", "colored"] as StreetMode[]).includes(v as StreetMode)) {
        setStreetMode(v as StreetMode);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("nyc-transit-street-mode", streetMode); } catch { /* ignore */ }
  }, [streetMode]);
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
    },
    [runComputeRaw]
  );

  const runFriendCompute = useCallback(
    async (loc: LatLng) => {
      if (!stationGraph || !stationMatrix || !citiBikeData || !ferryData || !busData) return;
      setFriendComputing(true);
      try {
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
          () => {}
        );

        const geoLookup = new Map(rawCenters.map((c) => [c.h3Index, c]));
        const hexResult = result.cells.map((cell) => {
          const geo = geoLookup.get(cell.h3Index)!;
          return { ...cell, center: geo.center, boundary: geo.boundary };
        });

        setFriendCells(hexResult);
        setFriendContours([]);
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
    const urlLoc = parseUrlLatLng(params.get("lat"), params.get("lng"));
    const urlMinutes = parseUrlMinutes(params.get("t"));
    const m = params.get("m");

    if (urlMinutes !== null) setMaxMinutes(urlMinutes);
    // Read own-bike preference directly from localStorage to avoid a
    // race with useSyncExternalStore hydration timing.
    const hasOwnBike = (() => {
      try { return localStorage.getItem("nyc-transit-own-bike") === "true"; }
      catch { return false; }
    })();
    if (m) {
      // Baseline transit (walk/subway/bus/ferry) is always in the blend; the
      // URL only needs to preserve the opt-in overlays (bike, car). Parse any
      // valid mode and union with baseline so baseline can never be dropped.
      const parsed = m.split(",").filter((mode): mode is TransportMode =>
        ALL_MODES.includes(mode as TransportMode)
      ) as TransportMode[];
      const merged = Array.from(new Set([...DEFAULT_MODES, ...parsed]));
      // Apply own-bike preference if persisted and not already in URL
      if (hasOwnBike && !merged.includes("ownbike")) {
        merged.push("ownbike");
      }
      setActiveModes(merged);
      // Auto-reveal advanced panel if the URL already carries an advanced mode
      // or if the own-bike preference is set.
      if (parsed.includes("ownbike") || hasOwnBike) setShowAdvanced(true);
    } else if (hasOwnBike) {
      // No URL modes param — apply own-bike preference to defaults
      setActiveModes([...DEFAULT_MODES, "ownbike"]);
      setShowAdvanced(true);
    }
    if (urlLoc) {
      setOrigin(urlLoc);
      // Show address from URL immediately (before async geocode)
      const urlAddress = params.get("address");
      if (urlAddress) setOriginAddress(urlAddress);
      runCompute(urlLoc);
      // Reverse geocode to fill/refine address if not in URL
      if (!urlAddress) {
        reverseGeocode(urlLoc, process.env.NEXT_PUBLIC_MAPBOX_TOKEN!)
          .then((addr) => setOriginAddress(addr))
          .catch(() => setOriginAddress(`${urlLoc.lat.toFixed(4)}, ${urlLoc.lng.toFixed(4)}`));
      }
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

  const handleQuickStart = useCallback(
    (name: string, lat: number, lng: number) => {
      const latlng = { lat, lng };
      setOrigin(latlng);
      setOriginAddress(name);
      runCompute(latlng);
      updateURL(latlng, maxMinutes, activeModes, name);
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

  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        // Broad NYC envelope check
        if (lat < 40.49 || lat > 40.92 || lng < -74.26 || lng > -73.68) {
          setGeoError("Your location appears to be outside NYC.");
          return;
        }
        const loc = { lat, lng };
        setOrigin(loc);
        setOriginAddress("");
        runCompute(loc);
        updateURL(loc, maxMinutes, activeModes);
        reverseGeocode(loc, process.env.NEXT_PUBLIC_MAPBOX_TOKEN!)
          .then((addr) => {
            setOriginAddress(addr);
            updateURL(loc, maxMinutes, activeModes, addr);
          })
          .catch(() => {
            const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setOriginAddress(fallback);
          });
      },
      () => {
        setGeoLoading(false);
        setGeoError("Location access denied.");
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, [runCompute, updateURL, maxMinutes, activeModes]);

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

  const mapCenter: LatLng = origin ?? { lat: 40.694, lng: -73.990 };

  const sidebarControls = (
    <>
      {/* Header + Mode Tabs */}
      <div className="px-1 pt-2 pb-1 hidden md:block">
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "#f5f6fa",
          }}
        >
          Isochrone{" "}
          <span style={{ color: "var(--color-accent, #22d3ee)" }}>NYC</span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.46)",
            marginTop: 6,
          }}
        >
          NYC Transit Heatmap
        </p>
      </div>

      <ModeTabs active={exploreMode} onChange={setExploreMode} />

      {/* Mode description */}
      <p
        className="px-1"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "rgba(255,255,255,0.40)",
          lineHeight: 1.5,
        }}
      >
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
        <button
          onClick={handleUseMyLocation}
          disabled={geoLoading || !dataReady}
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: geoLoading ? "rgba(255,255,255,0.30)" : "rgba(34,211,238,0.80)",
            background: "transparent",
            border: "none",
            padding: "2px 0",
            cursor: geoLoading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
            <line x1="5.5" y1="0" x2="5.5" y2="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="5.5" y1="9" x2="5.5" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="0" y1="5.5" x2="2" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9" y1="5.5" x2="11" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {geoLoading ? "Locating…" : "Use my location"}
        </button>
        {geoError && (
          <p style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "rgba(255,100,100,0.80)", marginTop: 2 }}>
            {geoError}
          </p>
        )}
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
          style={{
            marginTop: 6,
            fontFamily: "var(--font-data)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.40)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "color 0.15s",
          }}
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
                } else if (!checked && activeModes.includes("ownbike")) {
                  const next = activeModes.filter((m) => m !== "ownbike");
                  setActiveModes(next);
                  if (origin) updateURL(origin, maxMinutes, next, originAddress);
                }
              }}
              className="w-3.5 h-3.5 rounded border border-white/20 bg-transparent cursor-pointer accent-[--color-accent]"
            />
            <span style={{ fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)" }}>
              I have my own bike
            </span>
          </label>
        )}
      </PanelSection>

      {/* Street style */}
      <PanelSection title="Street Style">
        <div className="flex gap-1.5">
          {(["off", "plain", "glow", "colored"] as StreetMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStreetMode(mode)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 6,
                fontFamily: "var(--font-data)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 500,
                transition: "background 0.15s, color 0.15s",
                cursor: "pointer",
                border: streetMode === mode
                  ? "1px solid rgba(34,211,238,0.6)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: streetMode === mode
                  ? "rgba(34,211,238,0.15)"
                  : "transparent",
                color: streetMode === mode
                  ? "var(--color-accent, #22d3ee)"
                  : "rgba(255,255,255,0.55)",
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </PanelSection>

      {/* Transit trivia */}
      <TransitTrivia />

      {/* View as: render filter (separate from compute toggles above) */}
      {cells.length > 0 && (
        <PanelSection title="View as">
          <div className="flex flex-wrap gap-1.5">
            {(["fastest", ...activeModes] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontFamily: "var(--font-data)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                  border: viewMode === m
                    ? "1px solid rgba(34,211,238,0.7)"
                    : "1px solid rgba(255,255,255,0.12)",
                  background: viewMode === m
                    ? "rgba(34,211,238,0.15)"
                    : "transparent",
                  color: viewMode === m
                    ? "var(--color-accent, #22d3ee)"
                    : "rgba(255,255,255,0.55)",
                }}
              >
                {VIEW_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
              lineHeight: 1.4,
              marginTop: 4,
            }}
          >
            {viewMode === "fastest"
              ? "Color = fastest of all active modes"
              : (viewMode === "bus" || viewMode === "ferry")
                ? `Walk + ${VIEW_MODE_LABELS[viewMode]} where it's faster — highlighted cells show where ${VIEW_MODE_LABELS[viewMode]} beats walking`
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


  const mobileMenuContent = (
    <>
      <PanelSection title="Location">
        <AddressAutocomplete
          label="Address"
          placeholder="Start typing an address…"
          onSelect={handleAddressSelect}
          initialValue={originAddress}
          autoFocus={false}
        />
        {!dataReady && (
          <p className="font-body text-xs text-white/40 animate-pulse">
            Loading transit data…
          </p>
        )}
      </PanelSection>

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

      <PanelSection title="Transport Modes">
        <ModeLegend
          activeModes={activeModes}
          onToggle={toggleMode}
          showAdvanced={false}
        />
      </PanelSection>

      <PanelSection title="Street Style">
        <div className="flex gap-1.5">
          {(["off", "plain", "glow", "colored"] as StreetMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStreetMode(mode)}
              className={`flex-1 py-1.5 rounded text-[11px] font-body capitalize transition-colors ${
                streetMode === mode
                  ? "bg-accent/25 text-accent border border-accent/60"
                  : "text-white/60 border border-white/10 hover:bg-white/10"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </PanelSection>

      {origin && !computing && cells.length > 0 && (
        <PanelSection>
          {(() => {
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
      )}
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[360px] flex-shrink-0 flex-col bg-surface overflow-y-auto gap-[14px] p-[14px]">
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
          <div className="absolute inset-0 hidden md:flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center px-4 animate-fade-in">
              {/* Pulsing pin icon */}
              <div className="mx-auto mb-4 relative w-10 h-10">
                <svg className="w-10 h-10 text-accent/40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
              </div>
              <p className="font-display italic uppercase text-2xl md:text-3xl text-white/20">
                Drop a pin to start
              </p>
              <p className="font-body text-sm text-white/30 mt-2 mb-4">
                Click the map — or try one of these:
              </p>
              {/* Quick-start location buttons */}
              <div className="flex flex-wrap justify-center gap-2 pointer-events-auto">
                {[
                  { name: "Times Square", lat: 40.758, lng: -73.9855 },
                  { name: "Williamsburg", lat: 40.7081, lng: -73.9571 },
                  { name: "Astoria", lat: 40.7724, lng: -73.9301 },
                ].map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => {
                      const latlng = { lat: loc.lat, lng: loc.lng };
                      setOrigin(latlng);
                      setOriginAddress(loc.name);
                      runCompute(latlng);
                      updateURL(latlng, maxMinutes, activeModes, loc.name);
                    }}
                    className="px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-body hover:bg-accent/20 transition-colors cursor-pointer"
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
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
          streetMode={streetMode}
          onStreetModeChange={setStreetMode}
          onMapClick={handleMapClick}
          onStationClick={handleStationClick}
          friendOrigin={friendOrigin}
          viewMode={viewMode}
        />
      </main>

      {/* Mobile: instruction card — shown when no origin set */}
      {!origin && (
        <div className="md:hidden">
          <MobileInstruction onQuickStart={handleQuickStart} />
        </div>
      )}

      {/* Mobile: result card — shown after compute */}
      {origin && cells.length > 0 && !computing && (
        <div className="md:hidden">
          <MobileResultCard
            address={originAddress}
            maxMinutes={maxMinutes}
            modeCount={activeModes.length}
            onMenuOpen={() => setMobileMenuOpen(true)}
          />
        </div>
      )}

      {/* Mobile: menu drawer */}
      <div className="md:hidden">
        <MobileBottomSheet
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        >
          {mobileMenuContent}
        </MobileBottomSheet>
      </div>
    </div>
  );
}
