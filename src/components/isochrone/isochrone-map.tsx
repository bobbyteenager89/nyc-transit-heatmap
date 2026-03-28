"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LatLng, TransportMode } from "@/lib/types";
import type { IsochroneLayer } from "@/lib/types";
import { reverseGeocode } from "@/lib/geocode";

interface IsochroneMapProps {
  center: LatLng;
  layers: IsochroneLayer[];
  activeModes: TransportMode[];
  maxMinutes: number;
  onMapClick?: (location: LatLng) => void;
}

/** Opacity decreases for outer bands. Index 0 = innermost (brightest). */
const BAND_OPACITIES = [0.55, 0.45, 0.35, 0.28, 0.2, 0.14, 0.08];

export function IsochroneMap({
  center,
  layers,
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
      // Click handler for pin drop
      m.on("click", (e) => {
        const waterFeatures = m.queryRenderedFeatures(e.point, {
          layers: m.getStyle().layers
            ?.filter((l) => l.id.includes("water"))
            .map((l) => l.id) ?? [],
        });
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
        "width:16px;height:16px;background:#e21822;border:3px solid #fcdde8;border-radius:0;box-shadow:0 0 12px rgba(226,24,34,0.6)";
      originMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(m);

      m.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 800 });
    }
  }, [center, mapReady]);

  // Render contour layers
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    // Clear previous isochrone layers and sources
    const style = m.getStyle();
    if (style?.layers) {
      for (const layer of style.layers) {
        if (layer.id.startsWith("iso-")) {
          m.removeLayer(layer.id);
        }
      }
    }
    if (style?.sources) {
      for (const sourceId of Object.keys(style.sources)) {
        if (sourceId.startsWith("iso-")) {
          m.removeSource(sourceId);
        }
      }
    }

    // Add layers: outermost band first (so inner bands render on top)
    for (const layer of layers) {
      if (!activeModes.includes(layer.mode)) continue;

      // Filter bands by current maxMinutes
      const visibleBands = layer.bands.filter((b) => b.maxMinutes <= maxMinutes);
      if (visibleBands.length === 0) continue;

      // Render bands from outermost to innermost
      const reversed = [...visibleBands].reverse();

      for (let i = 0; i < reversed.length; i++) {
        const band = reversed[i];
        const sourceId = `iso-${layer.mode}-${band.maxMinutes}`;
        const layerId = `iso-fill-${layer.mode}-${band.maxMinutes}`;

        m.addSource(sourceId, {
          type: "geojson",
          data: band.polygon,
        });

        // Outermost bands get lower opacity
        const opacityIdx = reversed.length - 1 - i;
        const opacity = BAND_OPACITIES[Math.min(opacityIdx, BAND_OPACITIES.length - 1)];

        m.addLayer({
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": layer.color,
            "fill-opacity": opacity,
          },
        });
      }
    }
  }, [layers, activeModes, maxMinutes, mapReady]);

  // Tooltip on hover over contour layers
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const handleMouseMove = async (e: mapboxgl.MapMouseEvent) => {
      const point = e.point;
      const style = m.getStyle();
      const isoLayerIds = style?.layers
        ?.filter((l) => l.id.startsWith("iso-fill-"))
        .map((l) => l.id) ?? [];

      if (isoLayerIds.length === 0) return;

      const features = m.queryRenderedFeatures(point, { layers: isoLayerIds });
      if (features.length === 0) {
        setTooltipContent(null);
        m.getCanvas().style.cursor = "";
        return;
      }

      m.getCanvas().style.cursor = "pointer";

      // Get the innermost (smallest maxMinutes) band per mode
      const modeMaxMin = new Map<string, number>();
      for (const f of features) {
        const mode = f.properties?.mode as string;
        const maxMin = f.properties?.maxMinutes as number;
        const existing = modeMaxMin.get(mode);
        if (!existing || maxMin < existing) {
          modeMaxMin.set(mode, maxMin);
        }
      }

      // Reverse geocode position
      const cacheKey = `${e.lngLat.lat.toFixed(3)},${e.lngLat.lng.toFixed(3)}`;
      let address = geocodeCache.current.get(cacheKey);
      if (!address) {
        address = await reverseGeocode(
          { lat: e.lngLat.lat, lng: e.lngLat.lng },
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
        );
        geocodeCache.current.set(cacheKey, address);
      }

      const modeLabels: Record<string, string> = {
        walk: "Walk", bike: "Bike", subway: "Subway",
        car: "Car", bikeSubway: "Bike+Sub", ferry: "Ferry",
      };

      const lines = Array.from(modeMaxMin.entries())
        .map(([mode, mins]) => `${modeLabels[mode] ?? mode}: <${mins}m`)
        .join(" · ");

      setTooltipContent(`${address}\n${lines}`);
      setTooltipPos({ x: point.x, y: point.y });
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
  }, [mapReady]);

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
