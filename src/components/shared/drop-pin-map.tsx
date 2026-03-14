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

export function DropPinMap({ onPinDrop, onCancel }: DropPinMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

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
      const lngLat = e.lngLat;
      setPin({ lat: lngLat.lat, lng: lngLat.lng });

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
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

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

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={mapContainerRef}
        className="w-full h-[250px] border-3 border-red"
        data-testid="drop-pin-map"
      />

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

      {!pin && (
        <p className="font-body text-xs text-red/50 italic">
          Click anywhere on the map to drop a pin.
        </p>
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
