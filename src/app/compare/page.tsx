"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SubwayData, computeSubwayTime } from "@/lib/subway";
import { CitiBikeData } from "@/lib/citibike";
import { loadBusData } from "@/lib/bus";
import type { BusStop } from "@/lib/bus";
import {
  NYC_NEIGHBORHOODS,
  LANDMARKS,
  slugify,
  findBySlug,
} from "@/lib/neighborhoods";
import type { Neighborhood } from "@/lib/neighborhoods";
import type { StationGraph, StationMatrix, LatLng } from "@/lib/types";
import { manhattanDistanceMi } from "@/lib/travel-time";
import { WALK_SPEED } from "@/lib/constants";

/* ---------- stat computation helpers ---------- */

interface NeighborhoodStats {
  neighborhood: Neighborhood;
  avgCommute: number | null; // minutes
  subwayLines: string[];
  bikeDocks: number;
  busStops: number;
  nearestSubwayWalk: number | null; // minutes
}

function computeAvgCommute(
  subway: SubwayData,
  center: LatLng
): number | null {
  const times = LANDMARKS.map((lm) =>
    computeSubwayTime(subway, center, { lat: lm.lat, lng: lm.lng })
  ).filter((t): t is number => t !== null);
  if (times.length === 0) return null;
  return times.reduce((s, t) => s + t, 0) / times.length;
}

function getNearbySubwayLines(
  center: LatLng,
  stationGraph: StationGraph
): string[] {
  const lines = new Set<string>();
  for (const station of Object.values(stationGraph.stations)) {
    const dist = manhattanDistanceMi(center, {
      lat: station.lat,
      lng: station.lng,
    });
    if (dist <= 0.5) {
      for (const line of station.lines) lines.add(line);
    }
  }
  return Array.from(lines).sort();
}

function getNearestSubwayWalk(
  center: LatLng,
  stationGraph: StationGraph
): number | null {
  let bestDist = Infinity;
  for (const station of Object.values(stationGraph.stations)) {
    const dist = manhattanDistanceMi(center, {
      lat: station.lat,
      lng: station.lng,
    });
    if (dist < bestDist) bestDist = dist;
  }
  if (bestDist === Infinity) return null;
  return (bestDist / WALK_SPEED) * 60;
}

function countNearbyBikeDocks(
  center: LatLng,
  citiBike: CitiBikeData
): number {
  return citiBike
    .getAllStations()
    .filter(
      (s) => manhattanDistanceMi(center, { lat: s.lat, lng: s.lng }) <= 0.5
    ).length;
}

function countNearbyBusStops(
  center: LatLng,
  busStops: BusStop[]
): number {
  return busStops.filter(
    (s) => manhattanDistanceMi(center, { lat: s.lat, lng: s.lng }) <= 0.3
  ).length;
}

function computeStats(
  hood: Neighborhood,
  subway: SubwayData,
  graph: StationGraph,
  citiBike: CitiBikeData,
  busStops: BusStop[]
): NeighborhoodStats {
  return {
    neighborhood: hood,
    avgCommute: computeAvgCommute(subway, hood.center),
    subwayLines: getNearbySubwayLines(hood.center, graph),
    bikeDocks: countNearbyBikeDocks(hood.center, citiBike),
    busStops: countNearbyBusStops(hood.center, busStops),
    nearestSubwayWalk: getNearestSubwayWalk(hood.center, graph),
  };
}

/* ---------- winner detection ---------- */

function pickWinner(
  stats: NeighborhoodStats[],
  key: keyof NeighborhoodStats,
  lower: boolean // true = lower is better
): string | null {
  if (stats.length < 2) return null;
  let best: NeighborhoodStats | null = null;
  for (const s of stats) {
    const val = s[key];
    if (val === null || val === undefined) continue;
    if (!best) {
      best = s;
      continue;
    }
    const bestVal = best[key] as number;
    const curVal = val as number;
    if (lower ? curVal < bestVal : curVal > bestVal) best = s;
  }
  return best?.neighborhood.name ?? null;
}

function linesWinner(stats: NeighborhoodStats[]): string | null {
  if (stats.length < 2) return null;
  let best: NeighborhoodStats | null = null;
  for (const s of stats) {
    if (!best || s.subwayLines.length > best.subwayLines.length) best = s;
  }
  return best?.neighborhood.name ?? null;
}

/* ---------- component ---------- */

const MAX_SELECTED = 3;

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a12] text-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Transit data
  const [graph, setGraph] = useState<StationGraph | null>(null);
  const [subway, setSubway] = useState<SubwayData | null>(null);
  const [citiBike, setCitiBike] = useState<CitiBikeData | null>(null);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selected, setSelected] = useState<Neighborhood[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Parse URL on mount
  useEffect(() => {
    const param = searchParams.get("n");
    if (param) {
      const slugs = param.split(",").filter(Boolean);
      const hoods = slugs
        .map((s) => findBySlug(s))
        .filter((h): h is Neighborhood => !!h)
        .slice(0, MAX_SELECTED);
      if (hoods.length > 0) setSelected(hoods);
    }
  }, [searchParams]);

  // Sync selection to URL
  const syncUrl = useCallback(
    (hoods: Neighborhood[]) => {
      const slugs = hoods.map((h) => slugify(h.name)).join(",");
      const url = slugs ? `/compare?n=${slugs}` : "/compare";
      router.replace(url, { scroll: false });
    },
    [router]
  );

  // Load transit data
  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes, citi, bus] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
          CitiBikeData.fetch(),
          loadBusData(),
        ]);
        const g: StationGraph = await graphRes.json();
        const m: StationMatrix = await matrixRes.json();
        setGraph(g);
        setSubway(new SubwayData(g, m));
        setCitiBike(citi);
        setBusStops(bus.stops);
      } catch (err) {
        console.error("Failed to load transit data:", err);
        setError("Failed to load transit data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute stats for selected neighborhoods
  const stats = useMemo(() => {
    if (!subway || !graph || !citiBike) return [];
    return selected.map((h) =>
      computeStats(h, subway, graph, citiBike, busStops)
    );
  }, [selected, subway, graph, citiBike, busStops]);

  // Winners
  const winners = useMemo(() => {
    if (stats.length < 2) return { commute: null, lines: null, bike: null, bus: null, walk: null };
    return {
      commute: pickWinner(stats, "avgCommute", true),
      lines: linesWinner(stats),
      bike: pickWinner(stats, "bikeDocks", false),
      bus: pickWinner(stats, "busStops", false),
      walk: pickWinner(stats, "nearestSubwayWalk", true),
    };
  }, [stats]);

  // Remaining neighborhoods for dropdown
  const remaining = useMemo(() => {
    const names = new Set(selected.map((h) => h.name));
    return NYC_NEIGHBORHOODS.filter((h) => !names.has(h.name));
  }, [selected]);

  const filtered = useMemo(() => {
    if (!search) return remaining;
    const q = search.toLowerCase();
    return remaining.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.borough.toLowerCase().includes(q)
    );
  }, [remaining, search]);

  function addNeighborhood(hood: Neighborhood) {
    const next = [...selected, hood].slice(0, MAX_SELECTED);
    setSelected(next);
    syncUrl(next);
    setDropdownOpen(false);
    setSearch("");
  }

  function removeNeighborhood(name: string) {
    const next = selected.filter((h) => h.name !== name);
    setSelected(next);
    syncUrl(next);
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <Link
          href="/rankings"
          className="inline-flex items-center gap-1.5 text-sm font-body text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          &larr; Back to Rankings
        </Link>

        <h1 className="text-4xl md:text-5xl font-display italic uppercase text-white mb-2">
          Compare
          <br />
          <span className="text-accent">Neighborhoods</span>
        </h1>
        <p className="font-body text-sm text-white/40 mb-8">
          Pick 2-3 neighborhoods to compare side by side.
        </p>

        {/* Chips + Add */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {selected.map((h) => (
            <button
              key={h.name}
              onClick={() => removeNeighborhood(h.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-accent text-sm font-body hover:bg-accent/20 transition-colors"
            >
              {h.name}
              <span className="text-accent/60 hover:text-accent">&times;</span>
            </button>
          ))}

          {selected.length < MAX_SELECTED && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 text-white/50 text-sm font-body hover:border-white/20 hover:text-white/70 transition-colors"
              >
                + Add
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1b24] shadow-xl z-50">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-body text-white placeholder:text-white/30 focus:outline-none focus:border-accent/40"
                      autoFocus
                    />
                  </div>
                  {filtered.map((h) => (
                    <button
                      key={h.name}
                      onClick={() => addNeighborhood(h)}
                      className="w-full text-left px-4 py-2.5 text-sm font-body text-white/70 hover:bg-white/5 hover:text-white transition-colors flex items-baseline justify-between"
                    >
                      <span>{h.name}</span>
                      <span className="text-xs text-white/30">
                        {h.borough}
                      </span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-4 py-3 text-sm text-white/30 font-body">
                      No matches
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close dropdown on outside click */}
        {dropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setDropdownOpen(false);
              setSearch("");
            }}
          />
        )}

        {/* Loading / Error */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="font-body text-sm text-red-400">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="font-body text-sm text-white/50">
              Loading transit data&hellip;
            </p>
          </div>
        ) : selected.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="font-body text-sm text-white/30">
              Select neighborhoods above to start comparing.
            </p>
          </div>
        ) : (
          /* Comparison cards */
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(selected.length, 3)}, minmax(0, 1fr))`,
            }}
          >
            {stats.map((s) => {
              const isCommuteWinner =
                winners.commute === s.neighborhood.name;
              const isLinesWinner =
                winners.lines === s.neighborhood.name;
              const isBikeWinner =
                winners.bike === s.neighborhood.name;
              const isBusWinner =
                winners.bus === s.neighborhood.name;
              const isWalkWinner =
                winners.walk === s.neighborhood.name;

              // Commute bar width (relative to 40 min max)
              const commuteBar = s.avgCommute
                ? Math.max(4, Math.min(100, ((40 - s.avgCommute) / 40) * 100))
                : 0;

              return (
                <div
                  key={s.neighborhood.name}
                  className="border border-white/10 rounded-xl bg-surface-card p-5 flex flex-col gap-5"
                >
                  {/* Name + borough */}
                  <div>
                    <h2 className="font-display italic uppercase text-lg text-white">
                      {s.neighborhood.name}
                    </h2>
                    <p className="font-body text-xs text-white/30">
                      {s.neighborhood.borough}
                    </p>
                  </div>

                  {/* Avg Subway Commute */}
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-widest text-white/40 mb-1">
                      Avg Subway Commute
                    </p>
                    <p
                      className={`font-body text-2xl tabular-nums ${
                        isCommuteWinner ? "text-accent" : "text-white"
                      }`}
                    >
                      {s.avgCommute !== null
                        ? `${s.avgCommute.toFixed(1)} min`
                        : "N/A"}
                    </p>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCommuteWinner ? "bg-accent" : "bg-white/20"
                        }`}
                        style={{ width: `${commuteBar}%` }}
                      />
                    </div>
                    {isCommuteWinner && (
                      <span className="text-accent text-xs font-body mt-1 inline-block">
                        &#9733; Best
                      </span>
                    )}
                  </div>

                  {/* Subway lines */}
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-widest text-white/40 mb-1">
                      Subway
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {s.subwayLines.length > 0 ? (
                        s.subwayLines.map((line) => (
                          <span
                            key={line}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                              isLinesWinner
                                ? "bg-accent/20 text-accent"
                                : "bg-white/10 text-white/60"
                            }`}
                          >
                            {line}
                          </span>
                        ))
                      ) : (
                        <span className="text-white/30 text-sm font-body">
                          None nearby
                        </span>
                      )}
                    </div>
                    <p
                      className={`font-body text-sm ${
                        isWalkWinner ? "text-accent" : "text-white/50"
                      }`}
                    >
                      {s.nearestSubwayWalk !== null
                        ? `${s.nearestSubwayWalk.toFixed(0)} min walk`
                        : "N/A"}
                      {isWalkWinner && " \u2605"}
                    </p>
                  </div>

                  {/* Citi Bike */}
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-widest text-white/40 mb-1">
                      Citi Bike
                    </p>
                    <p
                      className={`font-body text-sm ${
                        isBikeWinner ? "text-accent" : "text-white/50"
                      }`}
                    >
                      {s.bikeDocks} docks nearby
                      {isBikeWinner && " \u2605"}
                    </p>
                  </div>

                  {/* Bus */}
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-widest text-white/40 mb-1">
                      Bus
                    </p>
                    <p
                      className={`font-body text-sm ${
                        isBusWinner ? "text-accent" : "text-white/50"
                      }`}
                    >
                      {s.busStops} stops nearby
                      {isBusWinner && " \u2605"}
                    </p>
                  </div>

                  {/* Explore link */}
                  <Link
                    href={`/explore?lat=${s.neighborhood.center.lat}&lng=${s.neighborhood.center.lng}&t=30&m=subway,walk,bike,bus,ferry`}
                    className="mt-auto font-body text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    Explore &rarr;
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
