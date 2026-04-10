import { readFile } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { RankingsList } from "@/components/rankings/rankings-list";
import type { RankedEntry } from "@/components/rankings/rankings-list";

async function getRankings(): Promise<RankedEntry[]> {
  const filePath = join(process.cwd(), "public", "data", "rankings.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export default async function RankingsPage() {
  const rankings = await getRankings();

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
          Neighborhood<br />
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
