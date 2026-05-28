"use client";

import { useEffect, useState } from "react";
import { SubwayData } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadFerryData } from "@/lib/ferry";
import type { FerryData, FerryAdjacency } from "@/lib/ferry";
import { loadBusData } from "@/lib/bus";
import type { BusData } from "@/lib/bus";
import type { StationGraph, StationMatrix } from "@/lib/types";

export interface TransitData {
  stationGraph: StationGraph | null;
  stationMatrix: StationMatrix | null;
  subwayData: SubwayData | null;
  citiBikeData: CitiBikeData | null;
  ferryData: { data: FerryData; adjacency: FerryAdjacency } | null;
  busData: BusData | null;
  dataReady: boolean;
}

/**
 * Loads all transit datasets (station graph + matrix, Citi Bike, ferry, bus)
 * once on mount. Citi Bike is fetched live; others come from /data/*.json.
 * `dataReady` flips true after every load settles — failures don't block it.
 */
export function useTransitData(): TransitData {
  const [stationGraph, setStationGraph] = useState<StationGraph | null>(null);
  const [stationMatrix, setStationMatrix] = useState<StationMatrix | null>(null);
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [citiBikeData, setCitiBikeData] = useState<CitiBikeData | null>(null);
  const [ferryData, setFerryData] = useState<{
    data: FerryData;
    adjacency: FerryAdjacency;
  } | null>(null);
  const [busData, setBusData] = useState<BusData | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes, citiRes, ferryRes, busRes] = await Promise.all([
          fetch("/data/station-graph.json").then((r) => r.json() as Promise<StationGraph>),
          fetch("/data/station-matrix.json").then((r) => r.json() as Promise<StationMatrix>),
          CitiBikeData.fetch().catch((err) => {
            console.warn("Citi Bike data unavailable:", err);
            return null;
          }),
          loadFerryData(),
          loadBusData(),
        ]);
        setStationGraph(graphRes);
        setStationMatrix(matrixRes);
        setSubwayData(new SubwayData(graphRes, matrixRes));
        if (citiRes) setCitiBikeData(citiRes);
        setFerryData(ferryRes);
        setBusData(busRes);
        setDataReady(true);
      } catch (err) {
        console.error("Failed to load transit data:", err);
        setDataReady(true);
      }
    }
    load();
  }, []);

  return {
    stationGraph,
    stationMatrix,
    subwayData,
    citiBikeData,
    ferryData,
    busData,
    dataReady,
  };
}
