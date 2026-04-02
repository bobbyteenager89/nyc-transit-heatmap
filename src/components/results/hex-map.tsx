"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { HexCell, LatLng, Destination, DestinationCategory } from "@/lib/types";
import { hexCellToGeoJSON } from "@/lib/hex";
import { reverseGeocode } from "@/lib/geocode";

interface HexMapProps {
  center: LatLng;
  cells: HexCell[];
  destinations: Destination[];
  hasDestinations: boolean;
  pinDropMode?: boolean;
  onMapClick?: (location: LatLng) => void;
  pendingPin?: LatLng | null;
  onPinConfirm?: (name: string, category: DestinationCategory) => void;
  onPinCancel?: () => void;
}

const PIN_DROP_CATEGORIES: { key: DestinationCategory; label: string }[] = [
  { key: "social", label: "Social" },
  { key: "work", label: "Work" },
  { key: "fitness", label: "Fitness" },
  { key: "errands", label: "Errands" },
  { key: "other", label: "Other" },
];

export function HexMap({
  center, cells, destinations, hasDestinations,
  pinDropMode, onMapClick, pendingPin, onPinConfirm, onPinCancel,
}: HexMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const pinDropModeRef = useRef(pinDropMode);
  pinDropModeRef.current = pinDropMode;

  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const geocodeCache = useRef<Map<string, string>>(new Map());

  const [pinName, setPinName] = useState("");
  const [pinCategory, setPinCategory] = useState<DestinationCategory>("social");

  // Animation state
  const animationRef = useRef<number>(0);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [center.lng, center.lat],
      zoom: 11.5,
    });
    mapRef.current = m;

    m.on("load", () => {
      // Hex fill source
      m.addSource("hex-grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      const firstSymbol = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      // Hex fill layer (below labels)
      m.addLayer({
        id: "hex-fill",
        type: "fill",
        source: "hex-grid",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0, // starts at 0 for animation
        },
      }, firstSymbol);

      // Hex outline
      m.addLayer({
        id: "hex-outline",
        type: "line",
        source: "hex-grid",
        paint: {
          "line-color": "#fcdde8",
          "line-width": 0.5,
          "line-opacity": 0,
        },
      }, firstSymbol);

      // Water mask
      try {
        m.addLayer({
          id: "water-mask",
          type: "fill",
          source: "composite",
          "source-layer": "water",
          paint: { "fill-color": "#d4dadc", "fill-opacity": 1 },
        }, firstSymbol);
      } catch {
        // Skip if water source unavailable
      }

      // Click handler for pin drop
      m.on("click", (e) => {
        // Check if click is on water
        const waterFeatures = m.queryRenderedFeatures(e.point, { layers: ["water-mask"] });
        if (waterFeatures.length > 0) {
          // On water — don't allow pin drop
          return;
        }
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // Hover tooltip
      m.on("mousemove", "hex-fill", async (e) => {
        if (!e.features?.[0]) return;
        if (!pinDropModeRef.current) {
          m.getCanvas().style.cursor = "pointer";
        }
        const props = e.features[0].properties!;

        // Reverse geocode hex center
        const geom = e.features[0].geometry as GeoJSON.Polygon;
        const centerCoord = geom.coordinates[0].reduce(
          (acc, c) => [acc[0] + c[0] / geom.coordinates[0].length, acc[1] + c[1] / geom.coordinates[0].length],
          [0, 0]
        );
        const cacheKey = `${centerCoord[1].toFixed(3)},${centerCoord[0].toFixed(3)}`;
        let address = geocodeCache.current.get(cacheKey);
        if (!address) {
          address = await reverseGeocode(
            { lat: centerCoord[1], lng: centerCoord[0] },
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
          );
          geocodeCache.current.set(cacheKey, address);
        }

        // Build tooltip lines
        const modes = ["subway", "car", "bike", "walk", "ferry"];
        const modeLines = modes
          .filter((mode) => props[mode] !== null && props[mode] !== undefined)
          .map((mode) => {
            const label = mode.charAt(0).toUpperCase() + mode.slice(1);
            const val = Math.round(props[mode]);
            const isFastest = mode === props.fastest;
            return isFastest ? `**${label}: ${val}m**` : `${label}: ${val}m`;
          })
          .join(" \u00b7 ");

        // Per-destination breakdown
        let breakdownLines = "";
        if (props.destBreakdown && props.destBreakdown !== "{}") {
          try {
            const breakdown = JSON.parse(props.destBreakdown) as Record<string, number>;
            const entries = Object.entries(breakdown);
            if (entries.length > 0) {
              const hours = props.compositeScore / 60;
              breakdownLines = `\n${hours.toFixed(1)} hrs/mo total`;
            }
          } catch {
            // ignore
          }
        }

        setTooltipContent(`${address}\n${modeLines}${breakdownLines}`);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      m.on("mouseleave", "hex-fill", () => {
        if (!pinDropModeRef.current) {
          m.getCanvas().style.cursor = "";
        }
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
  }, [center.lat, center.lng]);

  // Update hex data with animated reveal
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const geojson = hexCellToGeoJSON(cells, hasDestinations);
    const source = m.getSource("hex-grid") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);

      // Animated reveal: fade in over 500ms
      cancelAnimationFrame(animationRef.current);
      const start = performance.now();
      const duration = 500;

      function animate(now: number) {
        const progress = Math.max(0, Math.min((now - start) / duration, 1));
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        m!.setPaintProperty("hex-fill", "fill-opacity", eased * 0.85);
        m!.setPaintProperty("hex-outline", "line-opacity", eased * 0.4);
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [cells, hasDestinations, mapReady]);

  // Destination markers
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

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
            placeholder="e.g. Jake's place\u2026"
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
              onClick={() => { onPinCancel?.(); setPinName(""); }}
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
        <div
          className="w-24 h-3"
          role="img"
          aria-label={hasDestinations ? "Color scale: green is 5 hours, yellow is 25 hours, red is 50+ hours per month" : "Color scale: green is 5 minutes, yellow is 17 minutes, red is 40+ minutes"}
          style={{ background: "linear-gradient(90deg, rgb(0,200,50), rgb(255,200,50), rgb(230,30,30))" }}
        />
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
