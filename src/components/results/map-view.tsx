"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { CompositeGridPoint, GridPoint, LatLng, Destination, BoundingBox } from "@/lib/types";
import { reverseGeocode } from "@/lib/geocode";

interface MapViewProps {
  origin: LatLng;
  destinations: Destination[];
  grid: CompositeGridPoint[] | GridPoint[];
  bounds: BoundingBox;
  onBoundsChange?: (bounds: BoundingBox) => void;
}

function timeToColor(minutes: number): string {
  const t = Math.min(Math.max(minutes, 10), 60);
  const ratio = (t - 10) / 50;
  if (ratio < 0.5) {
    const r = Math.round(ratio * 2 * 255);
    return `rgba(${r}, 200, 50, 0.5)`;
  } else {
    const g = Math.round((1 - (ratio - 0.5) * 2) * 200);
    return `rgba(230, ${g}, 30, 0.5)`;
  }
}

export function MapView({ origin, destinations, grid, bounds, onBoundsChange }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const geocodeCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [origin.lng, origin.lat],
      zoom: 12,
    });

    map.current = m;

    m.on("load", () => {
      const features = grid.map((p) => {
        const score = "compositeScore" in p
          ? (p as CompositeGridPoint).compositeScore
          : Math.min(...Object.values(p.times).filter((t): t is number => t !== null)) || 60;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
          properties: {
            score,
            color: timeToColor(score as number),
            ...p.times,
            fastest: p.fastest,
          },
        };
      });

      m.addSource("heatmap-grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      m.addLayer({
        id: "heatmap-circles",
        type: "circle",
        source: "heatmap-grid",
        paint: {
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.6,
        },
      });

      // Origin marker
      new mapboxgl.Marker({ color: "#e21822" })
        .setLngLat([origin.lng, origin.lat])
        .addTo(m);

      // Destination markers
      for (const dest of destinations) {
        const el = document.createElement("div");
        el.innerHTML = `<div style="background:#e21822;color:#fcdde8;padding:2px 6px;font-size:11px;font-weight:bold;font-family:Arial Black;font-style:italic;text-transform:uppercase;white-space:nowrap">${dest.name}</div>`;
        new mapboxgl.Marker({ element: el })
          .setLngLat([dest.location.lng, dest.location.lat])
          .addTo(m);
      }

      // Hover tooltip
      m.on("mousemove", "heatmap-circles", async (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const coords = (e.features[0].geometry as { type: string; coordinates: number[] }).coordinates;

        const cacheKey = `${coords[1].toFixed(4)},${coords[0].toFixed(4)}`;
        let address = geocodeCache.current.get(cacheKey);
        if (!address) {
          address = await reverseGeocode(
            { lat: coords[1], lng: coords[0] },
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
          );
          geocodeCache.current.set(cacheKey, address);
        }

        const modes = ["subway", "car", "bike", "bikeSubway", "walk"];
        const lines = modes
          .filter((mode) => props[mode] !== null && props[mode] !== undefined)
          .map((mode) => {
            const label = mode === "bikeSubway" ? "Bike+Sub" : mode.charAt(0).toUpperCase() + mode.slice(1);
            const val = Math.round(props[mode]);
            const isFastest = mode === props.fastest;
            return isFastest ? `**${label}: ${val}m**` : `${label}: ${val}m`;
          })
          .join(" · ");

        setTooltipContent(`${address}\n${lines}`);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "heatmap-circles", () => {
        setTooltipContent(null);
      });
    });

    return () => m.remove();
  }, [origin, destinations, grid]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full" />
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

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-pink border-3 border-red p-3 z-10">
        <div className="text-xs uppercase font-bold tracking-widest mb-2">Travel Time</div>
        <div className="w-24 h-3" style={{
          background: "linear-gradient(90deg, rgb(0,200,50), rgb(255,200,50), rgb(230,30,30))"
        }} />
        <div className="flex justify-between text-xs mt-1">
          <span>10m</span><span>35m</span><span>60m+</span>
        </div>
      </div>
    </div>
  );
}
