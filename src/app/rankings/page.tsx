"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SubwayData, computeSubwayTime } from "@/lib/subway";
import { NYC_NEIGHBORHOODS, LANDMARKS } from "@/lib/neighborhoods";
import type { Neighborhood } from "@/lib/neighborhoods";
import type { StationGraph, StationMatrix } from "@/lib/types";

interface RankedNeighborhood {
  neighborhood: Neighborhood;
  avgMinutes: number;
}

function scoreNeighborhoods(subway: SubwayData): RankedNeighborhood[] {
  return NYC_NEIGHBORHOODS.map((hood) => {
    const times = LANDMARKS.map((lm) =>
      computeSubwayTime(subway, hood.center, { lat: lm.lat, lng: lm.lng })
    ).filter((t): t is number => t !== null);

    const avgMinutes =
      times.length > 0
        ? times.reduce((sum, t) => sum + t, 0) / times.length
        : Infinity;

    return { neighborhood: hood, avgMinutes };
  })
    .filter((r) => r.avgMinutes < Infinity)
    .sort((a, b) => a.avgMinutes - b.avgMinutes);
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankedNeighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [graphRes, matrixRes] = await Promise.all([
          fetch("/data/station-graph.json"),
          fetch("/data/station-matrix.json"),
        ]);
        const graph: StationGraph = await graphRes.json();
        const matrix: StationMatrix = await matrixRes.json();
        const subway = new SubwayData(graph, matrix);
        const ranked = scoreNeighborhoods(subway);
        setRankings(ranked);
      } catch (err) {
        console.error("Failed to load transit data:", err);
        setError("Failed to load transit data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const bestTime = rankings.length > 0 ? rankings[0].avgMinutes : 1;
  const worstTime = rankings.length > 0 ? rankings[rankings.length - 1].avgMinutes : 1;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-body text-white/40 hover:text-white/70 transition-colors"
          >
            &larr; Back to Isochrone NYC
          </Link>
          <Link
            href="/compare"
            className="text-sm font-body text-accent hover:text-accent/80 transition-colors"
          >
            Compare neighborhoods &rarr;
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-display italic uppercase text-white mb-2">
          Neighborhood<br />
          <span className="text-accent">Rankings</span>
        </h1>
        <p className="font-body text-sm text-white/40 mb-10">
          Which NYC neighborhoods have the best transit access? Ranked by
          average subway travel time to 5 major hubs.
        </p>

        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="font-body text-sm text-red">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="font-body text-sm text-white/50">
              Ranking neighborhoods&hellip;
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rankings.map((r, i) => {
              const barWidth =
                worstTime === bestTime
                  ? 100
                  : 100 -
                    ((r.avgMinutes - bestTime) / (worstTime - bestTime)) * 100;

              return (
                <Link
                  key={r.neighborhood.name}
                  href={`/explore?lat=${r.neighborhood.center.lat}&lng=${r.neighborhood.center.lng}&t=30&m=subway,bus,walk,bike,ferry`}
                  className="border border-white/10 rounded-xl bg-surface-card p-5 flex items-start gap-4 group hover:border-white/20 hover:bg-white/[0.04] transition-all"
                >
                  <span className="text-2xl font-display italic text-white/20 w-8 shrink-0 text-right leading-none pt-0.5">
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <h2 className="font-display italic uppercase text-lg text-white group-hover:text-accent transition-colors truncate">
                        {r.neighborhood.name}
                      </h2>
                      <span className="font-body text-sm text-white/70 tabular-nums shrink-0">
                        {r.avgMinutes.toFixed(1)} min
                      </span>
                    </div>

                    <p className="font-body text-xs text-white/30 mb-2">
                      {r.neighborhood.borough}
                    </p>

                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${Math.max(barWidth, 4)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
