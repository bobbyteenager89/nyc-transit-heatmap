"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { CompositeGridPoint, GridPoint, LatLng, Destination, BoundingBox, DestinationCategory } from "@/lib/types";
import { reverseGeocode } from "@/lib/geocode";

interface MapViewProps {
  origin: LatLng;
  destinations: Destination[];
  grid: CompositeGridPoint[] | GridPoint[];
  bounds: BoundingBox;
  hasDestinations: boolean;
  pinDropMode?: boolean;
  onMapClick?: (location: LatLng) => void;
  pendingPin?: LatLng | null;
  onPinConfirm?: (name: string, category: DestinationCategory) => void;
  onPinCancel?: () => void;
}

// Accessibility mode (no destinations): time-based coloring
// Tighter scale (5-40 min) so subway proximity clearly stands out
function timeToColor(minutes: number): string {
  const t = Math.min(Math.max(minutes, 5), 40);
  const ratio = (t - 5) / 35;
  if (ratio < 0.35) {
    const r = Math.round((ratio / 0.35) * 255);
    return `rgba(${r}, 200, 50, 0.7)`;
  } else {
    const g = Math.round((1 - (ratio - 0.35) / 0.65) * 200);
    return `rgba(230, ${g}, 30, 0.7)`;
  }
}

// Score mode (with destinations): hours/month coloring
// 5 hrs/mo (green) → 25 hrs/mo (yellow) → 50+ hrs/mo (red)
function hoursToColor(monthlyMinutes: number): string {
  const hours = monthlyMinutes / 60;
  const t = Math.min(Math.max(hours, 5), 50);
  const ratio = (t - 5) / 45;
  if (ratio < 0.4) {
    const r = Math.round((ratio / 0.4) * 255);
    return `rgba(${r}, 200, 50, 0.7)`;
  } else {
    const g = Math.round((1 - (ratio - 0.4) / 0.6) * 200);
    return `rgba(230, ${g}, 30, 0.7)`;
  }
}

function buildGeoJSON(grid: (CompositeGridPoint | GridPoint)[], hasDestinations: boolean) {
  const isScoreMode = hasDestinations && grid.length > 0 && "compositeScore" in (grid[0] || {});

  const features = grid.map((p) => {
    const isComposite = "compositeScore" in p;
    const score = isComposite
      ? (p as CompositeGridPoint).compositeScore
      : Math.min(...Object.values(p.times).filter((t): t is number => t !== null)) || 60;

    const color = (isScoreMode && isComposite)
      ? hoursToColor(score)
      : timeToColor(score);

    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      properties: {
        score,
        color,
        ...p.times,
        fastest: p.fastest,
      },
    };
  });

  return { type: "FeatureCollection" as const, features, isScoreMode };
}

const PIN_DROP_CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "social", label: "Social" },
  { key: "work", label: "Work" },
  { key: "fitness", label: "Fitness" },
  { key: "errands", label: "Errands" },
  { key: "other", label: "Other" },
];

export function MapView({
  origin, destinations, grid, bounds, hasDestinations,
  pinDropMode, onMapClick, pendingPin, onPinConfirm, onPinCancel,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const isScoreModeRef = useRef(false);

  // Pin drop form state
  const [pinName, setPinName] = useState("");
  const [pinCategory, setPinCategory] = useState<DestinationCategory>("social");

  // Initialize map ONCE
  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [origin.lng, origin.lat],
      zoom: 11.5,
    });

    mapRef.current = m;

    m.on("load", () => {
      // Add empty source + layer for grid
      m.addSource("heatmap-grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Find the first symbol layer to insert circles below labels
      const firstSymbol = m.getStyle().layers?.find(l => l.type === "symbol")?.id;

      m.addLayer({
        id: "heatmap-circles",
        type: "circle",
        source: "heatmap-grid",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 6,
            12, 12,
            14, 24,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.85,
        },
      }, firstSymbol);

      // Water overlay mask: hides circles over rivers/ocean
      try {
        m.addLayer({
          id: "water-mask",
          type: "fill",
          source: "composite",
          "source-layer": "water",
          paint: {
            "fill-color": "#d4dadc",
            "fill-opacity": 1,
          },
        });
      } catch {
        // Silently skip if water source unavailable
      }

      // Click handler for pin drop (uses ref to get latest callback)
      m.on("click", (e) => {
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

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

        const scoreInfo = (isScoreModeRef.current && props.score < 999)
          ? `\n${(props.score / 60).toFixed(1)} hrs/month transit`
          : "";

        setTooltipContent(`${address}\n${lines}${scoreInfo}`);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "heatmap-circles", () => {
        setTooltipContent(null);
      });

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      m.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.lat, origin.lng]);

  // Update grid data without rebuilding map
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const { features, isScoreMode } = buildGeoJSON(grid, hasDestinations);
    isScoreModeRef.current = isScoreMode;

    const source = m.getSource("heatmap-grid") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({ type: "FeatureCollection", features });
    }
  }, [grid, hasDestinations, mapReady]);

  // Update destination markers without rebuilding map
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    // Remove old destination markers
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    // Add new markers
    for (const dest of destinations) {
      const el = document.createElement("div");
      const label = document.createElement("div");
      label.style.cssText = "background:#e21822;color:#fcdde8;padding:2px 6px;font-size:11px;font-weight:bold;font-family:Arial Black;font-style:italic;text-transform:uppercase;white-space:nowrap";
      label.textContent = dest.name;
      el.appendChild(label);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([dest.location.lng, dest.location.lat])
        .addTo(m);
      markersRef.current.push(marker);
    }
  }, [destinations]);

  return (
    <div className="relative flex-1 h-full">
      <div
        ref={mapContainer}
        className={`w-full h-full ${pinDropMode ? "cursor-crosshair" : ""}`}
      />

      {/* Pin drop mode indicator */}
      {pinDropMode && (
        <div role="status" aria-live="polite" className="absolute top-4 left-1/2 -translate-x-1/2 bg-red text-pink px-4 py-2 z-20 font-display italic uppercase text-sm">
          Click anywhere on the map to drop a pin
        </div>
      )}

      {/* Pending pin form */}
      {pendingPin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-pink border-3 border-red p-4 z-30 w-72">
          <p className="text-xs uppercase font-bold tracking-widest mb-3">Name This Pin</p>
          <input
            type="text"
            value={pinName}
            onChange={(e) => setPinName(e.target.value)}
            placeholder="e.g. Jake's place…"
            autoFocus
            name="pin-name"
            autoComplete="off"
            className="w-full bg-transparent border-3 border-red text-red p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-red placeholder:text-red/50 focus:bg-red focus:text-pink mb-3"
            onKeyDown={(e) => {
              if (e.key === "Enter" && pinName.trim()) {
                onPinConfirm?.(pinName.trim(), pinCategory);
                setPinName("");
              }
            }}
          />
          <div className="flex gap-1 flex-wrap mb-3">
            {PIN_DROP_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setPinCategory(c.key)}
                className={`text-xs border-2 border-red px-2 py-1 uppercase font-bold cursor-pointer ${
                  pinCategory === c.key ? "bg-red text-pink" : ""
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (pinName.trim()) {
                  onPinConfirm?.(pinName.trim(), pinCategory);
                  setPinName("");
                }
              }}
              disabled={!pinName.trim()}
              className="flex-1 border-3 border-red bg-red text-pink font-display italic uppercase py-2 disabled:opacity-30 cursor-pointer text-sm"
            >
              Add
            </button>
            <button
              onClick={() => {
                onPinCancel?.();
                setPinName("");
              }}
              className="border-3 border-red px-3 py-2 font-display italic uppercase cursor-pointer text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-pink border-3 border-red p-3 z-10">
        <div className="text-xs uppercase font-bold tracking-widest mb-2">
          {hasDestinations ? "Monthly Transit Hours" : "Travel Time"}
        </div>
        <div className="w-24 h-3" role="img" aria-label={hasDestinations ? "Color scale: green is 5 hours, yellow is 25 hours, red is 50+ hours per month" : "Color scale: green is 5 minutes, yellow is 17 minutes, red is 40+ minutes"} style={{
          background: "linear-gradient(90deg, rgb(0,200,50), rgb(255,200,50), rgb(230,30,30))"
        }} />
        <div className="flex justify-between text-xs mt-1">
          {hasDestinations ? (
            <><span>5h</span><span>25h</span><span>50h+</span></>
          ) : (
            <><span>5m</span><span>17m</span><span>40m+</span></>
          )}
        </div>
      </div>
    </div>
  );
}
