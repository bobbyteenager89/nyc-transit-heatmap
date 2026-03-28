"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LatLng, TransportMode, HexCell } from "@/lib/types";
import type { IsochroneContour } from "@/lib/mapbox-isochrone";
import { HEX_MODES } from "@/lib/mapbox-isochrone";
import { MODE_COLORS } from "@/lib/isochrone";
import { reverseGeocode } from "@/lib/geocode";

interface IsochroneMapProps {
  center: LatLng;
  cells: HexCell[];
  apiContours: IsochroneContour[];
  activeModes: TransportMode[];
  maxMinutes: number;
  onMapClick?: (location: LatLng) => void;
}

/**
 * Build hex fill GeoJSON for transit modes only (subway, ferry, bikeSubway).
 * Walk/bike/car use API polygons instead.
 */
function cellsToHexGeoJSON(
  cells: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number
): GeoJSON.FeatureCollection {
  const hexModes = activeModes.filter((m) => HEX_MODES.includes(m));
  if (hexModes.length === 0) return { type: "FeatureCollection", features: [] };

  const features: GeoJSON.Feature[] = [];
  for (const cell of cells) {
    let fastest = Infinity;
    let fastestMode: TransportMode = "subway";
    for (const mode of hexModes) {
      const t = cell.times[mode];
      if (t !== null && t !== undefined && t < fastest) {
        fastest = t;
        fastestMode = mode;
      }
    }
    if (fastest === Infinity || fastest > maxMinutes) continue;

    const ratio = Math.min(fastest / maxMinutes, 1);
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...cell.boundary, cell.boundary[0]]],
      },
      properties: {
        time: Math.round(fastest * 10) / 10,
        ratio,
        fastest_mode: fastestMode,
        subway: cell.times.subway ?? -1,
        bikeSubway: cell.times.bikeSubway ?? -1,
        ferry: cell.times.ferry ?? -1,
        walk: cell.times.walk ?? -1,
        bike: cell.times.bike ?? -1,
        car: cell.times.car ?? -1,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Color ramp expression for hex fill */
const COLOR_RAMP: mapboxgl.Expression = [
  "interpolate", ["linear"], ["get", "ratio"],
  0, "#00ff87",
  0.15, "#39ff14",
  0.3, "#b8ff00",
  0.45, "#ffdd00",
  0.6, "#ff9500",
  0.75, "#ff4d00",
  0.9, "#e21822",
  1.0, "#8b0000",
];

export function IsochroneMap({
  center,
  cells,
  apiContours,
  activeModes,
  maxMinutes,
  onMapClick,
}: IsochroneMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animationRef = useRef<number>(0);
  const prevCellCountRef = useRef(0);

  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
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

      // --- Hex fill source (subway, ferry, bikeSubway) ---
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

      // Street grid
      try {
        m.addLayer({
          id: "street-overlay",
          type: "line",
          source: "composite",
          "source-layer": "road",
          filter: ["in", "class", "street", "primary", "secondary", "tertiary", "motorway", "trunk"],
          paint: {
            "line-color": "rgba(255,255,255,0.12)",
            "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 13, 0.8, 16, 1.5],
          },
        }, firstSymbol);
      } catch { /* skip */ }

      // Neighborhood lines
      try {
        m.addLayer({
          id: "neighborhood-lines",
          type: "line",
          source: "composite",
          "source-layer": "admin",
          filter: [">=", "admin_level", 2],
          paint: { "line-color": "rgba(255,255,255,0.2)", "line-width": 1, "line-dasharray": [3, 2] },
        }, firstSymbol);
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
          car: "Car", bikeSubway: "Bike+Sub", ferry: "Ferry",
        };
        const lines = activeModes
          .map((mode) => {
            const t = props[mode] as number;
            if (t < 0 || t > maxMinutes) return null;
            const isFastest = mode === props.fastest_mode;
            const label = modeLabels[mode] ?? mode;
            return isFastest ? `**${label}: ${Math.round(t)}m**` : `${label}: ${Math.round(t)}m`;
          })
          .filter(Boolean)
          .join(" · ");

        setTooltipContent(`${address}\n${lines}`);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "iso-fill", () => {
        m.getCanvas().style.cursor = "";
        setTooltipContent(null);
      });

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      cancelAnimationFrame(animationRef.current);
      originMarkerRef.current?.remove();
      m.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update origin marker
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    originMarkerRef.current?.remove();
    if (center) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;background:#ffffff;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 20px rgba(255,255,255,0.9),0 0 40px rgba(255,255,255,0.4)";
      originMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(m);
      m.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 800 });
    }
  }, [center, mapReady]);

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
        .filter((c) => c.mode === mode && c.minutes <= maxMinutes)
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
  }, [apiContours, activeModes, maxMinutes, mapReady]);

  // Update hex data (subway, ferry, bikeSubway)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const geojson = cellsToHexGeoJSON(cells, activeModes, maxMinutes);
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

      const start = performance.now();
      const duration = 800;
      function animate(now: number) {
        const progress = Math.max(0, Math.min((now - start) / duration, 1));
        const eased = 1 - Math.pow(1 - progress, 3);
        m!.setPaintProperty("iso-fill", "fill-opacity", eased * 0.55);
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [cells, activeModes, maxMinutes, mapReady]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full cursor-crosshair" />
      {tooltipContent && (
        <div
          className="absolute pointer-events-none bg-red text-pink p-2 text-xs font-body z-50 max-w-xs"
          style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 16 }}
        >
          {tooltipContent.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
