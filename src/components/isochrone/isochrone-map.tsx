"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { latLngToCell } from "h3-js";
import type { LatLng, TransportMode, HexCell } from "@/lib/types";
import type { IsochroneContour } from "@/lib/mapbox-isochrone";
import { HEX_MODES } from "@/lib/mapbox-isochrone";
import { MODE_COLORS } from "@/lib/isochrone";
import { H3_RESOLUTION } from "@/lib/constants";
import { reverseGeocode } from "@/lib/geocode";
import { useSubwayStations } from "@/components/isochrone/hooks/use-subway-stations";
import { useFairnessLayer } from "@/components/isochrone/hooks/use-fairness-layer";

/** Street rendering modes on the /explore map — a visual sandbox so we can
 *  compare cosmetic glow against colored-by-time treatments without
 *  shipping one blindly. Wired through a top-right toggle on the map. */
export type StreetMode = "off" | "plain" | "glow" | "colored";

/**
 * MTA official brand colors by subway line.
 * Source: MTA brand standards / NYC Open Data.
 */
export const MTA_LINE_COLORS: Record<string, string> = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C", "6X": "#00933C",
  "7": "#B933AD", "7X": "#B933AD",
  "A": "#0039A6", "C": "#0039A6", "E": "#0039A6",
  "B": "#FF6319", "D": "#FF6319", "F": "#FF6319", "FX": "#FF6319", "M": "#FF6319",
  "G": "#6CBE45",
  "J": "#996633", "Z": "#996633",
  "L": "#A7A9AC",
  "N": "#FCCC0A", "Q": "#FCCC0A", "R": "#FCCC0A", "W": "#FCCC0A",
  "FS": "#808183", "GS": "#808183", "H": "#808183",
  "SI": "#0039A6",
};

/** What the color scale represents on the map.
 *  - 'fastest': color by the fastest time across all active modes (the blend)
 *  - a specific TransportMode: color by ONLY that mode's travel time, hiding
 *    cells unreachable by that mode. Reveals each mode's real shape. */
export type ViewMode = "fastest" | TransportMode;

interface IsochroneMapProps {
  center: LatLng;
  cells: HexCell[];
  apiContours: IsochroneContour[];
  activeModes: TransportMode[];
  maxMinutes: number;
  onMapClick?: (location: LatLng) => void;
  onStationClick?: (station: { name: string; lat: number; lng: number }) => void;
  friendOrigin?: LatLng | null;
  friendCells?: HexCell[];
  fairnessRange?: number; // max acceptable time diff in minutes (default 5)
  viewMode?: ViewMode;
}

/**
 * Build hex fill GeoJSON colored by fastest time across ALL active modes.
 * Uses the worker-computed times for every mode (walk, bike, car included).
 * Loads ALL reachable cells (no maxMinutes filter) — visibility is controlled
 * via GL setFilter on the slider side to eliminate per-tick JS iteration.
 */
function cellsToHexGeoJSON(
  cells: HexCell[],
  activeModes: TransportMode[],
  viewMode: ViewMode = "fastest"
): GeoJSON.FeatureCollection {
  // In single-mode view, we color each cell by only that mode's time and hide
  // cells unreachable by that mode. This reveals the real shape of each mode
  // (e.g. the lumpy subway island structure) that gets smeared out when bike
  // or walk "win" under the fastest-of-all-modes blend.
  if (viewMode !== "fastest") {
    const features: GeoJSON.Feature[] = [];
    for (const cell of cells) {
      const t = cell.times[viewMode];
      if (t === null || t === undefined) continue;
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[...cell.boundary, cell.boundary[0]]],
        },
        properties: {
          time: Math.round(t * 10) / 10,
          fastest_mode: viewMode,
          subway: cell.times.subway ?? -1,
          bus: cell.times.bus ?? -1,
          ferry: cell.times.ferry ?? -1,
          walk: cell.times.walk ?? -1,
          bike: cell.times.bike ?? -1,
          car: cell.times.car ?? -1,
        },
      });
    }
    return { type: "FeatureCollection", features };
  }

  if (activeModes.length === 0) return { type: "FeatureCollection", features: [] };

  const features: GeoJSON.Feature[] = [];
  for (const cell of cells) {
    let fastest = Infinity;
    let fastestMode: TransportMode = "walk";
    for (const mode of activeModes) {
      const t = cell.times[mode];
      if (t !== null && t !== undefined && t < fastest) {
        fastest = t;
        fastestMode = mode;
      }
    }
    if (fastest === Infinity) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...cell.boundary, cell.boundary[0]]],
      },
      properties: {
        time: Math.round(fastest * 10) / 10,
        fastest_mode: fastestMode,
        subway: cell.times.subway ?? -1,
        bus: cell.times.bus ?? -1,
        ferry: cell.times.ferry ?? -1,
        walk: cell.times.walk ?? -1,
        bike: cell.times.bike ?? -1,
        car: cell.times.car ?? -1,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

/**
 * Color ramp — hybrid smooth-within-bands.
 * Smooth interpolation within each 10-min band for fine-grained detail,
 * with visible color jumps at band edges so the contour structure reads
 * clearly at a glance. Each band's endpoints span a wide hue range so
 * 1-5 min differences around subway stops are perceptible — the priority
 * is band 1, where a hex at 1 min (teal-green) reads distinctly from a
 * hex at 5 min (lime) even though both are "green".
 */
const COLOR_RAMP: mapboxgl.Expression = [
  "interpolate", ["linear"], ["get", "time"],
  // Band 1: 0-9 min — neon green to chartreuse (span within green→yellow-green)
  0,  "#39ff14",
  9,  "#c8ff00",
  // Jump to band 2: 10-19 min — gold to amber
  10, "#ffd700",
  19, "#ffaa00",
  // Jump to band 3: 20-29 min — dark orange to red-orange
  20, "#ff7700",
  29, "#ff4500",
  // Jump to band 4: 30-39 min — ember red to dark red
  30, "#e81800",
  39, "#c8101a",
  // Jump to band 5: 40-49 min — crimson
  40, "#a00030",
  49, "#800020",
  // Band 6: 50+ min — deep purple. Shifting from near-black crimson to a
  // purple ramp recovers visibility against the dark Mapbox basemap while
  // preserving the "deeper = farther" semantic (still monotonic darkness).
  50, "#6a1b6a",
  60, "#4a0a4a",
];

export function IsochroneMap({
  center,
  cells,
  apiContours,
  activeModes,
  maxMinutes,
  onMapClick,
  onStationClick,
  friendOrigin,
  friendCells = [],
  fairnessRange = 5,
  viewMode = "fastest",
}: IsochroneMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const friendMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animationRef = useRef<number>(0);
  const prevCellCountRef = useRef(0);

  const activeModesRef = useRef(activeModes);
  activeModesRef.current = activeModes;
  const maxMinutesRef = useRef(maxMinutes);
  maxMinutesRef.current = maxMinutes;

  type TooltipData =
    | { type: "reach"; address: string; modes: { mode: string; label: string; time: number; color: string; isFastest: boolean }[] }
    | { type: "fairness"; address: string; timeA: number; timeB: number; diff: number };

  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const geocodeCache = useRef<Map<string, string>>(new Map());

  // Street rendering mode — visual sandbox (off / plain / glow / colored).
  // Persisted to localStorage so the preview choice survives page refreshes
  // while Andrew is iterating.
  const [streetMode, setStreetMode] = useState<StreetMode>(() => {
    if (typeof window === "undefined") return "glow";
    try {
      const v = localStorage.getItem("nyc-transit-street-mode");
      return (["off", "plain", "glow", "colored"] as StreetMode[]).includes(v as StreetMode)
        ? (v as StreetMode)
        : "glow";
    } catch { return "glow"; }
  });
  const streetModeRef = useRef(streetMode);
  streetModeRef.current = streetMode;
  useEffect(() => {
    try { localStorage.setItem("nyc-transit-street-mode", streetMode); } catch { /* ignore */ }
  }, [streetMode]);

  // Initialize dark map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [center.lng, center.lat],
      zoom: 12,
      // Clamp pan/zoom to MAX_NYC_BOUNDS — the hard outer limit the grid can
      // ever expand to. The hex grid starts tight (CORE_NYC_BOUNDS) and may
      // auto-expand up to this envelope as the reach envelope hits borders.
      maxBounds: [
        [-74.06, 40.55],
        [-73.72, 40.90],
      ],
      minZoom: 10,
    });
    mapRef.current = m;

    m.on("load", () => {
      const firstSymbol = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      // --- API isochrone sources (walk, bike, car) ---
      // Each mode gets its own source + fill layer
      for (const mode of ["walk", "bike", "car"] as TransportMode[]) {
        m.addSource(`api-iso-${mode}`, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        m.addLayer({
          id: `api-fill-${mode}`,
          type: "fill",
          source: `api-iso-${mode}`,
          paint: {
            "fill-color": MODE_COLORS[mode],
            "fill-opacity": 0,
          },
        }, firstSymbol);

        // Outline for API contours — gives that clean isochrone edge
        m.addLayer({
          id: `api-line-${mode}`,
          type: "line",
          source: `api-iso-${mode}`,
          paint: {
            "line-color": MODE_COLORS[mode],
            "line-width": 1.5,
            "line-opacity": 0,
          },
        }, firstSymbol);
      }

      // Person B (friend) API isochrone layers — amber
      m.addSource("friend-iso", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: "friend-fill",
        type: "fill",
        source: "friend-iso",
        paint: {
          "fill-color": "#f59e0b",
          "fill-opacity": 0,
        },
      }, firstSymbol);

      m.addLayer({
        id: "friend-line",
        type: "line",
        source: "friend-iso",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 1.5,
          "line-opacity": 0,
        },
      }, firstSymbol);

      // Fairness zone source + layer
      m.addSource("fairness-zone", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: "fairness-fill",
        type: "fill",
        source: "fairness-zone",
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["get", "ratio"],
            0, "#00ff87",    // bright green = perfectly equal
            0.5, "#39ff14",  // neon green
            1.0, "#ffdd00",  // yellow = edge of fairness range
          ],
          "fill-opacity": 0.6,
        },
      }, firstSymbol);

      m.addLayer({
        id: "fairness-line",
        type: "line",
        source: "fairness-zone",
        paint: {
          "line-color": "#00ff87",
          "line-width": 0.5,
          "line-opacity": 0.3,
        },
      }, firstSymbol);

      // --- Overlay layers (added before hex fill so hexes render on top) ---

      // Street grid — paint properties driven by streetMode effect below.
      // Added before firstSymbol so map labels stay on top.
      try {
        m.addLayer({
          id: "street-overlay",
          type: "line",
          source: "composite",
          "source-layer": "road",
          filter: ["in", "class", "street", "primary", "secondary", "tertiary", "motorway", "trunk"],
          paint: {
            "line-color": "rgba(255,255,255,0.25)",
            "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 13, 1, 16, 2],
          },
        }, firstSymbol);
      } catch { /* skip */ }

      // Colored-streets overlay (streetMode="colored").
      m.addSource("street-colored", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "street-colored-glow",
        type: "line",
        source: "street-colored",
        paint: {
          "line-color": COLOR_RAMP,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 5, 16, 8],
          "line-opacity": 0,
          "line-blur": 3,
        },
      }, firstSymbol);
      m.addLayer({
        id: "street-colored-core",
        type: "line",
        source: "street-colored",
        paint: {
          "line-color": COLOR_RAMP,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 13, 1.4, 16, 2.4],
          "line-opacity": 0,
        },
      }, firstSymbol);

      // --- Hex fill source — added after street layers so hexes render above streets ---
      m.addSource("iso-hexes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: "iso-fill",
        type: "fill",
        source: "iso-hexes",
        paint: {
          "fill-color": COLOR_RAMP,
          "fill-opacity": 0,
        },
      }, firstSymbol);

      m.addLayer({
        id: "iso-outline",
        type: "line",
        source: "iso-hexes",
        paint: {
          "line-color": COLOR_RAMP,
          "line-width": 0.5,
          "line-opacity": 0.3,
        },
        filter: ["<=", ["get", "time"], 60],
      }, firstSymbol);

      // Water mask — above hexes so water areas stay dark
      try {
        m.addLayer({
          id: "water-mask",
          type: "fill",
          source: "composite",
          "source-layer": "water",
          paint: { "fill-color": "#0a0a12", "fill-opacity": 1 },
        }, firstSymbol);
      } catch { /* skip */ }

      // Waterways
      try {
        m.addLayer({
          id: "waterway-mask",
          type: "line",
          source: "composite",
          "source-layer": "waterway",
          paint: { "line-color": "#0a0a12", "line-width": 8, "line-opacity": 1 },
        }, firstSymbol);
      } catch { /* skip */ }

      // Parks
      try {
        m.addLayer({
          id: "park-overlay",
          type: "fill",
          source: "composite",
          "source-layer": "landuse",
          filter: ["in", "class", "park", "cemetery", "pitch"],
          paint: { "fill-color": "#0d2818", "fill-opacity": 0.7 },
        }, firstSymbol);
      } catch { /* skip */ }

      // Neighborhood lines — on top of everything
      try {
        m.addLayer({
          id: "neighborhood-lines",
          type: "line",
          source: "composite",
          "source-layer": "admin",
          filter: [">=", "admin_level", 2],
          paint: { "line-color": "rgba(255,255,255,0.25)", "line-width": 1.5, "line-dasharray": [3, 2] },
        });
      } catch { /* skip */ }

      // Click handler
      m.on("click", (e) => {
        const waterFeatures = m.queryRenderedFeatures(e.point, { layers: ["water-mask"] });
        if (waterFeatures.length > 0) return;
        // Defer to the station-specific click handler when the user clicks a station dot.
        if (m.getLayer("subway-stations-circle")) {
          const stationHits = m.queryRenderedFeatures(e.point, { layers: ["subway-stations-circle"] });
          if (stationHits.length > 0) return;
        }
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // Hover tooltip on hex fill
      m.on("mousemove", "iso-fill", async (e) => {
        if (!e.features?.[0]) return;
        m.getCanvas().style.cursor = "pointer";
        const props = e.features[0].properties!;

        const geom = e.features[0].geometry as GeoJSON.Polygon;
        const coords = geom.coordinates[0];
        const cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        const cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const cacheKey = `${cy.toFixed(3)},${cx.toFixed(3)}`;
        let address = geocodeCache.current.get(cacheKey);
        if (!address) {
          address = await reverseGeocode({ lat: cy, lng: cx }, process.env.NEXT_PUBLIC_MAPBOX_TOKEN!);
          geocodeCache.current.set(cacheKey, address);
        }

        const modeLabels: Record<string, string> = {
          walk: "Walk", bike: "Citi Bike", ownbike: "Own Bike",
          subway: "Subway", bus: "Bus", car: "Car", ferry: "Ferry",
        };
        const modeRows = activeModesRef.current
          .map((mode) => {
            const t = props[mode] as number;
            if (t < 0 || t > maxMinutesRef.current) return null;
            return {
              mode,
              label: modeLabels[mode] ?? mode,
              time: Math.round(t),
              color: MODE_COLORS[mode],
              isFastest: mode === props.fastest_mode,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (modeRows.length > 0) {
          setTooltipData({ type: "reach", address, modes: modeRows });
        } else {
          setTooltipData(null);
        }
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "iso-fill", () => {
        m.getCanvas().style.cursor = "";
        setTooltipData(null);
      });

      m.on("mousemove", "fairness-fill", async (e) => {
        if (!e.features?.[0]) return;
        m.getCanvas().style.cursor = "pointer";
        const props = e.features[0].properties!;

        const geom = e.features[0].geometry as GeoJSON.Polygon;
        const coords = geom.coordinates[0];
        const cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        const cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const cacheKey = `${cy.toFixed(3)},${cx.toFixed(3)}`;
        let address = geocodeCache.current.get(cacheKey);
        if (!address) {
          address = await reverseGeocode({ lat: cy, lng: cx }, process.env.NEXT_PUBLIC_MAPBOX_TOKEN!);
          geocodeCache.current.set(cacheKey, address);
        }

        const diff = props.diff as number;
        const timeA = props.timeA as number;
        const timeB = props.timeB as number;

        setTooltipData({ type: "fairness", address, timeA, timeB, diff });
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "fairness-fill", () => {
        m.getCanvas().style.cursor = "";
        setTooltipData(null);
      });

      // Subway stations are loaded by useSubwayStations once mapReady flips.

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      cancelAnimationFrame(animationRef.current);
      originMarkerRef.current?.remove();
      friendMarkerRef.current?.remove();
      m.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update origin marker — shows "A" label when friend is present, plain dot otherwise
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    originMarkerRef.current?.remove();
    if (center) {
      const showLabel = !!friendOrigin;
      const el = document.createElement("div");
      if (showLabel) {
        el.style.cssText =
          "width:22px;height:22px;background:#ffffff;border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 20px rgba(255,255,255,0.9),0 0 40px rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#0a0a12;font-family:Arial Black,sans-serif";
        el.textContent = "A";
      } else {
        el.style.cssText =
          "width:14px;height:14px;background:#ffffff;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 20px rgba(255,255,255,0.9),0 0 40px rgba(255,255,255,0.4)";
      }
      originMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(m);
      m.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 800 });
    }
  }, [center, mapReady, friendOrigin]);

  // Friend origin marker (amber) — always shows "B" label
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    friendMarkerRef.current?.remove();
    friendMarkerRef.current = null;

    if (friendOrigin) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:22px;height:22px;background:#f59e0b;border:2px solid #f59e0b;border-radius:50%;box-shadow:0 0 20px rgba(245,158,11,0.9),0 0 40px rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#0a0a12;font-family:Arial Black,sans-serif";
      el.textContent = "B";
      friendMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([friendOrigin.lng, friendOrigin.lat])
        .addTo(m);
    }
  }, [friendOrigin, mapReady]);

  // Update API isochrone layers (walk, bike, car)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    for (const mode of ["walk", "bike", "car"] as TransportMode[]) {
      const source = m.getSource(`api-iso-${mode}`) as mapboxgl.GeoJSONSource | undefined;
      if (!source) continue;

      const isActive = activeModes.includes(mode);
      // Get contours for this mode, sorted outermost first (rendered first = behind)
      const contours = apiContours
        .filter((c) => c.personId === "a" && c.mode === mode && c.minutes <= maxMinutes)
        .sort((a, b) => b.minutes - a.minutes);

      if (!isActive || contours.length === 0) {
        source.setData({ type: "FeatureCollection", features: [] });
        m.setPaintProperty(`api-fill-${mode}`, "fill-opacity", 0);
        m.setPaintProperty(`api-line-${mode}`, "line-opacity", 0);
        continue;
      }

      // Each contour feature rendered with uniform opacity.
      // Since polygons are nested (outer includes inner area), overlapping
      // regions accumulate opacity naturally — center is brightest.
      source.setData({ type: "FeatureCollection", features: contours.map((c) => c.polygon) });
      m.setPaintProperty(`api-fill-${mode}`, "fill-opacity", 0.15);
      m.setPaintProperty(`api-line-${mode}`, "line-opacity", 0.6);
    }

    // Person B (friend) contours — amber
    const friendSource = m.getSource("friend-iso") as mapboxgl.GeoJSONSource | undefined;
    if (friendSource) {
      const friendContourData = apiContours
        .filter((c) => c.personId === "b" && c.minutes <= maxMinutes)
        .sort((a, b) => b.minutes - a.minutes);

      if (friendContourData.length === 0) {
        friendSource.setData({ type: "FeatureCollection", features: [] });
        m.setPaintProperty("friend-fill", "fill-opacity", 0);
        m.setPaintProperty("friend-line", "line-opacity", 0);
      } else {
        friendSource.setData({
          type: "FeatureCollection",
          features: friendContourData.map((c) => c.polygon),
        });
        m.setPaintProperty("friend-fill", "fill-opacity", 0.15);
        m.setPaintProperty("friend-line", "line-opacity", 0.6);
      }
    }
  }, [apiContours, activeModes, maxMinutes, mapReady]);

  // Load hex data when cells or active modes change (not on slider tick)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const geojson = cellsToHexGeoJSON(cells, activeModes, viewMode);
    const source = m.getSource("iso-hexes") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }

    // Animate reveal on new compute
    const isNewCompute = cells.length !== prevCellCountRef.current && cells.length > 0;
    prevCellCountRef.current = cells.length;

    if (isNewCompute) {
      cancelAnimationFrame(animationRef.current);
      m.setPaintProperty("iso-fill", "fill-opacity", 0);
      m.setPaintProperty("iso-outline", "line-opacity", 0);

      // Target opacities depend on streetMode. In "colored" the hex sits
      // at 0.50 — saturated enough that 1-5 min gradient around a subway
      // stop reads clearly, while still letting streets stay primary.
      const fillTarget = streetModeRef.current === "colored" ? 0.50 : 0.65;
      const outlineTarget = streetModeRef.current === "colored" ? 0.20 : 0.3;

      const start = performance.now();
      const duration = 800;
      function animate(now: number) {
        const progress = Math.max(0, Math.min((now - start) / duration, 1));
        const eased = 1 - Math.pow(1 - progress, 3);
        m!.setPaintProperty("iso-fill", "fill-opacity", eased * fillTarget);
        m!.setPaintProperty("iso-outline", "line-opacity", eased * outlineTarget);
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [cells, activeModes, mapReady, viewMode]);

  // Filter hex visibility by maxMinutes (GL-side, no JS iteration — eliminates INP on slider tick)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    m.setFilter("iso-fill", ["<=", ["get", "time"], maxMinutes]);
    m.setFilter("iso-outline", ["<=", ["get", "time"], maxMinutes]);
  }, [maxMinutes, mapReady]);

  // Drive the street-overlay paint and colored-street layer opacity from
  // the streetMode toggle. "colored" flips on the data-driven COLOR_RAMP
  // layers; the sampling effect below populates the feature collection.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const setVisible = (id: string, visible: boolean) => {
      if (!m.getLayer(id)) return;
      m.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    };

    // street-overlay must stay "visible" in "colored" mode so
    // queryRenderedFeatures can still see road features for sampling —
    // a layer hidden via visibility:none is excluded from that query.
    // Off is the only mode that truly hides it.
    setVisible("street-overlay", streetMode !== "off");

    if (streetMode === "plain") {
      m.setPaintProperty("street-overlay", "line-color", "rgba(255,255,255,0.25)");
      m.setPaintProperty("street-overlay", "line-blur", 0);
    } else if (streetMode === "glow") {
      m.setPaintProperty("street-overlay", "line-color", "rgba(255,255,255,0.55)");
      m.setPaintProperty("street-overlay", "line-blur", 2);
    } else if (streetMode === "colored") {
      m.setPaintProperty("street-overlay", "line-color", "rgba(255,255,255,0)");
      m.setPaintProperty("street-overlay", "line-blur", 0);
    }

    const coloredOn = streetMode === "colored";
    setVisible("street-colored-glow", coloredOn);
    setVisible("street-colored-core", coloredOn);
    m.setPaintProperty("street-colored-glow", "line-opacity", coloredOn ? 0.55 : 0);
    m.setPaintProperty("street-colored-core", "line-opacity", coloredOn ? 0.95 : 0);

    // When colored streets are the primary reach indicator, keep the hex
    // fill at 0.50 — saturated enough that the 1-5 min gradient around
    // subway stops reads clearly, low enough that streets stay primary.
    // Prior settings: 0.12 (too subtle, misread street-only coverage),
    // 0.35 (subway stops blended with surrounding hexes).
    m.setPaintProperty("iso-fill", "fill-opacity", coloredOn ? 0.50 : 0.65);
    m.setPaintProperty("iso-outline", "line-opacity", coloredOn ? 0.20 : 0.3);
  }, [streetMode, mapReady]);

  // Sample road vector tile features against the current hex grid and emit
  // a GeoJSON source colored by travel time. Runs only in "colored" mode,
  // triggered on compute complete and on map idle (after pan/zoom).
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    if (streetMode !== "colored") return;

    if (cells.length === 0) return;

    // Build an h3 index → time lookup once per cell update. Lookup cost is
    // O(1) per street midpoint sample.
    const h3Times = new Map<string, number>();
    for (const cell of cells) {
      let t: number;
      if (viewMode !== "fastest") {
        const v = cell.times[viewMode];
        if (v === null || v === undefined) continue;
        t = v;
      } else {
        let best = Infinity;
        for (const mode of activeModes) {
          const v = cell.times[mode];
          if (v !== null && v !== undefined && v < best) best = v;
        }
        if (best === Infinity) continue;
        t = best;
      }
      h3Times.set(cell.h3Index, Math.round(t * 10) / 10);
    }

    let disposed = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;
    let lastViewKey = "";

    // Reach time at a (lng, lat) point, or null if it falls outside the hex
    // grid or the cell is unreachable under the current mode/time budget.
    const timeAt = (lng: number, lat: number): number | null => {
      const h3 = latLngToCell(lat, lng, H3_RESOLUTION);
      const t = h3Times.get(h3);
      if (t === undefined || t > maxMinutesRef.current) return null;
      return t;
    };

    // Emit the fully-reachable subsegments of a polyline. For each
    // consecutive vertex pair we check BOTH endpoints against the hex
    // grid; if either is outside reach the segment is dropped. This
    // replaces the old "color the whole feature by midpoint time" logic,
    // which smeared coloring into Jersey / deep Brooklyn whenever a road
    // feature straddled a reachability boundary.
    const addFeatureSegments = (
      coords: number[][],
      sink: GeoJSON.Feature[]
    ) => {
      for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i];
        const b = coords[i + 1];
        const tA = timeAt(a[0], a[1]);
        const tB = timeAt(b[0], b[1]);
        if (tA === null || tB === null) continue;
        sink.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: [a, b] },
          properties: { time: Math.max(tA, tB) },
        });
      }
    };

    const FEATURE_CAP = 3000;
    const CHUNK_SIZE = 400;

    const sampleStreets = () => {
      if (disposed || !mapRef.current) return;

      // Bbox+zoom cache: re-idle on the same view is a no-op. Cells/mode
      // changes bust this because they re-run the effect.
      const b = m.getBounds();
      const z = m.getZoom();
      const viewKey = b
        ? `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}@${z.toFixed(2)}`
        : "";
      if (viewKey && viewKey === lastViewKey) return;

      const roads = m.queryRenderedFeatures({ layers: ["street-overlay"] });
      const features: GeoJSON.Feature[] = [];
      const seen = new Set<string | number>();
      let i = 0;

      const processChunk = () => {
        if (disposed || !mapRef.current) return;
        const end = Math.min(i + CHUNK_SIZE, roads.length);
        for (; i < end; i++) {
          const f = roads[i];
          if (f.id !== undefined) {
            if (seen.has(f.id)) continue;
            seen.add(f.id);
          }
          const geom = f.geometry;
          if (!geom) continue;
          if (geom.type === "LineString") {
            addFeatureSegments(geom.coordinates, features);
          } else if (geom.type === "MultiLineString") {
            for (const seg of geom.coordinates) addFeatureSegments(seg, features);
          }
          if (features.length >= FEATURE_CAP) {
            i = roads.length;
            break;
          }
        }
        if (i < roads.length) {
          rafId = requestAnimationFrame(processChunk);
          return;
        }
        rafId = null;
        // Only cache non-empty results. On URL-param cold-start the
        // street-overlay layer may not be rendered yet, so the first sample
        // can return 0 features; caching that would make subsequent idle
        // events early-return and leave streets uncolored until manual pan.
        if (features.length > 0) {
          lastViewKey = viewKey;
        }
        const src = m.getSource("street-colored") as mapboxgl.GeoJSONSource | undefined;
        src?.setData({ type: "FeatureCollection", features });
      };

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(processChunk);
    };

    // Debounce idle so a quick pan-then-pan doesn't trigger back-to-back
    // samples. 150ms ≈ one frame past settle — imperceptible, but avoids
    // sampling a view the user is about to leave.
    const scheduleSample = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(sampleStreets, 150);
    };

    // Initial sample runs immediately (first paint), then idle re-samples
    // are debounced.
    sampleStreets();
    m.on("idle", scheduleSample);
    return () => {
      disposed = true;
      if (idleTimer) clearTimeout(idleTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      m.off("idle", scheduleSample);
    };
  }, [streetMode, cells, activeModes, viewMode, mapReady]);

  useSubwayStations(mapRef, mapReady, onStationClick);

  useFairnessLayer({
    mapRef,
    mapReady,
    cells,
    friendCells,
    activeModes,
    maxMinutes,
    fairnessRange,
  });

  const streetModes: { value: StreetMode; label: string; hint: string }[] = [
    { value: "off",     label: "Off",     hint: "Hide all street lines" },
    { value: "plain",   label: "Plain",   hint: "White streets, 25% opacity (current)" },
    { value: "glow",    label: "Glow",    hint: "Brighter white with blur halo" },
    { value: "colored", label: "Colored", hint: "Streets colored by travel time" },
  ];

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full cursor-crosshair" />

      {/* Street-mode visualizer — top-right, below the "?" info button which
          lives at top-4 right-4 in explore/page.tsx. This stacks below it. */}
      <div className="absolute top-16 right-4 z-30 pointer-events-auto">
        <div className="flex flex-col gap-1 bg-surface-card/90 border border-white/15 backdrop-blur-md rounded-lg p-2 shadow-lg">
          <span className="font-display italic uppercase text-[10px] tracking-wider text-white/40 px-1">
            Streets
          </span>
          <div className="flex gap-1">
            {streetModes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                title={opt.hint}
                aria-label={opt.hint}
                onClick={() => setStreetMode(opt.value)}
                className={`px-2 py-1 rounded text-[10px] font-body transition-colors cursor-pointer active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#12131a] ${
                  streetMode === opt.value
                    ? "bg-accent/25 text-accent border border-accent/60"
                    : "text-white/60 border border-white/10 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tooltipData && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: Math.min(tooltipPos.x + 16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 220),
            top: tooltipPos.y - 16,
          }}
        >
          <div className="bg-[#1a1b24]/95 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm shadow-xl min-w-[180px]">
            <p className="font-display italic text-xs text-white/70 mb-2 truncate max-w-[200px]">
              {tooltipData.address}
            </p>
            {tooltipData.type === "reach" ? (
              <div className="flex flex-col gap-1.5">
                {tooltipData.modes.map((m) => (
                  <div key={m.mode} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className={`text-xs flex-1 ${m.isFastest ? "text-white font-bold" : "text-white/50"}`}>
                      {m.label}
                    </span>
                    <span className={`text-xs tabular-nums ${m.isFastest ? "text-white font-bold" : "text-white/40"}`}>
                      {m.time} min
                    </span>
                    {m.isFastest && (
                      <span className="text-cyan-400 text-[10px]">&#9733;</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">You</span>
                  <span className="text-white tabular-nums">{tooltipData.timeA} min</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400/60">Friend</span>
                  <span className="text-amber-400 tabular-nums">{tooltipData.timeB} min</span>
                </div>
                <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/40">Diff</span>
                  <span className="text-emerald-400 font-bold tabular-nums">{tooltipData.diff} min</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
