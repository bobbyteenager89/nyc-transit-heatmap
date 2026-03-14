"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { reverseGeocodeNeighborhood } from "@/lib/geocode";
import type { LatLng } from "@/lib/types";

interface DropPinMapProps {
  onPinDrop: (location: LatLng, displayName: string) => void;
  onCancel: () => void;
}

const NYC_CENTER: [number, number] = [-73.98, 40.75];
const NYC_BOUNDS: [[number, number], [number, number]] = [
  [-74.3, 40.47],
  [-73.6, 40.95],
];

const ARROW_PAN_DEGREES = 0.002; // ~200m per keypress

export function DropPinMap({ onPinDrop, onCancel }: DropPinMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

  const placePin = useCallback((lat: number, lng: number) => {
    const lngLat = new mapboxgl.LngLat(lng, lat);
    setPin({ lat, lng });

    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
    } else {
      const el = document.createElement("div");
      el.className = "drop-pin-marker";
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.backgroundColor = "#e21822";
      el.style.border = "3px solid #e21822";
      el.style.outline = "3px solid #fcdde8";
      el.style.cursor = "pointer";

      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: NYC_CENTER,
      zoom: 11,
      maxBounds: NYC_BOUNDS,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("click", (e) => {
      placePin(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [token, placePin]);

  // Reverse geocode when pin changes
  useEffect(() => {
    if (!pin) return;

    let cancelled = false;
    setLoading(true);
    setNeighborhood(null);

    reverseGeocodeNeighborhood(pin, token).then((name) => {
      if (!cancelled) {
        setNeighborhood(name);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pin, token]);

  const handleConfirm = useCallback(() => {
    if (!pin) return;
    const displayName = neighborhood || `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`;
    onPinDrop(pin, displayName);
  }, [pin, neighborhood, onPinDrop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const map = mapRef.current;
      if (!map) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setKeyboardActive(true);
      }

      const center = map.getCenter();

      switch (e.key) {
        case "ArrowUp":
          map.panTo([center.lng, center.lat + ARROW_PAN_DEGREES], { duration: 100 });
          break;
        case "ArrowDown":
          map.panTo([center.lng, center.lat - ARROW_PAN_DEGREES], { duration: 100 });
          break;
        case "ArrowLeft":
          map.panTo([center.lng - ARROW_PAN_DEGREES, center.lat], { duration: 100 });
          break;
        case "ArrowRight":
          map.panTo([center.lng + ARROW_PAN_DEGREES, center.lat], { duration: 100 });
          break;
        case "Enter":
        case " ":
          placePin(center.lat, center.lng);
          break;
      }
    },
    [placePin]
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={mapContainerRef}
        tabIndex={0}
        role="application"
        aria-label="Map for dropping a pin. Use arrow keys to navigate, Enter or Space to place pin."
        onKeyDown={handleKeyDown}
        onFocus={() => setKeyboardActive(true)}
        onBlur={() => setKeyboardActive(false)}
        className="w-full h-[250px] border-3 border-red cursor-crosshair relative focus:outline-2 focus:outline-red focus:outline-offset-2"
        data-testid="drop-pin-map"
      >
        {/* Keyboard crosshair overlay */}
        {keyboardActive && !pin && (
          <div
            className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="relative w-8 h-8">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] h-full bg-red/70" />
              <div className="absolute top-1/2 left-0 -translate-y-1/2 h-[3px] w-full bg-red/70" />
            </div>
          </div>
        )}
      </div>

      {!pin && (
        <p className="font-body text-xs text-red/50 italic">
          {keyboardActive
            ? "Use arrow keys to move, Enter to place pin."
            : "Click the map or press Tab to use keyboard navigation."}
        </p>
      )}

      {pin && (
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm" data-testid="pin-location-label">
            {loading ? (
              <span className="text-red/50 italic">Finding neighborhood...</span>
            ) : (
              <>
                <span className="font-bold uppercase text-xs tracking-widest text-red/60">
                  Pinned:{" "}
                </span>
                {neighborhood}
              </>
            )}
          </p>
          <button
            onClick={handleConfirm}
            disabled={loading}
            data-testid="confirm-pin-button"
            className="w-full py-3 font-display italic uppercase bg-red text-pink border-3 border-red hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add This Location
          </button>
        </div>
      )}

      <button
        onClick={onCancel}
        data-testid="cancel-pin-button"
        className="w-full py-2 font-body text-sm uppercase tracking-widest text-red/60 hover:text-red transition-colors cursor-pointer"
      >
        Back to address search
      </button>
    </div>
  );
}
