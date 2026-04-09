"use client";

import { useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { MTA_LINE_COLORS } from "@/components/isochrone/isochrone-map";

/**
 * Loads the station graph and renders every subway station as a dim MTA-
 * colored dot with a single-station hover highlight. Runs once after the
 * map is ready. Idempotent — re-mount or StrictMode double-run is safe
 * because we bail if the source already exists.
 *
 * Stations render on top of street/neighborhood overlays because the fetch
 * resolves after the sync layer adds.
 */
export function useSubwayStations(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  mapReady: boolean
) {
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    let cancelled = false;

    fetch("/data/station-graph.json")
      .then((res) => res.json())
      .then((graph) => {
        if (cancelled || !m.getCanvas()) return;
        if (m.getSource("subway-stations")) return;

        const stationFeatures: GeoJSON.Feature<GeoJSON.Point>[] = Object.values(
          graph.stations as Record<
            string,
            { name: string; lat: number; lng: number; lines: string[] }
          >
        ).map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lng, s.lat] },
          properties: {
            name: s.name,
            lines: s.lines.join(", "),
            lineColor: MTA_LINE_COLORS[s.lines[0]] ?? "#ffffff",
          },
        }));

        m.addSource("subway-stations", {
          type: "geojson",
          data: { type: "FeatureCollection", features: stationFeatures },
        });

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

        m.addLayer({
          id: "subway-stations-hover",
          type: "circle",
          source: "subway-stations",
          filter: ["==", ["get", "name"], ""],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 14, 9],
            "circle-color": ["get", "lineColor"],
            "circle-opacity": 1,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.9,
          },
        });

        m.on("mousemove", "subway-stations-circle", (e) => {
          if (!e.features?.[0]) return;
          m.getCanvas().style.cursor = "pointer";
          const hoveredName = e.features[0].properties!.name as string;
          m.setFilter("subway-stations-hover", ["==", ["get", "name"], hoveredName]);
        });

        m.on("mouseleave", "subway-stations-circle", () => {
          m.getCanvas().style.cursor = "";
          m.setFilter("subway-stations-hover", ["==", ["get", "name"], ""]);
        });
      })
      .catch(() => {
        /* station hover is non-critical */
      });

    return () => {
      cancelled = true;
    };
  }, [mapRef, mapReady]);
}
