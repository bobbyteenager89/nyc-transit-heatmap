import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import RankingsList, { type RankedEntry } from "./rankings-list";

export const revalidate = 3600;

export const metadata = {
  title: "Neighborhood Rankings — Isochrone NYC",
  description:
    "Which NYC neighborhoods have the best transit access? Ranked by average subway travel time to 5 major hubs.",
};

function loadRankings(): RankedEntry[] {
  const filePath = join(process.cwd(), "public", "data", "rankings.json");
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as RankedEntry[];
}

export default function RankingsPage() {
  const rankings = loadRankings();

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
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
          Neighborhood
          <br />
          <span className="text-accent">Rankings</span>
        </h1>
        <p className="font-body text-sm text-white/40 mb-6">
          Which NYC neighborhoods have the best transit access? Ranked by
          average subway travel time to 5 major hubs.
        </p>

        <RankingsList rankings={rankings} />
      </div>
    </div>
  );
}
