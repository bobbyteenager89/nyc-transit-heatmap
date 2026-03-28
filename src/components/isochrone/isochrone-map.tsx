"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LatLng, TransportMode, HexCell } from "@/lib/types";
import { MODE_COLORS } from "@/lib/isochrone";
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
 * Build a GeoJSON FeatureCollection of Point features from hex cells.
 * Each point has per-mode travel times as properties.
 */
function cellsToPointGeoJSON(
  cells: HexCell[],
  maxMinutes: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const cell of cells) {
    // Check if any mode has a reachable time within maxMinutes
    let hasReachable = false;
    for (const mode of MODE_LIST) {
      const t = cell.times[mode];
      if (t !== null && t !== undefined && t <= maxMinutes) {
        hasReachable = true;
        break;
      }
    }
    if (!hasReachable) continue;

    const props: Record<string, number> = {};
    for (const mode of MODE_LIST) {
      const t = cell.times[mode];
      // Weight: higher = closer/brighter. 0 = unreachable or beyond slider
      if (t !== null && t !== undefined && t <= maxMinutes) {
        props[`${mode}_weight`] = Math.max(0, maxMinutes - t) / maxMinutes;
      } else {
        props[`${mode}_weight`] = 0;
      }
      // Raw time for tooltip
      props[`${mode}_time`] = t ?? -1;
    }
    props.fastest_time = cell.compositeScore;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [cell.center.lng, cell.center.lat],
      },
      properties: props,
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
      // Add empty source for isochrone points
      m.addSource("iso-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Find the first symbol layer to insert heatmaps below labels
      const firstSymbol = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      // Add a heatmap layer per mode
      for (const mode of MODE_LIST) {
        const color = MODE_COLORS[mode];

        m.addLayer({
          id: `iso-heat-${mode}`,
          type: "heatmap",
          source: "iso-points",
          paint: {
            // Weight from pre-computed property
            "heatmap-weight": ["get", `${mode}_weight`],
            // Intensity scales with zoom
            "heatmap-intensity": [
              "interpolate", ["linear"], ["zoom"],
              10, 0.8,
              13, 1.5,
              15, 2.5,
            ],
            // Radius in pixels — larger at lower zoom
            "heatmap-radius": [
              "interpolate", ["linear"], ["zoom"],
              10, 8,
              12, 15,
              14, 25,
              16, 40,
            ],
            // Color ramp: transparent → mode color
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.1, hexToRgba(color, 0.05),
              0.3, hexToRgba(color, 0.15),
              0.5, hexToRgba(color, 0.3),
              0.7, hexToRgba(color, 0.45),
              1.0, hexToRgba(color, 0.7),
            ],
            // Opacity — slightly transparent to see map underneath
            "heatmap-opacity": 0.85,
          },
        }, firstSymbol);
      }

      // Water mask — render water on top of heatmaps to cut off glow over water
      try {
        m.addLayer({
          id: "water-mask",
          type: "fill",
          source: "composite",
          "source-layer": "water",
          paint: {
            "fill-color": "#111118", // dark-v11 water color
            "fill-opacity": 1,
          },
        }, firstSymbol);
      } catch {
        // Skip if water source unavailable
      }

      // Click handler for pin drop
      m.on("click", (e) => {
        // Block clicks on water
        const waterFeatures = m.queryRenderedFeatures(e.point, { layers: ["water-mask"] });
        if (waterFeatures.length > 0) return;
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
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
        "width:14px;height:14px;background:#ffffff;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 16px rgba(255,255,255,0.8)";
      originMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(m);

      m.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 800 });
    }
  }, [center, mapReady]);

  // Update heatmap data when cells or maxMinutes change
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const geojson = cellsToPointGeoJSON(cells, maxMinutes);
    const source = m.getSource("iso-points") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
  }, [cells, maxMinutes, mapReady]);

  // Toggle mode visibility
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    for (const mode of MODE_LIST) {
      const layerId = `iso-heat-${mode}`;
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(
          layerId,
          "visibility",
          activeModes.includes(mode) ? "visible" : "none"
        );
      }
    }
  }, [activeModes, mapReady]);

  // Tooltip on mousemove
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const handleMouseMove = async (e: mapboxgl.MapMouseEvent) => {
      // Query nearby isochrone points
      const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
        [e.point.x - 20, e.point.y - 20],
        [e.point.x + 20, e.point.y + 20],
      ];

      // Check if over water
      const waterFeatures = m.queryRenderedFeatures(e.point, { layers: ["water-mask"] });
      if (waterFeatures.length > 0) {
        setTooltipContent(null);
        m.getCanvas().style.cursor = "";
        return;
      }

      // Find any visible heatmap layers that have data near cursor
      const visibleLayers = MODE_LIST
        .filter((mode) => activeModes.includes(mode))
        .map((mode) => `iso-heat-${mode}`)
        .filter((id) => m.getLayer(id));

      if (visibleLayers.length === 0 || cells.length === 0) {
        setTooltipContent(null);
        m.getCanvas().style.cursor = "";
        return;
      }

      // Find nearest cell to cursor
      const cursorLat = e.lngLat.lat;
      const cursorLng = e.lngLat.lng;
      let nearestCell: HexCell | null = null;
      let nearestDist = Infinity;
      for (const cell of cells) {
        const dLat = cell.center.lat - cursorLat;
        const dLng = cell.center.lng - cursorLng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestCell = cell;
        }
      }

      // Only show tooltip if within ~200m
      if (!nearestCell || nearestDist > 0.00001) {
        setTooltipContent(null);
        m.getCanvas().style.cursor = "";
        return;
      }

      // Check if any active mode reaches this cell within maxMinutes
      let hasReachable = false;
      for (const mode of activeModes) {
        const t = nearestCell.times[mode];
        if (t !== null && t !== undefined && t <= maxMinutes) {
          hasReachable = true;
          break;
        }
      }
      if (!hasReachable) {
        setTooltipContent(null);
        m.getCanvas().style.cursor = "";
        return;
      }

      m.getCanvas().style.cursor = "pointer";

      // Reverse geocode
      const cacheKey = `${cursorLat.toFixed(3)},${cursorLng.toFixed(3)}`;
      let address = geocodeCache.current.get(cacheKey);
      if (!address) {
        address = await reverseGeocode(
          { lat: cursorLat, lng: cursorLng },
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
        );
        geocodeCache.current.set(cacheKey, address);
      }

      const modeLabels: Record<string, string> = {
        walk: "Walk", bike: "Bike", subway: "Subway",
        car: "Car", bikeSubway: "Bike+Sub", ferry: "Ferry",
      };

      const lines = activeModes
        .map((mode) => {
          const t = nearestCell!.times[mode];
          if (t === null || t === undefined || t > maxMinutes) return null;
          return `${modeLabels[mode] ?? mode}: ${Math.round(t)}m`;
        })
        .filter(Boolean)
        .join(" · ");

      if (lines) {
        setTooltipContent(`${address}\n${lines}`);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      }
    };

    const handleMouseLeave = () => {
      setTooltipContent(null);
      m.getCanvas().style.cursor = "";
    };

    m.on("mousemove", handleMouseMove);
    m.on("mouseout", handleMouseLeave);

    return () => {
      m.off("mousemove", handleMouseMove);
      m.off("mouseout", handleMouseLeave);
    };
  }, [mapReady, activeModes, cells, maxMinutes]);

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

/** Convert hex color + alpha to rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
