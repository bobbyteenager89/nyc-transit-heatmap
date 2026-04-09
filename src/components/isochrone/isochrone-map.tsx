"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LatLng, TransportMode, HexCell } from "@/lib/types";
import type { IsochroneContour } from "@/lib/mapbox-isochrone";
import { HEX_MODES } from "@/lib/mapbox-isochrone";
import { MODE_COLORS } from "@/lib/isochrone";
import { reverseGeocode } from "@/lib/geocode";

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
 * Build GeoJSON for the fairness zone — cells where both people can reach.
 * Includes ALL cells reachable by both (no fairnessRange filter here).
 * Visibility is controlled via GL setFilter on the slider side.
 * Colored by how "fair" the spot is: green = equal, fading as diff increases.
 */
function buildFairnessGeoJSON(
  cellsA: HexCell[],
  cellsB: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number
): GeoJSON.FeatureCollection {
  if (cellsA.length === 0 || cellsB.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  // Build lookup from h3Index to cell for Person B
  const bLookup = new Map<string, HexCell>();
  for (const cell of cellsB) {
    bLookup.set(cell.h3Index, cell);
  }

  const features: GeoJSON.Feature[] = [];

  for (const cellA of cellsA) {
    const cellB = bLookup.get(cellA.h3Index);
    if (!cellB) continue;

    // Get fastest time for each person among active modes
    let fastA = Infinity;
    let fastB = Infinity;
    for (const mode of activeModes) {
      const tA = cellA.times[mode];
      const tB = cellB.times[mode];
      if (tA !== null && tA !== undefined && tA < fastA) fastA = tA;
      if (tB !== null && tB !== undefined && tB < fastB) fastB = tB;
    }

    // Both must be reachable within maxMinutes
    if (fastA > maxMinutes || fastB > maxMinutes) continue;
    if (fastA === Infinity || fastB === Infinity) continue;

    const diff = Math.abs(fastA - fastB);

    // Ratio used for color interpolation — capped at 1 (beyond fairness range still rendered, filtered by GL)
    const ratio = Math.min(diff / 60, 1);

    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...cellA.boundary, cellA.boundary[0]]],
      },
      properties: {
        diff: Math.round(diff * 10) / 10,
        ratio,
        timeA: Math.round(fastA),
        timeB: Math.round(fastB),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * Color ramp — stepped contours in 10-min bands.
 * Each band is a flat color (no interpolation), so subway-powered "veins"
 * of faster time show up as crisp finger-shaped intrusions of the lower
 * band into the slower band around it.
 */
const COLOR_RAMP: mapboxgl.Expression = [
  "step", ["get", "time"],
  "#39ff14",          // 0-10 min — neon green
  10, "#ffd000",      // 10-20 min — golden yellow
  20, "#ff8800",      // 20-30 min — vivid amber
  30, "#ff4400",      // 30-40 min — vivid orange
  40, "#e21822",      // 40-50 min — red
  50, "#8b0000",      // 50+ min — dark red
];

export function IsochroneMap({
  center,
  cells,
  apiContours,
  activeModes,
  maxMinutes,
  onMapClick,
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

  // Initialize dark map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [center.lng, center.lat],
      zoom: 12,
      // Clamp pan/zoom strictly inside the hex grid so the grid's edges can
      // never be visible. CORE_NYC_BOUNDS is 40.56/-74.05 → 40.83/-73.78,
      // so inset by ~0.015 lat / 0.02 lng for a visible margin.
      maxBounds: [
        [-74.03, 40.58],
        [-73.80, 40.82],
      ],
      minZoom: 11,
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

      // --- Hex fill source (subway, ferry) ---
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

      // --- Overlay layers ---

      // Water mask
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

      // Street grid — rendered ON TOP of hex fill so streets cut through the color
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
        }); // no "before" — renders on top
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
        }); // no "before" — renders on top
      } catch { /* skip */ }

      // Click handler
      m.on("click", (e) => {
        const waterFeatures = m.queryRenderedFeatures(e.point, { layers: ["water-mask"] });
        if (waterFeatures.length > 0) return;
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
          walk: "Walk", bike: "Bike", subway: "Subway",
          bus: "Bus", car: "Car", ferry: "Ferry",
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

      // --- Subway station circles with MTA line colors ---
      // Loaded async so map init is not blocked. Enables line-color hover.
      fetch("/data/station-graph.json")
        .then((res) => res.json())
        .then((graph) => {
          if (!m.getCanvas()) return; // map may have been removed
          const stationFeatures: GeoJSON.Feature<GeoJSON.Point>[] = Object.values(
            graph.stations as Record<string, { name: string; lat: number; lng: number; lines: string[] }>
          ).map((s) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [s.lng, s.lat] },
            properties: {
              name: s.name,
              lines: s.lines.join(", "),
              lineColor: MTA_LINE_COLORS[s.lines[0]] ?? "#ffffff",
            },
          }));

          if (m.getSource("subway-stations")) return; // StrictMode double-run guard
          m.addSource("subway-stations", {
            type: "geojson",
            data: { type: "FeatureCollection", features: stationFeatures },
          });

          // Dim circles always visible
          m.addLayer({
            id: "subway-stations-circle",
            type: "circle",
            source: "subway-stations",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 5],
              "circle-color": ["get", "lineColor"],
              "circle-opacity": 0.5,
              "circle-stroke-width": 0.5,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-opacity": 0.2,
            },
          });

          // Hover highlight layer — empty filter until mousemove
          m.addLayer({
            id: "subway-stations-hover",
            type: "circle",
            source: "subway-stations",
            filter: ["==", ["get", "lines"], ""],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 14, 9],
              "circle-color": ["get", "lineColor"],
              "circle-opacity": 1,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-opacity": 0.9,
            },
          });

          // Hover: highlight all stations sharing the hovered station line
          m.on("mousemove", "subway-stations-circle", (e) => {
            if (!e.features?.[0]) return;
            m.getCanvas().style.cursor = "pointer";
            const props = e.features[0].properties!;
            const firstLine = (props.lines as string).split(", ")[0];
            m.setFilter("subway-stations-hover", [
              "in", firstLine, ["get", "lines"],
            ]);
            m.setPaintProperty("subway-stations-circle", "circle-opacity", [
              "case",
              ["in", firstLine, ["get", "lines"]], 1,
              0.25,
            ]);
          });

          m.on("mouseleave", "subway-stations-circle", () => {
            m.getCanvas().style.cursor = "";
            m.setFilter("subway-stations-hover", ["==", ["get", "lines"], ""]);
            m.setPaintProperty("subway-stations-circle", "circle-opacity", 0.5);
          });
        })
        .catch(() => {/* station hover is non-critical */});

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

      const start = performance.now();
      const duration = 800;
      function animate(now: number) {
        const progress = Math.max(0, Math.min((now - start) / duration, 1));
        const eased = 1 - Math.pow(1 - progress, 3);
        m!.setPaintProperty("iso-fill", "fill-opacity", eased * 0.65);
        m!.setPaintProperty("iso-outline", "line-opacity", eased * 0.3);
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

  // Load fairness data when cells/activeModes/maxMinutes change
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    const source = m.getSource("fairness-zone") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    if (friendCells.length === 0 || cells.length === 0) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const geojson = buildFairnessGeoJSON(cells, friendCells, activeModes, maxMinutes);
    source.setData(geojson);
  }, [cells, friendCells, activeModes, maxMinutes, mapReady]);

  // Filter fairness zone by fairnessRange (GL-side, no JS iteration)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    if (m.getLayer("fairness-fill")) {
      m.setFilter("fairness-fill", ["<=", ["get", "diff"], fairnessRange]);
    }
    if (m.getLayer("fairness-line")) {
      m.setFilter("fairness-line", ["<=", ["get", "diff"], fairnessRange]);
    }
  }, [fairnessRange, mapReady]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full cursor-crosshair" />
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
