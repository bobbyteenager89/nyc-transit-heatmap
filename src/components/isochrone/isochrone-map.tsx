"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LatLng, TransportMode, HexCell } from "@/lib/types";
import { reverseGeocode } from "@/lib/geocode";

interface IsochroneMapProps {
  center: LatLng;
  cells: HexCell[];
  activeModes: TransportMode[];
  maxMinutes: number;
  onMapClick?: (location: LatLng) => void;
}

const MODE_LIST: TransportMode[] = ["subway", "walk", "car", "bike", "bikeSubway", "ferry"];

/**
 * Build GeoJSON FeatureCollection of hex polygons colored by fastest travel time.
 * Only includes cells reachable within maxMinutes by at least one active mode.
 */
function cellsToFillGeoJSON(
  cells: HexCell[],
  activeModes: TransportMode[],
  maxMinutes: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const cell of cells) {
    // Find fastest time among active modes
    let fastest = Infinity;
    let fastestMode: TransportMode = "walk";
    for (const mode of activeModes) {
      const t = cell.times[mode];
      if (t !== null && t !== undefined && t < fastest) {
        fastest = t;
        fastestMode = mode;
      }
    }

    // Skip unreachable or beyond slider
    if (fastest === Infinity || fastest > maxMinutes) continue;

    // Normalized ratio: 0 = at origin, 1 = at edge of range
    const ratio = Math.min(fastest / maxMinutes, 1);

    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...cell.boundary, cell.boundary[0]]], // close the ring
      },
      properties: {
        time: Math.round(fastest * 10) / 10,
        ratio,
        fastest_mode: fastestMode,
        // Per-mode times for tooltip
        walk: cell.times.walk ?? -1,
        bike: cell.times.bike ?? -1,
        subway: cell.times.subway ?? -1,
        car: cell.times.car ?? -1,
        bikeSubway: cell.times.bikeSubway ?? -1,
        ferry: cell.times.ferry ?? -1,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

export function IsochroneMap({
  center,
  cells,
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
      // Add hex fill source
      m.addSource("iso-hexes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      const firstSymbol = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      // Hex fill layer — colored by travel time ratio
      // Warm gradient: bright green (close) → yellow → orange → red (far)
      m.addLayer({
        id: "iso-fill",
        type: "fill",
        source: "iso-hexes",
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["get", "ratio"],
            0, "#00ff87",     // bright green (right at origin)
            0.15, "#39ff14",  // neon green
            0.3, "#b8ff00",   // yellow-green
            0.45, "#ffdd00",  // warm yellow
            0.6, "#ff9500",   // orange
            0.75, "#ff4d00",  // red-orange
            0.9, "#e21822",   // red
            1.0, "#8b0000",   // dark red (edge of range)
          ],
          "fill-opacity": 0, // animated in
        },
      }, firstSymbol);

      // Water mask — covers heatmap over water with dark map water color
      try {
        m.addLayer({
          id: "water-mask",
          type: "fill",
          source: "composite",
          "source-layer": "water",
          paint: {
            "fill-color": "#111118",
            "fill-opacity": 1,
          },
        }, firstSymbol);
      } catch {
        // Skip if water source unavailable
      }

      // Click handler
      m.on("click", (e) => {
        const waterFeatures = m.queryRenderedFeatures(e.point, { layers: ["water-mask"] });
        if (waterFeatures.length > 0) return;
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // Hover tooltip
      m.on("mousemove", "iso-fill", async (e) => {
        if (!e.features?.[0]) return;
        m.getCanvas().style.cursor = "pointer";
        const props = e.features[0].properties!;

        // Reverse geocode
        const geom = e.features[0].geometry as GeoJSON.Polygon;
        const coords = geom.coordinates[0];
        const cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        const cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const cacheKey = `${cy.toFixed(3)},${cx.toFixed(3)}`;
        let address = geocodeCache.current.get(cacheKey);
        if (!address) {
          address = await reverseGeocode(
            { lat: cy, lng: cx },
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
          );
          geocodeCache.current.set(cacheKey, address);
        }

        // Build mode lines
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
            const val = Math.round(t);
            return isFastest ? `**${label}: ${val}m**` : `${label}: ${val}m`;
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

  // Update hex data
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const geojson = cellsToFillGeoJSON(cells, activeModes, maxMinutes);
    const source = m.getSource("iso-hexes") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }

    // Animate reveal on new compute (cell count changed)
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
        m!.setPaintProperty("iso-fill", "fill-opacity", eased * 0.8);
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

      {/* Tooltip */}
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
